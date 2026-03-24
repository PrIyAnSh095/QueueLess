import * as ticketService from "../services/ticket.service.js";
import { createOTP, verifyOTP } from "../services/otp.service.js";
import { sendOTPEmail, sendQueueConfirmation } from "../services/email.service.js";
import { createNotification } from "./notification.controller.js";
import User from "../models/user.model.js";

export const requestJoinOTP = async (req, res) => {
  try {
    const { serviceId, userLocation, scheduledStart } = req.body;
    if (!serviceId) return res.status(400).json({ success: false, message: "serviceId is required" });

    const user = await User.findById(req.user._id);
    if (!user?.email) return res.status(400).json({ success: false, message: "No email on account" });

    const otp = await createOTP(user.email, "queue-join", { serviceId, userLocation, scheduledStart });
    await sendOTPEmail(user.email, otp, "queue-join");

    return res.json({ success: true, message: "OTP sent to your email", email: user.email.replace(/(.{2})(.*)(@.*)/, "$1***$3") });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
};

export const confirmJoinWithOTP = async (req, res) => {
  try {
    const { otp, serviceId, userLocation, scheduledStart } = req.body;
    if (!otp || !serviceId) {
      return res.status(400).json({ success: false, message: "OTP and serviceId are required" });
    }

    const user = await User.findById(req.user._id);
    if (!user?.email) return res.status(400).json({ success: false, message: "No email on account" });

    const result = await verifyOTP(user.email, otp, "queue-join");
    if (!result.valid) {
      return res.status(400).json({ success: false, message: "Invalid or expired OTP" });
    }

    const ticket = await ticketService.joinQueue({
      serviceId,
      userId: req.user._id,
      userLocation,
      scheduledStart
    });

    // Send confirmation email
    const populatedTicket = await ticket.populate("service", "serviceName avgServiceTime");
    sendQueueConfirmation(user.email, {
      serviceName: populatedTicket.service?.serviceName || "Service",
      tokenNumber: ticket.tokenNumber,
      scheduledTime: scheduledStart ? new Date(scheduledStart).toLocaleString() : null,
      estimatedWait: `${populatedTicket.service?.avgServiceTime || 15} mins approx`
    });

    // In-app notification
    createNotification(
      req.user._id,
      "queue-join",
      "Queue Joined!",
      `You are #${ticket.tokenNumber} in the queue for ${populatedTicket.service?.serviceName || "the service"}.`
    );

    return res.status(201).json({ success: true, data: ticket });
  } catch (error) {
    const status = error.message.includes("already in this queue") ? 409 : 400;
    return res.status(status).json({ success: false, message: error.message });
  }
};

export const joinQueue = async (req, res) => {
  try {
    const { serviceId, userLocation, scheduledStart } = req.body;
    if (!serviceId) return res.status(400).json({ success: false, message: "serviceId is required" });

    const ticket = await ticketService.joinQueue({
      serviceId,
      userId: req.user._id,
      userLocation,
      scheduledStart
    });

    const user = await User.findById(req.user._id);
    if (user?.email) {
      const populatedTicket = await ticket.populate("service", "serviceName avgServiceTime");
      sendQueueConfirmation(user.email, {
        serviceName: populatedTicket.service?.serviceName || "Service",
        tokenNumber: ticket.tokenNumber,
        scheduledTime: scheduledStart ? new Date(scheduledStart).toLocaleString() : null,
        estimatedWait: `${populatedTicket.service?.avgServiceTime || 15} mins approx`
      });
      createNotification(req.user._id, "queue-join", "Queue Joined!", `You are #${ticket.tokenNumber} in the queue.`);
    }

    return res.status(201).json({ success: true, data: ticket });
  } catch (error) {
    const status = error.message.includes("already in this queue") ? 409 : 400;
    return res.status(status).json({ success: false, message: error.message });
  }
};

export const leaveQueue = async (req, res) => {
  try {
    const ticket = await ticketService.leaveQueue({ ticketId: req.params.ticketId, userId: req.user._id });
    return res.status(200).json({ success: true, data: ticket });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
};

export const getQueuePosition = async (req, res) => {
  try {
    const data = await ticketService.getQueuePosition({ serviceId: req.params.serviceId, userId: req.user._id });
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
};

export const getQueueByService = async (req, res) => {
  try {
    const tickets = await ticketService.getQueueByService(req.params.serviceId);
    return res.status(200).json({ success: true, data: tickets });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const serveNext = async (req, res) => {
  try {
    const ticket = await ticketService.serveNext({ serviceId: req.params.serviceId, providerId: req.user._id });

    // Notify user their turn has been served
    if (ticket.user?._id) {
      createNotification(
        ticket.user._id,
        "turn-alert",
        "You've Been Served!",
        "Your queue ticket has been marked as served."
      );
    }

    return res.status(200).json({ success: true, data: ticket });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
};

export const getMyTickets = async (req, res) => {
  try {
    const tickets = await ticketService.getUserTickets(req.user._id);
    return res.status(200).json({ success: true, data: tickets });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const reportDelay = async (req, res) => {
  try {
    const result = await ticketService.reportDelay(req.params.ticketId, req.user._id);
    return res.json({ success: true, data: result });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
};
