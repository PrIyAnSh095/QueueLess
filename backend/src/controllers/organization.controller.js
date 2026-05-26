import ServiceProvider from "../models/ServiceProvider.model.js";
import Service from "../models/Service.model.js";
import User from "../models/user.model.js";
import Counter from "../models/Counter.model.js";
import Ticket from "../models/ticket.model.js";
import Queue from "../models/queue.model.js";

import bcrypt from "bcryptjs";
import { uploadToCloudinary } from "../services/cloudinary.service.js";
import QueueHistory from "../models/QueueHistory.model.js";
import { sendOrgAvgTimeUpdateRequest } from "../services/email.service.js";

export const resolveOrgId = async (user) => {
  if (user.organizationId) {
    return user.organizationId;
  }
  const org = await ServiceProvider.findOne({ user: user._id }).select("_id");
  return org?._id;
};

export const getMyOrgProfile = async (req, res) => {
  try {
    const orgId = await resolveOrgId(req.user);
    if (!orgId) return res.status(404).json({ success: false, message: "Organization profile not found" });

    const org = await ServiceProvider.findById(orgId)
      .populate("user", "name email phone");
    if (!org) return res.status(404).json({ success: false, message: "Organization profile not found" });
    return res.json({ success: true, data: org });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const updateMyOrgProfile = async (req, res) => {
  try {
    const { businessName, phone, address, ownerName, alternateEmail, contactNumber, description, location, photoProof } = req.body;
    let { images } = req.body;

    // Robust parsing for images if passed as a JSON string (Multipart/Form-Data common case)
    if (typeof images === "string") {
      try {
        images = JSON.parse(images);
      } catch (parseErr) {
        console.warn("⚠️ Failed to parse images as JSON, treating as literal string (will likely fail validation)");
      }
    }
    const orgId = await resolveOrgId(req.user);
    const org = orgId ? await ServiceProvider.findById(orgId) : null;
    if (!org) return res.status(404).json({ success: false, message: "Organization not found" });

    // Check if address is being changed
    if (address && address !== org.address) {
      if (!photoProof) {
        return res.status(400).json({ success: false, message: "Photo proof is required when changing address" });
      }
      // Create pending edit for address change
      org.pendingEdit = {
        address,
        location,
        photoProof,
        updatedAt: new Date()
      };
      await org.save();
      return res.json({ success: true, data: org, message: "Address change request submitted for approval" });
    }

    // Normal updates
    if (businessName) org.businessName = businessName;
    if (phone) org.phone = phone;
    if (address) org.address = address;
    if (ownerName) org.ownerName = ownerName;
    if (alternateEmail) org.alternateEmail = alternateEmail;
    if (contactNumber) org.contactNumber = contactNumber;
    if (description) org.description = description;
    if (location) org.location = location;
    if (Array.isArray(images)) org.images = images;

    await org.save();
    return res.json({ success: true, data: org });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const uploadVerificationDoc = async (req, res) => {
  try {
    console.log("=== UPLOAD START ===");

    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const result = await uploadToCloudinary(req.file.buffer);

    console.log("✅ Upload success:", result);
    return res.status(200).json({
      success: true,
      message: "Upload successful",
      data: result
    });

  } catch (err) {
    console.error("🔥 UPLOAD FAILED:", err);

    return res.status(500).json({
      message: "File upload failed",
      error: err.message
    });
  }
};

export const uploadFile = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const result = await uploadToCloudinary(req.file.buffer, "queueless/uploads");
    return res.status(200).json({
      success: true,
      message: "Upload successful",
      data: result
    });
  } catch (err) {
    return res.status(500).json({
      message: "File upload failed",
      error: err.message
    });
  }
};

export const uploadOrgImages = async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ success: false, message: "No files uploaded" });
    }
    const org = await ServiceProvider.findOne({ user: req.user._id });
    if (!org) return res.status(404).json({ success: false, message: "Organization not found" });

    const results = [];
    for (const file of req.files) {
      const result = await uploadToCloudinary(file.buffer, "queueless/org-images");
      results.push(result);
    }

    org.images = [...(org.images || []), ...results];
    await org.save();
    return res.json({ success: true, images: org.images });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const getOrgServices = async (req, res) => {
  try {
    const orgId = await resolveOrgId(req.user);
    if (!orgId) return res.status(404).json({ success: false, message: "Organization not found" });

    const services = await Service.find({ organizationId: orgId }).sort({ createdAt: -1 });

    const enriched = await Promise.all(services.map(async (s) => {
      const [total, waiting, served] = await Promise.all([
        Ticket.countDocuments({ service: s._id }),
        Ticket.countDocuments({ service: s._id, status: "waiting" }),
        Ticket.countDocuments({ service: s._id, status: "served" })
      ]);
      return { ...s.toObject(), stats: { total, waiting, served } };
    }));

    return res.json({ success: true, data: enriched });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const getOrgStats = async (req, res) => {
  try {
    const org = await ServiceProvider.findOne({ user: req.user._id });
    if (!org) return res.status(404).json({ success: false, message: "Organization not found" });

    const services = await Service.find({ organizationId: org._id });
    const serviceIds = services.map(s => s._id);

    const [totalBookings, activeBookings, completedBookings, totalCounters, queues] = await Promise.all([
      Ticket.countDocuments({ service: { $in: serviceIds } }),
      Ticket.countDocuments({ service: { $in: serviceIds }, status: "waiting" }),
      Ticket.countDocuments({ service: { $in: serviceIds }, status: "served" }),
      Counter.countDocuments({ organization: org._id }),
      Queue.find({ serviceId: { $in: serviceIds } }).select("avgServiceTime")
    ]);

    // Compute average configured service time across all queues
    const configuredAvgServiceTime = queues.length > 0
      ? Math.round(queues.reduce((sum, q) => sum + (q.avgServiceTime || 15), 0) / queues.length)
      : 15;

    return res.json({
      success: true,
      data: {
        totalServices: services.length,
        activeServices: services.filter(s => s.status && s.approvalStatus === "approved").length,
        totalBookings,
        activeBookings,
        completedBookings,
        totalCounters,
        configuredAvgServiceTime
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const getOrgQueueUsers = async (req, res) => {
  try {
    const org = await ServiceProvider.findOne({ user: req.user._id });
    if (!org) return res.status(404).json({ success: false, message: "Organization not found" });

    const services = await Service.find({ organizationId: org._id }).select("_id serviceName");
    const serviceIds = services.map(s => s._id);

    const tickets = await Ticket.find({ service: { $in: serviceIds }, status: "waiting" })
      .sort({ tokenNumber: 1 })
      .populate("user", "name email phone")
      .populate("service", "serviceName")
      .populate("queue", "queueName");

    return res.json({ success: true, data: tickets });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const getOrgQueues = async (req, res) => {
  try {
    const orgId = await resolveOrgId(req.user);
    if (!orgId) return res.status(404).json({ success: false, message: "Organization not found" });

    const services = await Service.find({ organizationId: orgId });
    const serviceIds = services.map(s => s._id);

    // Fetch all queues for these services
    const queues = await Queue.find({ serviceId: { $in: serviceIds } })
      .populate("serviceId", "serviceName")
      .lean();

    // Map through queues and attach waiting users
    const enrichedQueues = await Promise.all(queues.map(async (q) => {
      const waitingUsers = await Ticket.find({ queue: q._id, status: "waiting" })
        .sort({ tokenNumber: 1 })
        .populate("user", "name email phone")
        .select("tokenNumber user");
      return { ...q, waitingUsers };
    }));

    return res.json({ success: true, data: enrichedQueues });
  } catch (err) {
    console.error("Error in getOrgQueues:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const getOrgCounters = async (req, res) => {
  try {
    const orgId = await resolveOrgId(req.user);
    if (!orgId) return res.status(404).json({ success: false, message: "Organization context not found" });

    const counters = await Counter.find({ organization: orgId })
      .populate("service", "serviceName")
      .populate("currentTicket");
    return res.json({ success: true, data: counters });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const createOrgCounter = async (req, res) => {
  try {
    const org = await ServiceProvider.findOne({ user: req.user._id });
    if (!org) return res.status(404).json({ success: false, message: "Organization not found" });

    const { name, service, userId } = req.body;
    if (!name) return res.status(400).json({ success: false, message: "Counter name is required" });
    if (!userId) return res.status(400).json({ success: false, message: "Staff user is required" });

    const counter = await Counter.create({ name, service, organization: org._id, user: userId });
    return res.status(201).json({ success: true, data: counter });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const createStaffAccount = async (req, res) => {
  try {
    const org = await ServiceProvider.findOne({ user: req.user._id });
    if (!org || org.status !== "approved") {
      return res.status(403).json({ success: false, message: "Only approved organizations can create staff" });
    }

    const { name, email, password, phone, role } = req.body;
    if (!["counter", "reception"].includes(role)) {
      return res.status(400).json({ success: false, message: "Invalid staff role" });
    }

    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ success: false, message: "Email already in use" });

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      phone,
      role,
      organizationId: org._id
    });

    return res.status(201).json({ success: true, data: user });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const getOrgStaff = async (req, res) => {
  try {
    const org = await ServiceProvider.findOne({ user: req.user._id });
    if (!org) return res.status(404).json({ success: false, message: "Organization not found" });

    const staff = await User.find({ organizationId: org._id }).select("-password");
    return res.json({ success: true, data: staff });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const updateQueueStatus = async (req, res) => {
  try {
    const { queueId } = req.params;
    const { status } = req.body;
    if (!["active", "overload", "ended"].includes(status)) {
      return res.status(400).json({ success: false, message: "Invalid status" });
    }

    const orgId = await resolveOrgId(req.user);
    if (!orgId) return res.status(404).json({ success: false, message: "Organization context not found" });

    const queue = await Queue.findById(queueId).populate("serviceId", "organizationId serviceName");
    if (!queue) return res.status(404).json({ success: false, message: "Queue not found" });

    const queueOrgId = queue.serviceId?.organizationId?.toString();
    if (queueOrgId !== orgId.toString()) {
      return res.status(403).json({ success: false, message: "Not authorized to manage this queue" });
    }

    queue.status = status;
    queue.isActive = status !== "ended";

    if (status === "ended") {
      queue.isOnBreak = false;
    }

    await queue.save();

    // WebSocket Update
    import("../server.js").then(({ io }) => {
      io.emit("queue_update", {
        queueId,
        type: "status_change",
        status,
        isActive: queue.isActive,
        isOnBreak: queue.isOnBreak
      });
    });

    return res.json({ success: true, data: queue });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const completeCurrentToken = async (req, res) => {
  try {
    const { counterId } = req.params;
    const counter = await Counter.findById(counterId).populate("service");
    if (!counter) return res.status(404).json({ success: false, message: "Counter not found" });

    if (!counter.currentTicket) {
      return res.status(400).json({ success: false, message: "No active ticket to complete" });
    }

    const ticket = await Ticket.findById(counter.currentTicket);
    if (ticket && ticket.status === "processing") {
      const servedAt = new Date();
      const actualWaitDuration = Math.round((servedAt - ticket.createdAt) / 60000);
      ticket.status = "served";
      ticket.servedAt = servedAt;
      ticket.actualWaitDuration = actualWaitDuration;
      await ticket.save();

      // Update history record
      await QueueHistory.findOneAndUpdate(
        { ticket: ticket._id },
        { servedTime: servedAt, actualWaitDuration, counterServeStatus: "served", status: "served" }
      );

      // Update queue currentServingNumber
      await Queue.findOneAndUpdate(
        { serviceId: counter.service._id },
        { currentServingNumber: ticket.tokenNumber }
      );
    }

    counter.currentTicket = null;
    await counter.save();

    // WebSocket Update for UI
    import("../server.js").then(({ io }) => {
      io.emit("queue_update", { type: "complete", counterId });
    });

    return res.json({ success: true, message: "Ticket marked as completed" });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const serveNextByCounter = async (req, res) => {
  try {
    const { counterId } = req.params;
    const counter = await Counter.findById(counterId).populate("service");
    if (!counter) return res.status(404).json({ success: false, message: "Counter not found" });

    // Mark current ticket as served if exists (Auto-complete previous if they forgot)
    if (counter.currentTicket) {
      const oldTicket = await Ticket.findById(counter.currentTicket);
      if (oldTicket && oldTicket.status === "processing") {
        const servedAt = new Date();
        oldTicket.status = "served";
        oldTicket.servedAt = servedAt;
        await oldTicket.save();
        await QueueHistory.findOneAndUpdate({ ticket: oldTicket._id }, { servedTime: servedAt, status: "served" });
      }
    }

    // Get next ticket
    const nextTicket = await Ticket.findOneAndUpdate(
      { service: counter.service._id, status: "waiting" },
      { status: "processing" },
      { sort: { tokenNumber: 1 }, new: true }
    );

    if (!nextTicket) {
      counter.currentTicket = null;
      await counter.save();
      return res.json({ success: true, message: "No more tickets in queue", data: null });
    }

    counter.currentTicket = nextTicket._id;
    await counter.save();

    // WebSocket Update
    import("../server.js").then(({ io }) => {
      io.emit("queue_update", { type: "serve", counterId, ticketId: nextTicket._id });
    });

    return res.json({ success: true, data: nextTicket });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

/** Org accepts or rejects the suggested avgServiceTime from dispute system */
export const acceptAvgTimeUpdate = async (req, res) => {
  try {
    const org = await ServiceProvider.findOne({ user: req.user._id });
    if (!org) return res.status(404).json({ success: false, message: "Organization not found" });
    if (!org.avgTimeSuggestionPending) {
      return res.status(400).json({ success: false, message: "No pending suggestion" });
    }

    const { accept } = req.body;
    if (accept) {
      // Apply the new avg to all queues of this org's services
      const services = await Service.find({ organizationId: org._id });
      const serviceIds = services.map(s => s._id);
      await Queue.updateMany({ serviceId: { $in: serviceIds } }, { avgServiceTime: org.suggestedAvgServiceTime });
    }

    org.avgTimeSuggestionPending = false;
    org.suggestedAvgServiceTime = undefined;
    await org.save();

    return res.json({
      success: true,
      message: accept ? "Average service time updated across all queues." : "Suggestion rejected."
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const deleteOrgCounter = async (req, res) => {
  try {
    const org = await ServiceProvider.findOne({ user: req.user._id });
    if (!org) return res.status(404).json({ success: false, message: "Organization not found" });

    await Counter.findOneAndDelete({ _id: req.params.id, organization: org._id });
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const getOrgHistory = async (req, res) => {
  try {
    const org = await ServiceProvider.findOne({ user: req.user._id });
    if (!org) return res.status(404).json({ success: false, message: "Organization not found" });

    const { range } = req.query; // 'today', 'yesterday', 'all'
    let query = { organization: org._id };

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    if (range === "today") {
      query.createdAt = { $gte: todayStart };
    } else if (range === "yesterday") {
      const yesterdayStart = new Date(todayStart);
      yesterdayStart.setDate(yesterdayStart.getDate() - 1);
      query.createdAt = { $gte: yesterdayStart, $lt: todayStart };
    }

    const history = await QueueHistory.find(query)
      .sort({ createdAt: -1 })
      .populate("user", "name email")
      .populate("service", "serviceName");

    // Statistics for the range
    const served = history.filter(h => h.status === "served");
    const totalWait = served.reduce((sum, h) => sum + (h.actualWaitDuration || 0), 0);
    const avgWaitTime = served.length > 0 ? Math.round(totalWait / served.length) : 0;

    return res.json({
      success: true,
      data: {
        history,
        stats: {
          usersServed: served.length,
          avgWaitTime
        }
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const getPublicOrganization = async (req, res) => {
  try {
    const org = await ServiceProvider.findOne({ _id: req.params.id, status: "approved" })
      .populate("user", "name email");
    if (!org) return res.status(404).json({ success: false, message: "Organization not found" });

    const services = await Service.find({ organizationId: org._id, approvalStatus: "approved", status: true });
    return res.json({ success: true, data: { organization: org, services } });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const getPublicOrganizations = async (req, res) => {
  try {
    const { search } = req.query;
    const query = { status: "approved" };
    if (search) {
      query.businessName = { $regex: search, $options: "i" };
    }
    const orgs = await ServiceProvider.find(query)
      .sort({ createdAt: -1 })
      .populate("user", "name email");
    return res.json({ success: true, data: orgs });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const getOrgCharts = async (req, res) => {
  try {
    const org = await ServiceProvider.findOne({ user: req.user._id });
    if (!org) return res.status(404).json({ success: false, message: "Organization not found" });

    const services = await Service.find({ organizationId: org._id }).select("_id serviceName");
    const serviceIds = services.map(s => s._id);

    // 1. Daily bookings for last 14 days
    const since14 = new Date();
    since14.setDate(since14.getDate() - 13);
    since14.setHours(0, 0, 0, 0);

    const dailyRaw = await Ticket.aggregate([
      { $match: { service: { $in: serviceIds }, createdAt: { $gte: since14 } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          total: { $sum: 1 },
          served: { $sum: { $cond: [{ $eq: ["$status", "served"] }, 1, 0] } },
          cancelled: { $sum: { $cond: [{ $eq: ["$status", "cancelled"] }, 1, 0] } }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    const dailyMap = {};
    dailyRaw.forEach(d => { dailyMap[d._id] = d; });
    const dailyData = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      const label = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      dailyData.push({
        date: key,
        label,
        total: dailyMap[key]?.total || 0,
        served: dailyMap[key]?.served || 0,
        cancelled: dailyMap[key]?.cancelled || 0
      });
    }

    // 2. Per-service breakdown
    const serviceBreakdown = await Ticket.aggregate([
      { $match: { service: { $in: serviceIds } } },
      {
        $group: {
          _id: "$service",
          total: { $sum: 1 },
          waiting: { $sum: { $cond: [{ $in: ["$status", ["waiting", "processing"]] }, 1, 0] } },
          served: { $sum: { $cond: [{ $eq: ["$status", "served"] }, 1, 0] } },
          cancelled: { $sum: { $cond: [{ $eq: ["$status", "cancelled"] }, 1, 0] } }
        }
      }
    ]);

    const serviceMap = {};
    services.forEach(s => { serviceMap[s._id.toString()] = s.serviceName; });
    const perService = serviceBreakdown.map(s => ({
      serviceId: s._id,
      serviceName: serviceMap[s._id.toString()] || "Unknown",
      total: s.total,
      waiting: s.waiting,
      served: s.served,
      cancelled: s.cancelled
    }));

    // 3. Hourly distribution (last 30 days)
    const since30 = new Date();
    since30.setDate(since30.getDate() - 30);

    const hourlyRaw = await Ticket.aggregate([
      { $match: { service: { $in: serviceIds }, status: "served", createdAt: { $gte: since30 } } },
      { $group: { _id: { $hour: "$createdAt" }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]);

    const hourlyMap = {};
    hourlyRaw.forEach(h => { hourlyMap[h._id] = h.count; });
    const hourlyData = Array.from({ length: 24 }, (_, i) => ({
      hour: i,
      label: `${i.toString().padStart(2, "0")}:00`,
      count: hourlyMap[i] || 0
    }));

    // 4. Avg wait from history
    const historyStats = await QueueHistory.aggregate([
      { $match: { organization: org._id, status: "served", actualWaitDuration: { $exists: true, $gt: 0 } } },
      { $group: { _id: null, avg: { $avg: "$actualWaitDuration" }, total: { $sum: 1 } } }
    ]);
    const avgWaitTime = historyStats.length > 0 ? Math.round(historyStats[0].avg) : 0;
    const totalServed = historyStats.length > 0 ? historyStats[0].total : 0;

    return res.json({
      success: true,
      data: { dailyData, perService, hourlyData, summary: { avgWaitTime, totalServed } }
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

