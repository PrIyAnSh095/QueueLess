import Service from "../models/Service.model.js";
import Queue from "../models/queue.model.js";
import mongoose from "mongoose";
import path from "path";
import { uploadToCloudinary } from "../services/cloudinary.service.js";
import {
  getAvailableSlotsForService,
  getBookableDateKeys
} from "../services/slot.service.js";
import { sendServiceStatusEmail } from "../services/email.service.js";
import { createNotification } from "./notification.controller.js";
import { getServiceStats } from "../services/ticket.service.js";


export const createService = async (req, res) => {
  try {
    const {
      serviceName,
      description,
      category,
      status,
      address,
      location: rawLocation,
      queues: rawQueues
    } = req.body;

    // Validate queues
    let queues = [];
    if (rawQueues) {
      try {
        queues = typeof rawQueues === "string" ? JSON.parse(rawQueues) : rawQueues;
      } catch (err) {
        return res.status(400).json({ success: false, message: "Invalid queues format" });
      }
    }

    if (!Array.isArray(queues) || queues.length === 0) {
      return res.status(400).json({ success: false, message: "At least one queue is required" });
    }

    const ServiceProvider = mongoose.model("ServiceProvider");
    const provider = await ServiceProvider.findOne({ user: req.user._id });
    if (!provider) {
      return res.status(404).json({ success: false, message: "Service Provider profile not found" });
    }

    let certificateUrl = "";
    if (req.file) {
      const result = await uploadToCloudinary(req.file.buffer, "service_certificates");
      certificateUrl = result.url;
    }

    let location = { type: 'Point', coordinates: [0, 0] };
    if (rawLocation) {
      const loc = typeof rawLocation === "string" ? JSON.parse(rawLocation) : rawLocation;
      if (loc.lat && loc.lng) {
        location = { type: 'Point', coordinates: [loc.lng, loc.lat] };
      }
    }

    const service = new Service({
      organizationId: provider._id,
      serviceName,
      description,
      category,
      approvalStatus: "pending",
      status: status === "true" || status === true,
      address,
      location,
      certificate: certificateUrl
    });

    await service.save();

    // Create Queues
    const createdQueues = await Promise.all(queues.map(async (q) => {
      const newQueue = new Queue({
        serviceId: service._id,
        queueName: q.queueName,
        capacity: q.capacity || 10,
        activeStatus: q.activeStatus !== undefined ? q.activeStatus : true,
        openTime: q.openTime || "09:00",
        closeTime: q.closeTime || "17:00",
        workingDays: q.workingDays || [1, 2, 3, 4, 5],
        avgServiceTime: q.avgServiceTime || 15,
        slotIntervalMinutes: q.slotIntervalMinutes || 30
      });
      return await newQueue.save();
    }));

    return res.status(201).json({
      success: true,
      message: "Service and queues created successfully",
      data: { service, queues: createdQueues }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

export const listServicesForAdmin = async (req, res) => {
  try {
    const { approvalStatus } = req.query;

    const query = {};
    if (approvalStatus) query.approvalStatus = approvalStatus;

    const services = await Service.find(query)
      .sort({ createdAt: -1 })
      .populate("organizationId", "name email phone role");

    const data = services.map((s) => {
      const certificateUrl = s.certificate || null;

      return {
        _id: s._id,
        serviceName: s.serviceName,
        description: s.description,
        duration: s.duration,
        maxTokens: s.maxTokens,
        status: s.status,
        approvalStatus: s.approvalStatus,
        createdAt: s.createdAt,
        organization: s.organizationId
          ? {
              _id: s.organizationId._id,
              name: s.organizationId.name,
              email: s.organizationId.email,
              phone: s.organizationId.phone,
              role: s.organizationId.role
            }
          : null,
        certificateUrl
      };
    });

    return res.status(200).json({ success: true, data });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const listPublicServices = async (_req, res) => {
  try {
    const services = await Service.find({
      approvalStatus: "approved",
      status: true
    })
      .sort({ createdAt: -1 })
      .limit(12)
      .populate("organizationId", "businessName");

    const data = services.map((s) => {
      const certificateUrl = s.certificate || null;

      return {
        _id: s._id,
        serviceName: s.serviceName,
        description: s.description,
        duration: s.duration,
        maxTokens: s.maxTokens,
        certificateUrl,
        organizationName: s.organizationId?.businessName || "Organization"
      };
    });

    return res.status(200).json({ success: true, data });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const getServiceBookableDates = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid service id" });
    }

    const service = await Service.findOne({
      _id: id,
      approvalStatus: "approved",
      status: true
    });

    if (!service) {
      return res.status(404).json({ success: false, message: "Service not found" });
    }

    const horizon = service.bookingHorizonDays ?? 14;
    const workingDays =
      Array.isArray(service.workingDays) && service.workingDays.length
        ? service.workingDays
        : [1, 2, 3, 4, 5];
    const dates = getBookableDateKeys(horizon, workingDays);

    return res.status(200).json({ success: true, data: { dates } });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const getQueueSlots = async (req, res) => {
  try {
    const { queueId } = req.params;
    const { date } = req.query;

    if (!mongoose.Types.ObjectId.isValid(queueId)) {
      return res.status(400).json({ success: false, message: "Invalid queue id" });
    }
    if (!date || typeof date !== "string") {
      return res
        .status(400)
        .json({ success: false, message: "Query parameter date (YYYY-MM-DD) is required" });
    }

    const data = await getAvailableSlotsForService(queueId, date.trim());
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
};

export const getPublicServiceById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid service id" });
    }
    const service = await Service.findOne({
      _id: id,
      approvalStatus: "approved",
      status: true
    }).populate({
      path: "organizationId",
      select: "businessName phone address location user",
      populate: { path: "user", select: "email" }
    });

    if (!service) {
      return res.status(404).json({ success: false, message: "Service not found" });
    }

    const queues = await Queue.find({ serviceId: id, isActive: true });

    return res.status(200).json({ success: true, data: { ...service.toObject(), queues } });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const updateServiceApprovalStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { approvalStatus } = req.body;

    if (!["approved", "rejected", "pending"].includes(approvalStatus)) {
      return res.status(400).json({ success: false, message: "Invalid approvalStatus" });
    }

    const service = await Service.findById(id).populate("organizationId", "name email phone role");
    if (!service) return res.status(404).json({ success: false, message: "Service not found" });

    if (approvalStatus === "approved") {
      if (service.approvalStatus === "pending_edit" && service.pendingEdit) {
        // Apply pending edits to the main object
        service.serviceName = service.pendingEdit.serviceName || service.serviceName;
        service.description = service.pendingEdit.description || service.description;
        service.address = service.pendingEdit.address || service.address;
        service.location = service.pendingEdit.location || service.location;
        service.photoProof = service.pendingEdit.photoProof || service.photoProof;
        service.pendingEdit = undefined;
      }
      service.approvalStatus = "approved";
    } else {
      // If rejected, clear pendingEdit if it was an edit request
      if (service.approvalStatus === "pending_edit") {
        service.pendingEdit = undefined;
        service.approvalStatus = "approved"; // Revert to previous approved state
      } else {
        service.approvalStatus = approvalStatus;
      }
    }

    await service.save();

    // Trigger Notifications
    const serviceWithUser = await Service.findById(service._id).populate({
      path: "organizationId",
      populate: { path: "user", select: "email name" }
    });

    const email = serviceWithUser?.organizationId?.user?.email;
    const userId = serviceWithUser?.organizationId?.user?._id;

    if (email) {
      sendServiceStatusEmail(email, service.serviceName, approvalStatus);
    }
    if (userId) {
      createNotification(userId, "service-status", `Service ${approvalStatus === 'approved' ? 'Approved' : 'Rejected'}`, `Your service "${service.serviceName}" has been ${approvalStatus}.`);
    }

    return res.status(200).json({ success: true, data: service });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const requestServiceEdit = async (req, res) => {
  try {
    const { id } = req.params;
    const { serviceName, description, category, address, location: rawLocation } = req.body;
    
    if (!req.file) {
      return res.status(400).json({ success: false, message: "Photo proof is required for service edits" });
    }

    const service = await Service.findById(id);
    if (!service) return res.status(404).json({ success: false, message: "Service not found" });

    // Upload photo proof
    const result = await uploadToCloudinary(req.file.buffer, "service_edits");
    
    let location = { type: 'Point', coordinates: [0, 0] };
    if (rawLocation) {
      const loc = typeof rawLocation === "string" ? JSON.parse(rawLocation) : rawLocation;
      if (loc.lat && loc.lng) {
        location = { type: 'Point', coordinates: [loc.lng, loc.lat] };
      }
    }

    service.pendingEdit = {
      serviceName,
      description,
      category,
      address,
      location,
      photoProof: result.url,
      updatedAt: new Date()
    };
    service.approvalStatus = "pending_edit";
    
    await service.save();

    return res.json({ success: true, message: "Edit request submitted for admin approval", data: service });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const getServiceStatsController = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid service id" });
    }
    const data = await getServiceStats(id);
    return res.json({ success: true, data });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};