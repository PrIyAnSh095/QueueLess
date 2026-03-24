import ServiceProvider from "../models/ServiceProvider.model.js";
import Service from "../models/Service.model.js";
import User from "../models/user.model.js";
import Ticket from "../models/ticket.model.js";
import QueueHistory from "../models/QueueHistory.model.js";
import Counter from "../models/Counter.model.js";
import { sendOrgStatusEmail } from "../services/email.service.js";
import { createNotification } from "./notification.controller.js";

export const getAllOrganizations = async (req, res) => {
  try {
    const { status, search } = req.query;
    const query = {};
    if (status) query.status = status;
    if (search) {
      query.businessName = { $regex: search, $options: "i" };
    }
    const orgs = await ServiceProvider.find(query)
      .sort({ createdAt: -1 })
      .populate("user", "name email phone");
    return res.json({ success: true, data: orgs });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const approveOrg = async (req, res) => {
  try {
    const org = await ServiceProvider.findByIdAndUpdate(
      req.params.id,
      { status: "approved" },
      { new: true }
    ).populate("user", "name email");
    if (!org) return res.status(404).json({ success: false, message: "Organization not found" });

    if (org.user?.email) {
      sendOrgStatusEmail(org.user.email, org.businessName, "approved");
      createNotification(org.user._id, "org-status", "Organization Approved", `Your organization "${org.businessName}" has been approved!`);
    }
    return res.json({ success: true, data: org });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const rejectOrg = async (req, res) => {
  try {
    const org = await ServiceProvider.findByIdAndUpdate(
      req.params.id,
      { status: "rejected" },
      { new: true }
    ).populate("user", "name email");
    if (!org) return res.status(404).json({ success: false, message: "Organization not found" });

    if (org.user?.email) {
      sendOrgStatusEmail(org.user.email, org.businessName, "rejected");
      createNotification(org.user._id, "org-status", "Organization Rejected", `Your organization "${org.businessName}" has been rejected.`);
    }
    return res.json({ success: true, data: org });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const getAllUsers = async (req, res) => {
  try {
    const { search, role } = req.query;
    const query = {};
    if (role) query.role = role;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } }
      ];
    }
    const users = await User.find(query).select("-password").sort({ createdAt: -1 });
    return res.json({ success: true, data: users });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const getUserHistory = async (req, res) => {
  try {
    const history = await QueueHistory.find({ user: req.params.userId })
      .sort({ createdAt: -1 })
      .populate("service", "serviceName")
      .populate("organization", "businessName");
    return res.json({ success: true, data: history });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const getSystemStats = async (req, res) => {
  try {
    const [totalUsers, totalOrgs, totalServices, totalTickets, pendingOrgs, pendingServices] = await Promise.all([
      User.countDocuments(),
      ServiceProvider.countDocuments(),
      Service.countDocuments(),
      Ticket.countDocuments(),
      ServiceProvider.countDocuments({ status: "pending" }),
      Service.countDocuments({ approvalStatus: "pending" })
    ]);
    return res.json({
      success: true,
      data: { totalUsers, totalOrgs, totalServices, totalTickets, pendingOrgs, pendingServices }
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const adminGetAllTickets = async (req, res) => {
  try {
    const { status, serviceId } = req.query;
    const query = {};
    if (status) query.status = status;
    if (serviceId) query.service = serviceId;
    const tickets = await Ticket.find(query)
      .sort({ createdAt: -1 })
      .limit(100)
      .populate("user", "name email")
      .populate("service", "serviceName organizationId");
    return res.json({ success: true, data: tickets });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const adminGetCounters = async (req, res) => {
  try {
    const counters = await Counter.find()
      .populate("service", "serviceName")
      .populate("organization", "businessName");
    return res.json({ success: true, data: counters });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const adminCreateCounter = async (req, res) => {
  try {
    const { name, service, organization } = req.body;
    if (!name || !organization) {
      return res.status(400).json({ success: false, message: "Name and organization are required" });
    }
    const counter = await Counter.create({ name, service, organization });
    return res.status(201).json({ success: true, data: counter });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const adminDeleteCounter = async (req, res) => {
  try {
    await Counter.findByIdAndDelete(req.params.id);
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};
