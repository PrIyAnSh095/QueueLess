import mongoose from "mongoose";
import Service from "../models/Service.model.js";
import path from "path";
import {
  getAvailableSlotsForService,
  getBookableDateKeys
} from "../services/slot.service.js";

export const createService = async (req, res) => {
  try {
    const {
      serviceName,
      description,
      duration,
      maxTokens,
      status,
      requiredDocuments: rawDocs,
      openTime,
      closeTime,
      slotIntervalMinutes,
      bookingHorizonDays,
      workingDays: rawWorkingDays
    } = req.body;

    let requiredDocuments = [];
    if (rawDocs != null) {
      try {
        const parsed = typeof rawDocs === "string" ? JSON.parse(rawDocs) : rawDocs;
        if (Array.isArray(parsed)) {
          requiredDocuments = parsed
            .filter((d) => typeof d === "string")
            .map((d) => d.trim())
            .filter(Boolean);
        }
      } catch {
        requiredDocuments = [];
      }
    }

    const certificateFile = req.file ? req.file.filename : undefined;

    let workingDays;
    if (rawWorkingDays != null) {
      try {
        const parsed =
          typeof rawWorkingDays === "string" ? JSON.parse(rawWorkingDays) : rawWorkingDays;
        if (Array.isArray(parsed)) {
          workingDays = parsed.filter((n) => Number.isInteger(n) && n >= 0 && n <= 6);
        }
      } catch {
        workingDays = undefined;
      }
    }

    const service = new Service({
      organizationId: req.user.id,
      serviceName,
      description,
      duration,
      maxTokens,
      approvalStatus: "pending",
      status: status === "true",
      certificate: certificateFile,
      requiredDocuments,
      ...(openTime != null && String(openTime).trim() ? { openTime: String(openTime).trim() } : {}),
      ...(closeTime != null && String(closeTime).trim() ? { closeTime: String(closeTime).trim() } : {}),
      ...(slotIntervalMinutes != null && !Number.isNaN(Number(slotIntervalMinutes))
        ? { slotIntervalMinutes: Number(slotIntervalMinutes) }
        : {}),
      ...(bookingHorizonDays != null && !Number.isNaN(Number(bookingHorizonDays))
        ? { bookingHorizonDays: Number(bookingHorizonDays) }
        : {}),
      ...(workingDays && workingDays.length ? { workingDays } : {})
    });

    await service.save();

    return res.status(201).json({
      success: true,
      message: "Service created successfully",
      data: service
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
      const certName = s.certificate ? path.basename(String(s.certificate)) : null;
      const certificateUrl = certName ? `/uploads/${encodeURIComponent(certName)}` : null;

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
      const certName = s.certificate ? path.basename(String(s.certificate)) : null;
      const certificateUrl = certName ? `/uploads/${encodeURIComponent(certName)}` : null;

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

export const getServiceSlots = async (req, res) => {
  try {
    const { id } = req.params;
    const { date } = req.query;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid service id" });
    }
    if (!date || typeof date !== "string") {
      return res
        .status(400)
        .json({ success: false, message: "Query parameter date (YYYY-MM-DD) is required" });
    }

    const data = await getAvailableSlotsForService(id, date.trim());
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

    return res.status(200).json({ success: true, data: service });
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

    const service = await Service.findByIdAndUpdate(
      id,
      { approvalStatus },
      { new: true }
    ).populate("organizationId", "name email phone role");

    if (!service) {
      return res.status(404).json({ success: false, message: "Service not found" });
    }

    return res.status(200).json({ success: true, data: service });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};