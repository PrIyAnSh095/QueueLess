import Ticket from '../models/ticket.model.js';
import Queue from '../models/queue.model.js';
import QueueHistory from '../models/QueueHistory.model.js';
import {
  sendLeaveNowNotification,
  sendDelayFollowUpEmail
} from './email.service.js';
import { getTravelInfo } from './travel.service.js';
import { extractCoords, getOrgCoordsFromService } from './coords.util.js';

/**
 * Process all waiting tickets and send "time to leave" notifications.
 * 
 * SINGLE PIPELINE:
 *   1. Extract user coords from ticket.userLocation (GeoJSON)
 *   2. Extract org coords from service/organization (via coords.util)
 *   3. Call ORS via travel.service (ONE call for distance + duration + address)
 *   4. Use the SAME result for email notification
 * 
 * ❌ No Haversine formula
 * ❌ No manual speed estimation
 * ❌ No duplicate calculations
 */
export const checkAndNotifyUsers = async () => {
  try {
    const tickets = await Ticket.find({
      status: 'waiting',
      notificationSent: { $ne: true }
    })
      .populate({
        path: 'service',
        populate: { path: 'organizationId' }
      })
      .populate('queue')
      .populate('user', 'name email location');

    if (tickets.length === 0) return;

    let notified = 0;
    const BUFFER_MINUTES = 5;

    for (const ticket of tickets) {
      try {
        if (!ticket.service?.organizationId || !ticket.queue || !ticket.user?.email) continue;

        // ── Step 1: Count people ahead ──
        const peopleAhead = await Ticket.countDocuments({
          queue: ticket.queue._id,
          status: 'waiting',
          tokenNumber: { $lt: ticket.tokenNumber }
        });

        const avgServiceTime = ticket.queue.avgServiceTime || 15;
        const etaMinutes = peopleAhead * avgServiceTime;
        const position = peopleAhead + 1;

        // ── Step 2: Extract coordinates using shared utility ──
        let userCoords = extractCoords(ticket.userLocation);
        let sourceLabel = "Ticket";

        if (!userCoords) {
          userCoords = extractCoords(ticket.user?.location);
          if (userCoords) sourceLabel = "User_Profile";
        }

        const orgCoords = getOrgCoordsFromService(ticket.service);

        let shouldNotify = false;
        let distanceKm = null;
        let travelMinutes = null;
        let leaveInMinutes = null;
        let displayAddress = null;
        let mapsUrl = null;

        if (userCoords && orgCoords) {
          // ── Step 3: SINGLE ORS call via travel.service ──
          // This is the ONE source of truth for distance, travel time, AND address
          try {
            console.log(`[notification] 📍 [Source:${sourceLabel}] Calculating: User(${userCoords.lat}, ${userCoords.lng}) → Org(${orgCoords.lat}, ${orgCoords.lng})`);

            const travel = await getTravelInfo(
              userCoords.lat, userCoords.lng,
              orgCoords.lat, orgCoords.lng
            );

            distanceKm = travel.distanceKm;
            travelMinutes = travel.travelMinutes;
            displayAddress = travel.displayAddress;
            mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${orgCoords.lat},${orgCoords.lng}`;

            // ── Step 4: Leave time logic ──
            if (travelMinutes >= etaMinutes) {
              shouldNotify = true;
              leaveInMinutes = 0;
            } else {
              leaveInMinutes = etaMinutes - travelMinutes - BUFFER_MINUTES;
              if (leaveInMinutes <= 0) {
                shouldNotify = true;
                leaveInMinutes = 0;
              }
            }

            console.log(`[notification] 📊 Result: ${distanceKm}km, ${travelMinutes}min travel, ETA ${etaMinutes}min, leaveIn ${leaveInMinutes}min`);
          } catch (err) {
            console.error(`[notification] ⚠️ ORS error for ticket ${ticket._id}:`, err.message);
          }
        } else {
          // Log exactly what's missing - don't guess
          if (!userCoords) console.log(`[notification] ⚠️ Ticket ${ticket._id}: User location missing or invalid`);
          if (!orgCoords) console.log(`[notification] ⚠️ Ticket ${ticket._id}: Organization location missing or invalid`);
        }

        // Fallback: no location data but queue wait is short → still notify
        if (!shouldNotify && etaMinutes <= 15) {
          shouldNotify = true;
          leaveInMinutes = 0;
        }

        // ── Step 5: Send notification with SAME data ──
        if (shouldNotify) {
          // Debug log BEFORE sending email
          console.log(`[notification] 📧 SENDING to ${ticket.user.email}:`, {
            position,
            etaMinutes,
            distanceKm,
            travelMinutes,
            leaveInMinutes,
            displayAddress,
            mapsUrl
          });

          const sent = await sendLeaveNowNotification(ticket.user.email, {
            serviceName: ticket.service.serviceName || 'Your Service',
            tokenNumber: ticket.tokenNumber,
            position,
            etaMinutes,
            distanceKm,
            travelMinutes,
            leaveInMinutes: leaveInMinutes ?? 0,
            displayAddress,
            mapsUrl,
            bufferMinutes: BUFFER_MINUTES
          });

          if (sent !== false) {
            ticket.notificationSent = true;
            await ticket.save();
            notified++;
            console.log(`[notification] ✉️ Sent to ${ticket.user.email} — token #${ticket.tokenNumber}, ETA ${etaMinutes}m, pos #${position}`);
          }
        }
      } catch (ticketErr) {
        // Isolate per-ticket errors — don't crash the whole loop
        console.error(`[notification] ⚠️ Error processing ticket ${ticket._id}:`, ticketErr.message);
      }
    }

    if (notified > 0) {
      console.log(`[notification] ✅ Batch complete — notified ${notified} user(s).`);
    }
  } catch (err) {
    console.error('[notification] ❌ Fatal error in checkAndNotifyUsers:', err.message);
  }
};

/**
 * Check tickets whose predicted ETA has expired but are still waiting for user confirmation.
 * Send a follow-up email asking users to confirm if they were served.
 */
export const checkExpiredTickets = async () => {
  try {
    const now = new Date();

    const expiredHistories = await QueueHistory.find({
      userServeStatus: "pending",
      expectedServeTime: { $exists: true, $lte: now }
    })
      .populate({ path: "ticket", populate: { path: "user", select: "email name" } })
      .populate("service", "serviceName");

    for (const history of expiredHistories) {
      try {
        const email = history.ticket?.user?.email;
        if (!email) continue;

        await sendDelayFollowUpEmail(email, {
          serviceName: history.service?.serviceName || "Your Service",
          tokenNumber: history.tokenNumber || history.ticket?.tokenNumber
        });

        history.userServeStatus = "followup_sent";
        await history.save();
        console.log(`[notification] 📧 Delay follow-up sent to ${email}`);
      } catch (e) {
        console.error(`[notification] ⚠️ Error in checkExpiredTickets for history ${history._id}:`, e.message);
      }
    }
  } catch (err) {
    console.error("[notification] ❌ Error in checkExpiredTickets:", err.message);
  }
};
