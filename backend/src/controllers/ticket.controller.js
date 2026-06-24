import * as ticketService from "../services/ticket.service.js";
import { createOTP, verifyOTP } from "../services/otp.service.js";
import { sendOTPEmail, sendQueueConfirmation, sendServedNotification } from "../services/email.service.js";
import { createNotification } from "./notification.controller.js";
import User from "../models/user.model.js";
import Queue from "../models/queue.model.js";
import ServiceProvider from "../models/ServiceProvider.model.js";
import QueueHistory from "../models/QueueHistory.model.js";
import { getTravelInfo, reverseGeocode } from "../services/travel.service.js";
import { extractCoords, getOrgCoordsFromService } from "../services/coords.util.js";

export const requestJoinCode = async (req, res) => {
  try {
    if (req.user.role !== "user") {
      return res.status(403).json({ success: false, message: "Only users can join queues" });
    }

    const { queueId, userLocation } = req.body;
    if (!queueId) return res.status(400).json({ success: false, message: "queueId is required" });

    const user = await User.findById(req.user._id);
    if (!user?.email) return res.status(400).json({ success: false, message: "No email on account" });
    const targetEmail = user.email;

    const code = await createOTP(targetEmail, "queue-join", { queueId, userLocation });
    const emailSent = await sendOTPEmail(targetEmail, code, "queue-join");

    if (!emailSent) {
      return res.status(500).json({ success: false, message: "Failed to send verification email. Please try again." });
    }

    return res.json({
      success: true,
      message: "Verification code sent to email",
      email: targetEmail.replace(/(.{2})(.*)(@.*)/, "$1***$3")
    });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
};

// getPinpointCoords replaced by getOrgCoordsFromService from coords.util.js

export const confirmJoinWithCode = async (req, res) => {
  try {
    if (req.user.role !== "user") {
      return res.status(403).json({ success: false, message: "Only users can join queues" });
    }

    const { code, queueId, userLocation } = req.body;
    if (!code || !queueId) {
      return res.status(400).json({ success: false, message: "Verification code and queueId are required" });
    }

    const user = await User.findById(req.user._id);
    if (!user?.email) return res.status(400).json({ success: false, message: "No email on account" });
    const targetEmail = user.email;

    const result = await verifyOTP(targetEmail, code, "queue-join");
    if (!result.valid) {
      return res.status(400).json({ success: false, message: "Invalid or expired verification code" });
    }

    const ticket = await ticketService.joinQueue({
      queueId,
      userId: req.user._id,
      userLocation
    });

    // Send confirmation email with distance and time
    const populatedTicket = await ticket.populate([
      {
        path: "service",
        select: "serviceName address location organizationId",
        populate: { path: "organizationId", select: "location address businessName" }
      },
      { path: "queue", select: "queueName avgServiceTime" }
    ]);

    const orgCoords = getOrgCoordsFromService(populatedTicket.service);
    let distance = 0;
    let timeToReach = 0;
    let reverseGeocodedAddress = "Location Unavailable";

    if (orgCoords) {
      if (userLocation && userLocation.lat && userLocation.lng) {
        // Full ORS call — distance + time + address
        try {
          console.log(`[ticket.controller] confirmJoin ORS: User(${userLocation.lat}, ${userLocation.lng}) → Org(${orgCoords.lat}, ${orgCoords.lng})`);
          const travel = await getTravelInfo(
            userLocation.lat,
            userLocation.lng,
            orgCoords.lat,
            orgCoords.lng
          );
          distance = travel.distanceKm;
          timeToReach = travel.travelMinutes;
          reverseGeocodedAddress = travel.displayAddress;
        } catch (err) {
          console.error("[ticket.controller] ORS error in confirmJoin:", err.message);
        }
      } else {
        // User location missing — only reverse geocode the org address, no fake distance call
        try {
          reverseGeocodedAddress = await reverseGeocode(orgCoords.lat, orgCoords.lng);
        } catch (err) {
          console.error("[ticket.controller] Reverse geocode error:", err.message);
        }
      }
    } else {
      console.log("[ticket.controller] confirmJoin: No org coordinates available for service", populatedTicket.service?._id);
    }

    sendQueueConfirmation(user.email, {
      serviceName: populatedTicket.service?.serviceName || "Service",
      queueName: populatedTicket.queue?.queueName || "Queue",
      tokenNumber: ticket.tokenNumber,
      estimatedWait: `${(populatedTicket.queue?.avgServiceTime || 15)} mins approx`,
      distance,
      timeToReach,
      locationAddress: reverseGeocodedAddress,
      userLocation,
      orgLocation: orgCoords,
      status: "On Schedule"
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
    if (req.user.role !== "user") {
      return res.status(403).json({ success: false, message: "Only users can join queues" });
    }

    const { queueId, userLocation } = req.body;
    if (!queueId) return res.status(400).json({ success: false, message: "queueId is required" });

    const ticket = await ticketService.joinQueue({
      queueId,
      userId: req.user._id,
      userLocation
    });

    const user = await User.findById(req.user._id);
    if (user?.email) {
      const populatedTicket = await ticket.populate([
        {
          path: "service",
          select: "serviceName address location organizationId",
          populate: { path: "organizationId", select: "location address businessName" }
        },
        { path: "queue", select: "queueName avgServiceTime" }
      ]);
      const orgCoords = getOrgCoordsFromService(populatedTicket.service);
      let distance = 0;
      let timeToReach = 0;
      let reverseGeocodedAddress = "Location Unavailable";

      if (orgCoords) {
        if (userLocation && userLocation.lat && userLocation.lng) {
          try {
            console.log(`[ticket.controller] joinQueue ORS: User(${userLocation.lat}, ${userLocation.lng}) → Org(${orgCoords.lat}, ${orgCoords.lng})`);
            const travel = await getTravelInfo(
              userLocation.lat,
              userLocation.lng,
              orgCoords.lat,
              orgCoords.lng
            );
            distance = travel.distanceKm;
            timeToReach = travel.travelMinutes;
            reverseGeocodedAddress = travel.displayAddress;
          } catch (err) {
            console.error("[ticket.controller] ORS error in joinQueue:", err.message);
          }
        } else {
          // User location missing — only reverse geocode, no fake distance
          try {
            reverseGeocodedAddress = await reverseGeocode(orgCoords.lat, orgCoords.lng);
          } catch (err) {}
        }
      }

      sendQueueConfirmation(user.email, {
        serviceName: populatedTicket.service?.serviceName || "Service",
        queueName: populatedTicket.queue?.queueName || "Queue",
        tokenNumber: ticket.tokenNumber,
        estimatedWait: `${populatedTicket.queue?.avgServiceTime || 15} mins approx`,
        distance,
        timeToReach,
        locationAddress: reverseGeocodedAddress,
        userLocation,
        orgLocation: orgCoords
      });
      createNotification(req.user._id, "queue-join", "Queue Joined!", `You are #${ticket.tokenNumber} in the queue.`);
    }

    return res.status(201).json({ success: true, data: ticket });
  } catch (error) {
    const status = error.message.includes("already have an active ticket") ? 409 : 400;
    return res.status(status).json({ success: false, message: error.message });
  }
};

export const addWalkInTicket = async (req, res) => {
  try {
    if (!["provider", "reception", "counter"].includes(req.user.role)) {
      return res.status(403).json({ success: false, message: "Only staff can add walk-ins" });
    }

    const { queueId, name, email, phone } = req.body;
    if (!queueId || !name || !email) {
      return res.status(400).json({ success: false, message: "queueId, name, and email are required" });
    }

    const queue = await Queue.findById(queueId).populate("serviceId", "serviceName organizationId");
    if (!queue) {
      return res.status(404).json({ success: false, message: "Queue not found" });
    }

    let requesterOrgId = req.user.organizationId;
    if (req.user.role === "provider") {
      const org = await ServiceProvider.findOne({ user: req.user._id }).select("_id");
      requesterOrgId = org?._id;
    }

    if (!requesterOrgId || queue.serviceId?.organizationId?.toString() !== requesterOrgId.toString()) {
      return res.status(403).json({ success: false, message: "You can only add walk-ins to your organization's queues" });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    let user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      user = await User.create({
        name: String(name).trim(),
        email: normalizedEmail,
        phone: phone ? String(phone).trim() : "",
        role: "user"
      });
    } else {
      user.name = user.name || String(name).trim();
      if (phone && !user.phone) {
        user.phone = String(phone).trim();
      }
      await user.save();
    }

    const ticket = await ticketService.joinQueue({
      queueId,
      userId: user._id
    });

    const populatedTicket = await ticket.populate([
      { path: "user", select: "name email phone" },
      {
        path: "service",
        select: "serviceName address location organizationId",
        populate: { path: "organizationId", select: "location address businessName" }
      },
      { path: "queue", select: "queueName avgServiceTime" }
    ]);

    if (user.email) {
      const orgCoords = getOrgCoordsFromService(populatedTicket.service);
      let reverseGeocodedAddress = "Location Unavailable";
      if (orgCoords) {
        try {
          reverseGeocodedAddress = await reverseGeocode(orgCoords.lat, orgCoords.lng);
        } catch (err) {
          console.error("[ticket.controller] Reverse geocode error in walk-in:", err.message);
        }
      }

      sendQueueConfirmation(user.email, {
        serviceName: populatedTicket.service?.serviceName || "Service",
        queueName: populatedTicket.queue?.queueName || "Queue",
        tokenNumber: populatedTicket.tokenNumber,
        estimatedWait: `${populatedTicket.queue?.avgServiceTime || 15} mins approx`,
        locationAddress: reverseGeocodedAddress,
        orgLocation: orgCoords
      });
    }

    createNotification(
      user._id,
      "queue-join",
      "Walk-in Added",
      `Your token #${populatedTicket.tokenNumber} for ${populatedTicket.service?.serviceName || "the service"} has been created.`
    );

    return res.status(201).json({ success: true, data: populatedTicket });
  } catch (error) {
    const status = error.message.includes("already have an active ticket") ? 409 : 400;
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
    const data = await ticketService.getQueuePosition({ queueId: req.params.queueId, userId: req.user._id });
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
};

/** Returns live ETA + distance/travel info for the user's ticket in a queue */
export const getLiveETA = async (req, res) => {
  try {
    const { userLat, userLng, accuracy } = req.query;
    const currentCoords = (userLat && userLng) ? { 
      lat: userLat, 
      lng: userLng, 
      accuracy: accuracy ? Number(accuracy) : null 
    } : null;

    const data = await ticketService.getLiveETA({ 
      queueId: req.params.queueId, 
      userId: req.user._id,
      currentCoords
    });
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
    const { queueId } = req.params;
    const ticket = await ticketService.serveNext({ queueId, providerId: req.user._id });

    if (ticket.user?._id) {
      const populatedTicket = await ticket.populate({
        path: "service",
        select: "serviceName"
      });

      // Web Notification
      createNotification(
        ticket.user._id,
        "turn-alert",
        "You've Been Served!",
        `It's your turn for ${populatedTicket.service?.serviceName}. Proceed to the counter.`
      );

      // Email Notification
      if (ticket.user.email) {
        sendServedNotification(ticket.user.email, {
          serviceName: populatedTicket.service?.serviceName || "Service",
          tokenNumber: ticket.tokenNumber,
          counterName: "Main Counter" // In a real app, this could come from queue info
        });
      }
    }

    // WebSocket Update
    import("../server.js").then(({ io }) => {
      io.emit("queue_update", { queueId, type: "serve" });
    });

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

/**
 * User confirms whether they were served.
 * status: "served" | "not_served"
 */
export const confirmServe = async (req, res) => {
  try {
    const { status } = req.body;
    if (!["served", "not_served"].includes(status)) {
      return res.status(400).json({ success: false, message: "Status must be 'served' or 'not_served'" });
    }
    const result = await ticketService.confirmServe(req.params.historyId, req.user._id, status);
    return res.json({ success: true, data: result });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
};

/** Get user's queue history with dispute status */
export const getMyHistory = async (req, res) => {
  try {
    const history = await QueueHistory.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .populate("service", "serviceName")
      .populate("organization", "businessName");
    return res.json({ success: true, data: history });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
