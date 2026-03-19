import Ticket from "../models/ticket.model.js";
import Service from "../models/Service.model.js";
import mongoose from "mongoose";

export const joinQueue = async ({ serviceId, userId, userLocation }) => {
  if (!mongoose.Types.ObjectId.isValid(serviceId)) throw new Error("Invalid serviceId");

  const service = await Service.findById(serviceId);
  if (!service) throw new Error("Service not found");
  if (!service.status) throw new Error("Service is not currently active");

  const existing = await Ticket.findOne({ service: serviceId, user: userId, status: "waiting" });
  if (existing) throw new Error("You are already in this queue");

  const lastTicket = await Ticket.findOne({ service: serviceId }).sort({ tokenNumber: -1 });
  const tokenNumber = lastTicket ? lastTicket.tokenNumber + 1 : 1;

  const ticket = await Ticket.create({
    service: serviceId,
    user: userId,
    tokenNumber,
    status: "waiting",
    userLocation: userLocation || {},
    serviceLocation: service.location || {}
  });

  return ticket.populate("service", "serviceName avgServiceTime location");
};

export const leaveQueue = async ({ ticketId, userId }) => {
  const ticket = await Ticket.findById(ticketId);
  if (!ticket) throw new Error("Ticket not found");
  if (ticket.user.toString() !== userId.toString()) throw new Error("Not authorized");
  if (ticket.status !== "waiting") throw new Error("Cannot cancel a ticket that is already served or cancelled");

  ticket.status = "cancelled";
  await ticket.save();
  return ticket;
};

export const getQueuePosition = async ({ serviceId, userId }) => {
  const service = await Service.findById(serviceId);
  if (!service) throw new Error("Service not found");

  const userTicket = await Ticket.findOne({ service: serviceId, user: userId, status: "waiting" });
  if (!userTicket) return { inQueue: false };

  const aheadCount = await Ticket.countDocuments({
    service: serviceId,
    status: "waiting",
    tokenNumber: { $lt: userTicket.tokenNumber }
  });

  const avgServiceTime = service.avgServiceTime || 15;
  const etaMinutes = aheadCount * avgServiceTime;

  return {
    inQueue: true,
    ticket: userTicket,
    position: aheadCount + 1,
    aheadCount,
    etaMinutes,
    tokenNumber: userTicket.tokenNumber
  };
};

export const getQueueByService = async (serviceId) => {
  return Ticket.find({ service: serviceId, status: "waiting" })
    .sort({ tokenNumber: 1 })
    .populate("user", "name email phone");
};

export const serveNext = async ({ serviceId, providerId }) => {
  const service = await Service.findById(serviceId).populate("organizationId");
  if (!service) throw new Error("Service not found");

  if (service.organizationId.user.toString() !== providerId.toString()) {
    throw new Error("Not authorized to manage this service");
  }

  const ticket = await Ticket.findOne({ service: serviceId, status: "waiting" }).sort({ tokenNumber: 1 });
  if (!ticket) throw new Error("No tickets waiting in queue");

  ticket.status = "served";
  await ticket.save();
  return ticket.populate("user", "name email");
};

export const getUserTickets = async (userId) => {
  return Ticket.find({ user: userId })
    .sort({ createdAt: -1 })
    .populate("service", "serviceName description avgServiceTime location organizationId")
    .populate({ path: "service", populate: { path: "organizationId", select: "businessName" } });
};

export const getServiceStats = async (serviceId) => {
  const [totalBookings, waiting, served, cancelled] = await Promise.all([
    Ticket.countDocuments({ service: serviceId }),
    Ticket.countDocuments({ service: serviceId, status: "waiting" }),
    Ticket.countDocuments({ service: serviceId, status: "served" }),
    Ticket.countDocuments({ service: serviceId, status: "cancelled" })
  ]);

  return { totalBookings, waiting, served, cancelled };
};
