import Ticket from "../models/ticket.model.js";
import Service from "../models/Service.model.js";
import Queue from "../models/queue.model.js";
import QueueHistory from "../models/QueueHistory.model.js";
import ServiceProvider from "../models/ServiceProvider.model.js";
import User from "../models/user.model.js";
import mongoose from "mongoose";
import { getIO } from "../socket.js";
import * as travelService from "./travel.service.js";
import { extractCoords, getOrgCoordsFromService } from "./coords.util.js";

export const joinQueue = async ({ queueId, userId, userLocation }) => {
  if (!mongoose.Types.ObjectId.isValid(queueId)) throw new Error("Invalid queueId");

  const queue = await Queue.findById(queueId).populate("serviceId");
  if (!queue) throw new Error("Queue not found");
  if (!queue.isActive) throw new Error("Queue is currently inactive");
  if (queue.isOnBreak) throw new Error("Queue is currently on break. Please try again later.");

  const service = queue.serviceId;
  if (!service || !service.status || service.approvalStatus !== "approved") {
    throw new Error("Service is currently unavailable");
  }

  const existing = await Ticket.findOne({ user: userId, status: { $in: ["waiting", "processing"] } });
  if (existing) throw new Error("You already have an active ticket in a queue");

  const lastTicket = await Ticket.findOne({ queue: queueId }).sort({ tokenNumber: -1 });
  const tokenNumber = lastTicket ? lastTicket.tokenNumber + 1 : 1;

  // Build userLocation coords
  let locationPayload = { type: "Point", coordinates: [0, 0] };
  if (userLocation?.lng != null && userLocation?.lat != null) {
    locationPayload = { type: "Point", coordinates: [userLocation.lng, userLocation.lat] };
    
    // Sync to User profile as "last known"
    try {
      await User.findByIdAndUpdate(userId, {
        location: locationPayload
      });
      console.log(`[ticket.service] User ${userId} location synced to profile on join`);
    } catch (err) {
      console.error("[ticket.service] Failed to sync location to user profile:", err.message);
    }
  }

  const ticket = await Ticket.create({
    service: service._id,
    queue: queue._id,
    user: userId,
    tokenNumber,
    status: "waiting",
    userLocation: locationPayload
  });

  // Count people already waiting to predict ETA at join time
  const aheadAtJoin = await Ticket.countDocuments({
    queue: queue._id,
    status: "waiting",
    tokenNumber: { $lt: tokenNumber }
  });
  const predictedWaitDuration = aheadAtJoin * (queue.avgServiceTime || 15);
  const expectedServeTime = new Date(Date.now() + predictedWaitDuration * 60000);

  // Create history record at join time
  await QueueHistory.create({
    user: userId,
    service: service._id,
    organization: service.organizationId,
    ticket: ticket._id,
    tokenNumber,
    joinTime: new Date(),
    predictedWaitDuration,
    expectedServeTime,
    userServeStatus: "pending",
    counterServeStatus: "pending",
    status: "served" // default; updated on actual outcome
  });

  // Emit real-time update
  const io = getIO();
  if (io) {
    io.to(`queue_${queueId}`).emit("queue_update", { type: "join", ticket });
    io.emit("admin_stats_update");
  }

  return ticket;
};

export const leaveQueue = async ({ ticketId, userId }) => {
  const ticket = await Ticket.findById(ticketId);
  if (!ticket) throw new Error("Ticket not found");
  if (ticket.user.toString() !== userId.toString()) throw new Error("Not authorized");
  if (ticket.status !== "waiting") throw new Error("Cannot cancel a ticket that is already served, processing, or cancelled");

  ticket.status = "cancelled";
  await ticket.save();

  // Update history record
  await QueueHistory.findOneAndUpdate(
    { ticket: ticketId },
    { cancelledTime: new Date(), status: "cancelled" }
  );

  return ticket;
};

export const getQueuePosition = async ({ queueId, userId }) => {
  const queue = await Queue.findById(queueId);
  if (!queue) throw new Error("Queue not found");

  const userTicket = await Ticket.findOne({ queue: queueId, user: userId, status: "waiting" });
  if (!userTicket) return { inQueue: false };

  // Count only tickets with SMALLER token numbers (people truly ahead)
  const aheadCount = await Ticket.countDocuments({
    queue: queueId,
    status: "waiting",
    tokenNumber: { $lt: userTicket.tokenNumber }
  });

  const avgServiceTime = queue.avgServiceTime || 15;
  // etaMinutes = 0 when user is next (aheadCount = 0)
  const etaMinutes = aheadCount * avgServiceTime;

  return {
    inQueue: true,
    ticket: userTicket,
    position: aheadCount + 1,
    aheadCount,
    etaMinutes,
    estimatedWaitTime: etaMinutes,
    tokenNumber: userTicket.tokenNumber
  };
};

export const getLiveETA = async ({ queueId, userId, currentCoords = null }) => {
  const pos = await getQueuePosition({ queueId, userId });
  if (!pos.inQueue) return { inQueue: false };

  const ticket = await Ticket.findOne({ queue: queueId, user: userId, status: "waiting" })
    .populate({ path: "service", populate: { path: "organizationId", select: "location businessName" } })
    .populate("user", "location"); // Get profile location as fallback

  let distanceKm = 0;
  let travelMinutes = 0;
  let leaveInMinutes = 0;
  let shouldLeaveNow = false;
  let displayAddress = null;
  let mapsUrl = null;
  const BUFFER_MINUTES = 5;

  // 1. Unified Coordinate Extraction Logic
  // Priority: 1. Current (Passed from UI) > 2. Ticket (Join Time) > 3. User Profile (Last Known)
  let userCoords = null;
  let sourceLabel = "";

  if (currentCoords && currentCoords.lat && currentCoords.lng) {
    userCoords = { lat: Number(currentCoords.lat), lng: Number(currentCoords.lng) };
    sourceLabel = "Live_UI";
  } else {
    userCoords = extractCoords(ticket.userLocation);
    if (userCoords) {
      sourceLabel = "Ticket_Join";
    } else {
      userCoords = extractCoords(ticket.user?.location);
      if (userCoords) sourceLabel = "User_Profile";
    }
  }

  const orgCoords = getOrgCoordsFromService(ticket.service);

  if (userCoords && orgCoords) {
    try {
      console.log(`[ticket.service] getLiveETA [Source:${sourceLabel}]: User(${userCoords.lat}, ${userCoords.lng}) → Org(${orgCoords.lat}, ${orgCoords.lng})`);

      const travel = await travelService.getTravelInfo(
        userCoords.lat, userCoords.lng,
        orgCoords.lat, orgCoords.lng
      );
      distanceKm = travel.distanceKm;
      travelMinutes = travel.travelMinutes;
      displayAddress = travel.displayAddress;
      mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${orgCoords.lat},${orgCoords.lng}`;

      // Leave Time Logic
      if (travelMinutes >= pos.etaMinutes) {
        shouldLeaveNow = true;
        leaveInMinutes = 0;
      } else {
        leaveInMinutes = pos.etaMinutes - travelMinutes - BUFFER_MINUTES;
        if (leaveInMinutes <= 0) {
          shouldLeaveNow = true;
          leaveInMinutes = 0;
        }
      }

      console.log(`[ticket.service] getLiveETA result: ${distanceKm}km, ${travelMinutes}min, leave in ${leaveInMinutes}min`);
    } catch (err) {
      console.error("[ticket.service] ORS error in getLiveETA:", err.message);
    }
  } else {
    if (!userCoords) console.log(`[ticket.service] getLiveETA: ❌ User location MISSING everywhere for ticket in queue ${queueId}`);
    if (!orgCoords) console.log(`[ticket.service] getLiveETA: ❌ Org location MISSING for service ${ticket.service?._id}`);
  }

  return {
    inQueue: true,
    position: pos.position,
    etaMinutes: pos.etaMinutes,
    tokenNumber: pos.tokenNumber,
    distanceKm,
    travelMinutes,
    leaveInMinutes,
    shouldLeaveNow,
    displayAddress,
    mapsUrl,
    bufferMinutes: BUFFER_MINUTES,
    locationSource: sourceLabel,
    userLat: userCoords?.lat,
    userLng: userCoords?.lng,
    accuracy: currentCoords?.accuracy || null
  };
};

export const getQueueByService = async (serviceId) => {
  return Ticket.find({ service: serviceId, status: "waiting" })
    .sort({ tokenNumber: 1 })
    .populate("user", "name email phone")
    .populate("queue", "queueName");
};

export const getQueueByQueue = async (queueId) => {
  return Ticket.find({ queue: queueId, status: "waiting" })
    .sort({ tokenNumber: 1 })
    .populate("user", "name email phone");
};

export const serveNext = async ({ queueId, providerId }) => {
  const queue = await Queue.findById(queueId).populate("serviceId");
  if (!queue) throw new Error("Queue not found");

  const service = queue.serviceId;
  const org = await ServiceProvider.findOne({ user: providerId });

  const serviceWithOrg = await service.populate("organizationId");
  const isOwner = serviceWithOrg.organizationId?.user?.toString() === providerId.toString();
  const isCounter = queue.counters.includes(providerId);

  if (!isOwner && !isCounter) {
    const userObj = await mongoose.model("User").findById(providerId);
    if (!["counter", "reception"].includes(userObj?.role)) {
      throw new Error("Not authorized to manage this queue");
    }
  }

  const ticket = await Ticket.findOne({ queue: queueId, status: { $in: ["waiting", "processing"] } }).sort({ tokenNumber: 1 });
  if (!ticket) throw new Error("No tickets waiting in this queue");

  const servedTime = new Date();
  const actualWaitDuration = Math.round((servedTime - ticket.createdAt) / 60000);

  ticket.status = "served";
  ticket.servedAt = servedTime;
  ticket.actualWaitDuration = actualWaitDuration;
  await ticket.save();

  // Update the queue's currentServingNumber
  queue.currentServingNumber = ticket.tokenNumber;
  await queue.save();

  // Update history record — mark counter as served
  await QueueHistory.findOneAndUpdate(
    { ticket: ticket._id },
    {
      servedTime,
      actualWaitDuration,
      counterServeStatus: "served",
      status: "served"
    }
  );

  // Emit real-time update
  const io = getIO();
  if (io) {
    io.to(`queue_${queueId}`).emit("queue_update", { type: "serve", ticket });
    io.emit("admin_stats_update");
  }

  return ticket.populate("user", "name email");
};

export const getUserTickets = async (userId) => {
  return Ticket.find({ user: userId })
    .sort({ createdAt: -1 })
    .populate({
      path: "service",
      select: "serviceName description organizationId",
      populate: { path: "organizationId", select: "businessName location" }
    })
    .populate("queue", "queueName avgServiceTime");
};

export const getServiceStats = async (serviceId) => {
  const [totalBookings, waiting, served, cancelled] = await Promise.all([
    Ticket.countDocuments({ service: serviceId }),
    Ticket.countDocuments({ service: serviceId, status: "waiting" }),
    Ticket.countDocuments({ service: serviceId, status: "served" }),
    Ticket.countDocuments({ service: serviceId, status: "cancelled" })
  ]);

  const historyStats = await QueueHistory.aggregate([
    { $match: { service: new mongoose.Types.ObjectId(serviceId), status: "served", actualWaitDuration: { $exists: true } } },
    { $group: { _id: null, avgWait: { $avg: "$actualWaitDuration" } } }
  ]);
  const avgWaitTime = historyStats.length > 0 ? Math.round(historyStats[0].avgWait) : 0;

  const queues = await Queue.find({ serviceId });

  return { totalBookings, waiting, served, cancelled, avgWaitTime, queuesCount: queues.length };
};

export const reportDelay = async (ticketId, userId) => {
  const ticket = await Ticket.findById(ticketId);
  if (!ticket) throw new Error("Ticket not found");
  if (ticket.user.toString() !== userId.toString()) throw new Error("Not authorized");

  await QueueHistory.findOneAndUpdate(
    { ticket: ticketId },
    { delayReported: true, orgFlagged: true },
    { new: true }
  );

  return { message: "Delay reported. The organization has been flagged for review." };
};

/**
 * User confirms if they were served or not.
 * If counter says served and user says not_served → increment org flag
 * If both say not_served after ETA expired → compute new avg + candidates for org email suggestion
 */
export const confirmServe = async (historyId, userId, servedStatus) => {
  const history = await QueueHistory.findById(historyId)
    .populate({ path: "ticket", populate: { path: "queue", select: "avgServiceTime" } })
    .populate("service", "serviceName organizationId")
    .populate("organization");

  if (!history) throw new Error("History record not found");
  if (history.user.toString() !== userId.toString()) throw new Error("Not authorized");

  history.userServeStatus = servedStatus; // "served" or "not_served"
  await history.save();

  // Dispute: counter marked served but user says not_served
  if (servedStatus === "not_served" && history.counterServeStatus === "served") {
    // Increment org flag count
    await ServiceProvider.findByIdAndUpdate(history.organization._id, { $inc: { flagCount: 1 } });
    history.orgFlagged = true;
    await history.save();
  }

  // Both say not_served after ETA elapsed — compute new avg and notify org
  if (servedStatus === "not_served" && history.counterServeStatus === "pending") {
    const now = new Date();
    const joinTime = history.joinTime;
    const actualMinutes = Math.round((now - joinTime) / 60000);

    // Compute current avg from past history of this service
    const stats = await QueueHistory.aggregate([
      {
        $match: {
          service: history.service._id,
          actualWaitDuration: { $exists: true, $gt: 0 },
          status: "served"
        }
      },
      { $group: { _id: null, avg: { $avg: "$actualWaitDuration" } } }
    ]);

    const currentAvg = stats.length > 0 ? Math.round(stats[0].avg) : history.ticket?.queue?.avgServiceTime || 15;
    history.actualWaitDuration = actualMinutes;
    history.status = "served";
    await history.save();

    // Send suggestion email to org if the difference is significant (>20%)
    const { sendOrgAvgTimeUpdateRequest } = await import("./email.service.js");
    const org = history.organization;
    if (org?.user) {
      const { default: User } = await import("../models/user.model.js");
      const orgUser = await User.findById(org.user).select("email");
      if (orgUser?.email && Math.abs(actualMinutes - currentAvg) / currentAvg > 0.2) {
        await sendOrgAvgTimeUpdateRequest(orgUser.email, {
          orgName: org.businessName || "Your Organization",
          actualAvg: actualMinutes,
          currentAvg
        });
        // Store suggestion on org doc
        await ServiceProvider.findByIdAndUpdate(org._id, {
          suggestedAvgServiceTime: actualMinutes,
          avgTimeSuggestionPending: true
        });
      }
    }
  }

  return { success: true, userServeStatus: servedStatus };
};
