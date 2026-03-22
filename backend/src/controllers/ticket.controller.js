import * as ticketService from "../services/ticket.service.js";

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
