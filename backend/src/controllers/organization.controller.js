import ServiceProvider from "../models/ServiceProvider.model.js";
import Service from "../models/Service.model.js";
import User from "../models/user.model.js";
import Counter from "../models/Counter.model.js";
import Ticket from "../models/ticket.model.js";
import { uploadImage } from "../services/cloudinary.service.js";

export const getMyOrgProfile = async (req, res) => {
  try {
    const org = await ServiceProvider.findOne({ user: req.user._id })
      .populate("user", "name email phone");
    if (!org) return res.status(404).json({ success: false, message: "Organization profile not found" });
    return res.json({ success: true, data: org });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const updateMyOrgProfile = async (req, res) => {
  try {
    const { businessName, phone, address, ownerName, alternateEmail, contactNumber, description, location } = req.body;
    const org = await ServiceProvider.findOne({ user: req.user._id });
    if (!org) return res.status(404).json({ success: false, message: "Organization not found" });

    if (businessName) org.businessName = businessName;
    if (phone) org.phone = phone;
    if (address) org.address = address;
    if (ownerName) org.ownerName = ownerName;
    if (alternateEmail) org.alternateEmail = alternateEmail;
    if (contactNumber) org.contactNumber = contactNumber;
    if (description) org.description = description;
    if (location) org.location = location;

    await org.save();
    return res.json({ success: true, data: org });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const uploadVerificationDoc = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: "No file uploaded" });
    const org = await ServiceProvider.findOne({ user: req.user._id });
    if (!org) return res.status(404).json({ success: false, message: "Organization not found" });

    const result = await uploadImage(req.file.buffer, "queueless/verification");
    org.verificationDocument = result.url;
    await org.save();
    return res.json({ success: true, data: { url: result.url } });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const uploadOrgImages = async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ success: false, message: "No files uploaded" });
    }
    const org = await ServiceProvider.findOne({ user: req.user._id });
    if (!org) return res.status(404).json({ success: false, message: "Organization not found" });

    const urls = [];
    for (const file of req.files) {
      const result = await uploadImage(file.buffer, "queueless/org-images");
      urls.push(result.url);
    }

    org.images = [...(org.images || []), ...urls];
    await org.save();
    return res.json({ success: true, data: { images: org.images } });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const getOrgServices = async (req, res) => {
  try {
    const org = await ServiceProvider.findOne({ user: req.user._id });
    if (!org) return res.status(404).json({ success: false, message: "Organization not found" });

    const services = await Service.find({ organizationId: org._id }).sort({ createdAt: -1 });

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

    const [totalBookings, activeBookings, completedBookings, totalCounters] = await Promise.all([
      Ticket.countDocuments({ service: { $in: serviceIds } }),
      Ticket.countDocuments({ service: { $in: serviceIds }, status: "waiting" }),
      Ticket.countDocuments({ service: { $in: serviceIds }, status: "served" }),
      Counter.countDocuments({ organization: org._id })
    ]);

    return res.json({
      success: true,
      data: {
        totalServices: services.length,
        activeServices: services.filter(s => s.status && s.approvalStatus === "approved").length,
        totalBookings,
        activeBookings,
        completedBookings,
        totalCounters
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
      .populate("service", "serviceName");

    return res.json({ success: true, data: tickets });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const getOrgCounters = async (req, res) => {
  try {
    const org = await ServiceProvider.findOne({ user: req.user._id });
    if (!org) return res.status(404).json({ success: false, message: "Organization not found" });

    const counters = await Counter.find({ organization: org._id })
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

    const { name, service } = req.body;
    if (!name) return res.status(400).json({ success: false, message: "Counter name is required" });

    const counter = await Counter.create({ name, service, organization: org._id });
    return res.status(201).json({ success: true, data: counter });
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
