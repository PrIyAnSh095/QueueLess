import ServiceProvider from "../models/ServiceProvider.model.js";
import Ticket from "../models/ticket.model.js";

export const getPendingProviders = async (req, res) => {
  try {
    const providers = await ServiceProvider.find({ status: "pending" }).populate("user", "name email phone");
    res.json({ success: true, data: providers });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getAllProviders = async (req, res) => {
  try {
    const providers = await ServiceProvider.find().populate("user", "name email phone");
    res.json({ success: true, data: providers });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getProviderById = async (req, res) => {
  try {
    const provider = await ServiceProvider.findById(req.params.id).populate("user", "name email phone");
    if (!provider) return res.status(404).json({ success: false, message: "Provider not found" });
    res.json({ success: true, data: provider });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const approveProvider = async (req, res) => {
  try {
    const provider = await ServiceProvider.findByIdAndUpdate(req.params.id, { status: "approved" }, { new: true });
    res.json({ success: true, data: provider });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const rejectProvider = async (req, res) => {
  try {
    const provider = await ServiceProvider.findByIdAndUpdate(req.params.id, { status: "rejected" }, { new: true });
    res.json({ success: true, data: provider });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const listAllTickets = async (req, res) => {
  try {
    const tickets = await Ticket.find()
      .sort({ createdAt: -1 })
      .limit(100)
      .populate("user", "name email")
      .populate({
         path: "service",
         select: "serviceName",
         populate: { path: "organizationId", select: "businessName" }
      });
    
    return res.status(200).json({ success: true, data: tickets });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
