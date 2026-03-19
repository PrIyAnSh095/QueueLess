import Service from "../models/Service.model.js";
import ServiceProvider from "../models/ServiceProvider.model.js";

export const createService = async (req, res) => {
  try {
    const { serviceName, description, duration, avgServiceTime, maxTokens, status, location } = req.body;

    const provider = await ServiceProvider.findOne({ user: req.user._id });
    if (!provider) {
      return res.status(403).json({ success: false, message: "Provider profile not found" });
    }

    if (provider.status !== "approved") {
      return res.status(403).json({ success: false, message: "Your account is pending approval" });
    }

    const certificatePath = req.file ? req.file.path : undefined;

    let parsedLocation = {};
    if (location) {
      try {
        parsedLocation = typeof location === "string" ? JSON.parse(location) : location;
      } catch {}
    }

    const service = await Service.create({
      organizationId: provider._id,
      serviceName,
      description,
      duration: Number(duration) || 0,
      avgServiceTime: Number(avgServiceTime) || 15,
      maxTokens: Number(maxTokens) || 100,
      status: status === "true" || status === true,
      certificate: certificatePath,
      location: parsedLocation,
      approvalStatus: "approved"
    });

    return res.status(201).json({ success: true, message: "Service created successfully", data: service });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const getServices = async (req, res) => {
  try {
    const services = await Service.find({ status: true })
      .populate({
        path: "organizationId",
        select: "businessName phone address location status",
        populate: { path: "user", select: "name email" }
      })
      .sort({ createdAt: -1 });

    return res.status(200).json({ success: true, data: services });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const getServiceById = async (req, res) => {
  try {
    const service = await Service.findById(req.params.id).populate({
      path: "organizationId",
      select: "businessName phone address location status",
      populate: { path: "user", select: "name email" }
    });

    if (!service) return res.status(404).json({ success: false, message: "Service not found" });

    return res.status(200).json({ success: true, data: service });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const getMyServices = async (req, res) => {
  try {
    const provider = await ServiceProvider.findOne({ user: req.user._id });
    if (!provider) return res.status(404).json({ success: false, message: "Provider profile not found" });

    const services = await Service.find({ organizationId: provider._id }).sort({ createdAt: -1 });

    return res.status(200).json({ success: true, data: services });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const updateService = async (req, res) => {
  try {
    const provider = await ServiceProvider.findOne({ user: req.user._id });
    if (!provider) return res.status(403).json({ success: false, message: "Provider profile not found" });

    const service = await Service.findById(req.params.id);
    if (!service) return res.status(404).json({ success: false, message: "Service not found" });

    if (service.organizationId.toString() !== provider._id.toString()) {
      return res.status(403).json({ success: false, message: "Not authorized to update this service" });
    }

    const { serviceName, description, duration, avgServiceTime, maxTokens, status, location } = req.body;

    let parsedLocation = service.location;
    if (location) {
      try {
        parsedLocation = typeof location === "string" ? JSON.parse(location) : location;
      } catch {}
    }

    const updated = await Service.findByIdAndUpdate(
      req.params.id,
      {
        serviceName: serviceName || service.serviceName,
        description: description || service.description,
        duration: duration !== undefined ? Number(duration) : service.duration,
        avgServiceTime: avgServiceTime !== undefined ? Number(avgServiceTime) : service.avgServiceTime,
        maxTokens: maxTokens !== undefined ? Number(maxTokens) : service.maxTokens,
        status: status !== undefined ? (status === "true" || status === true) : service.status,
        location: parsedLocation
      },
      { new: true }
    );

    return res.status(200).json({ success: true, data: updated });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteService = async (req, res) => {
  try {
    const provider = await ServiceProvider.findOne({ user: req.user._id });
    if (!provider) return res.status(403).json({ success: false, message: "Provider profile not found" });

    const service = await Service.findById(req.params.id);
    if (!service) return res.status(404).json({ success: false, message: "Service not found" });

    if (service.organizationId.toString() !== provider._id.toString()) {
      return res.status(403).json({ success: false, message: "Not authorized to delete this service" });
    }

    await Service.findByIdAndDelete(req.params.id);
    return res.status(200).json({ success: true, message: "Service deleted" });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};