import Counter from "../models/Counter.model.js";
import Ticket from "../models/ticket.model.js";
import Queue from "../models/queue.model.js";
import Service from "../models/Service.model.js";
import QueueHistory from "../models/QueueHistory.model.js";
import { resolveOrgId } from "./organization.controller.js";

/** 
 * Dedicated Counter Controller
 * Handles all staff interactions with desks and queues.
 */

export const getOrgCounters = async (req, res) => {
  try {
    const orgId = await resolveOrgId(req.user);
    if (!orgId) return res.status(404).json({ success: false, message: "Organization context not found" });

    const counters = await Counter.find({ organization: orgId })
      .populate("service", "serviceName")
      .populate("currentTicket");
    return res.json({ success: true, data: counters });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const createOrgCounter = async (req, res) => {
  try {
    const orgId = await resolveOrgId(req.user);
    if (!orgId) return res.status(404).json({ success: false, message: "Organization context not found" });

    const { name, service, userId } = req.body;
    if (!name) return res.status(400).json({ success: false, message: "Counter name is required" });
    if (!userId) return res.status(400).json({ success: false, message: "Staff user is required" });

    const counter = await Counter.create({ name, service, organization: orgId, user: userId });
    return res.status(201).json({ success: true, data: counter });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const deleteOrgCounter = async (req, res) => {
  try {
    const orgId = await resolveOrgId(req.user);
    if (!orgId) return res.status(404).json({ success: false, message: "Organization not found" });

    await Counter.findOneAndDelete({ _id: req.params.id, organization: orgId });
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const serveNextByCounter = async (req, res) => {
  try {
    const { counterId } = req.params;
    const counter = await Counter.findById(counterId).populate("service");
    if (!counter) return res.status(404).json({ success: false, message: "Counter not found" });

    if (counter.currentTicket) {
      const oldTicket = await Ticket.findById(counter.currentTicket);
      if (oldTicket && oldTicket.status === "processing") {
        const servedAt = new Date();
        oldTicket.status = "served";
        oldTicket.servedAt = servedAt;
        await oldTicket.save();
        await QueueHistory.findOneAndUpdate({ ticket: oldTicket._id }, { servedTime: servedAt, status: "served" });
      }
    }

    const nextTicket = await Ticket.findOneAndUpdate(
      { service: counter.service._id, status: "waiting" },
      { status: "processing" },
      { sort: { tokenNumber: 1 }, new: true }
    );

    if (!nextTicket) {
      counter.currentTicket = null;
      await counter.save();
      return res.json({ success: true, message: "No more tickets in queue", data: null });
    }

    counter.currentTicket = nextTicket._id;
    await counter.save();

    // WebSocket Update
    import("../server.js").then(({ io }) => {
      if (io) io.emit("queue_update", { type: "serve", counterId, ticketId: nextTicket._id });
    });

    return res.json({ success: true, data: nextTicket });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const completeCurrentToken = async (req, res) => {
  try {
    const { counterId } = req.params;
    const counter = await Counter.findById(counterId).populate("service");
    if (!counter) return res.status(404).json({ success: false, message: "Counter not found" });

    if (!counter.currentTicket) {
      return res.status(400).json({ success: false, message: "No active ticket to complete" });
    }

    const ticket = await Ticket.findById(counter.currentTicket);
    if (ticket && ticket.status === "processing") {
      const servedAt = new Date();
      const actualWaitDuration = Math.round((servedAt - ticket.createdAt) / 60000);
      ticket.status = "served";
      ticket.servedAt = servedAt;
      ticket.actualWaitDuration = actualWaitDuration;
      await ticket.save();

      await QueueHistory.findOneAndUpdate(
        { ticket: ticket._id },
        { servedTime: servedAt, actualWaitDuration, counterServeStatus: "served", status: "served" }
      );

      await Queue.findOneAndUpdate(
        { serviceId: counter.service._id },
        { currentServingNumber: ticket.tokenNumber }
      );
    }

    counter.currentTicket = null;
    await counter.save();

    import("../server.js").then(({ io }) => {
      if (io) io.emit("queue_update", { type: "complete", counterId });
    });

    return res.json({ success: true, message: "Ticket marked as completed" });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};
