import Ticket from "../models/ticket.model.js";
import Service from "../models/Service.model.js";
import mongoose from "mongoose";
import { checkAndNotifyTravel } from "./notification.service.js";

export const joinQueue = async ({ serviceId, userId, userLocation, scheduledStart }) => {
  if (!mongoose.Types.ObjectId.isValid(serviceId)) throw new Error("Invalid serviceId");

  const service = await Service.findOne({
    _id: serviceId,
    approvalStatus: "approved",
    status: true
  });
  if (!service) throw new Error("Service not found");

  const existing = await Ticket.findOne({ service: serviceId, user: userId, status: "waiting" });
  if (existing) throw new Error("You are already in this queue");

  // Atomic token assignment
  const updatedService = await Service.findByIdAndUpdate(
    serviceId,
    { $inc: { currentToken: 1 } },
    { new: true, upsert: true }
  );
  
  const tokenNumber = updatedService.currentToken || 1;

  const ticket = await Ticket.create({
    service: serviceId,
    user: userId,
    tokenNumber,
    status: "waiting",
    userLocation: userLocation || {},
    serviceLocation: service.location || {},
    scheduledStart: scheduledStart ? new Date(scheduledStart) : null
  });

  return ticket.populate("service", "serviceName avgServiceTime location duration");
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

  const userTicket = await Ticket.findOne({ service: serviceId, user: userId, status: "waiting" })
    .populate("user", "email")
    .populate("service", "serviceName");
    
  if (!userTicket) return { inQueue: false };

  const aheadCount = await Ticket.countDocuments({
    service: serviceId,
    status: "waiting",
    tokenNumber: { $lt: userTicket.tokenNumber }
  });

  const avgServiceTime = service.avgServiceTime || 15;
  const etaMinutes = aheadCount * avgServiceTime;

  // Real-time notification check
  const ticketWithDetails = { ...userTicket.toObject(), etaMinutes, user: userTicket.user, service: userTicket.service };
  // checkAndNotifyTravel expects the ticket with etaMinutes
  // We need to pass the actual mongoose document for saving 'notified' flag
  userTicket.etaMinutes = etaMinutes; 
  await checkAndNotifyTravel(userTicket, avgServiceTime);

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
  ticket.servedAt = new Date();
  await ticket.save();
  return ticket.populate("user", "name email");
};

export const completeTicket = async (ticketId) => {
  const ticket = await Ticket.findById(ticketId);
  if (!ticket) throw new Error("Ticket not found");
  if (ticket.status !== "served") throw new Error("Only served tickets can be completed");

  ticket.status = "completed";
  ticket.completedAt = new Date();
  await ticket.save();
  return ticket;
};

export const getUserTickets = async (userId) => {
  return Ticket.find({ user: userId })
    .sort({ createdAt: -1 })
    .populate("service", "serviceName description avgServiceTime location organizationId")
    .populate({ path: "service", populate: { path: "organizationId", select: "businessName" } });
};

export const transferTicket = async (ticketId, targetServiceId) => {
  const ticket = await Ticket.findById(ticketId);
  if (!ticket) throw new Error("Ticket not found");

  const targetService = await Service.findById(targetServiceId);
  if (!targetService) throw new Error("Target service not found");

  // Atomic token assignment for new service
  const updatedService = await Service.findByIdAndUpdate(
    targetServiceId,
    { $inc: { currentToken: 1 } },
    { new: true }
  );

  ticket.service = targetServiceId;
  ticket.tokenNumber = updatedService.currentToken;
  ticket.status = "waiting"; // Reset to waiting in new queue
  ticket.servedAt = null;
  
  await ticket.save();
  return ticket;
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
