import Ticket from "../models/ticket.model.js";
import Queue from "../models/queue.model.js";
import mongoose from "mongoose";

const DEFAULT_INTERVAL = 30;
const DEFAULT_OPEN = "09:00";
const DEFAULT_CLOSE = "17:00";
const DEFAULT_WORKING_DAYS = [1, 2, 3, 4, 5];
const DEFAULT_HORIZON = 14;

function parseTimeToMinutes(hhmm) {
  if (!hhmm || typeof hhmm !== "string") return null;
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm.trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  return h * 60 + min;
}

function buildLocalDate(y, month, day, minutesFromMidnight) {
  const h = Math.floor(minutesFromMidnight / 60);
  const min = minutesFromMidnight % 60;
  return new Date(y, month - 1, day, h, min, 0, 0);
}

function dateKeyLocal(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function getBookableDateKeys(horizonDays, workingDays) {
  const horizon = Number.isFinite(horizonDays) ? horizonDays : DEFAULT_HORIZON;
  const days = Array.isArray(workingDays) && workingDays.length ? workingDays : DEFAULT_WORKING_DAYS;
  const out = [];
  const now = new Date();
  for (let i = 0; i < horizon; i++) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i);
    if (days.includes(d.getDay())) {
      out.push(dateKeyLocal(d));
    }
  }
  return out;
}

export async function getAvailableSlotsForService(queueId, dateStr) {
  if (!mongoose.Types.ObjectId.isValid(queueId)) {
    throw new Error("Invalid queueId");
  }

  const queue = await Queue.findById(queueId).populate("serviceId");
  if (!queue) throw new Error("Queue not found");
  
  const service = queue.serviceId;
  if (!service || !service.status || service.approvalStatus !== "approved") {
    throw new Error("Service is currently unavailable");
  }

  const open = queue.openTime || DEFAULT_OPEN;
  const close = queue.closeTime || DEFAULT_CLOSE;
  const interval = queue.slotIntervalMinutes || DEFAULT_INTERVAL;
  const workingDays = Array.isArray(queue.workingDays) && queue.workingDays.length
    ? queue.workingDays
    : DEFAULT_WORKING_DAYS;
  const maxPerSlot = queue.capacity > 0 ? queue.capacity : 10;

  const openMin = parseTimeToMinutes(open);
  const closeMin = parseTimeToMinutes(close);
  if (openMin == null || closeMin == null || closeMin <= openMin) {
    throw new Error("Invalid queue hours");
  }

  const parts = String(dateStr).split("-").map(Number);
  if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) {
    throw new Error("Invalid date format (use YYYY-MM-DD)");
  }
  const [y, mo, d] = parts;
  const dayDate = new Date(y, mo - 1, d);
  if (
    dayDate.getFullYear() !== y ||
    dayDate.getMonth() !== mo - 1 ||
    dayDate.getDate() !== d
  ) {
    throw new Error("Invalid date");
  }

  if (!workingDays.includes(dayDate.getDay())) {
    return { date: dateStr, slots: [] };
  }

  const today = new Date();
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const selectedStart = new Date(y, mo - 1, d);
  if (selectedStart < todayStart) {
    return { date: dateStr, slots: [] };
  }

  const horizon = DEFAULT_HORIZON; // Can add to service/queue if needed
  const maxDay = new Date(todayStart);
  maxDay.setDate(maxDay.getDate() + Math.max(0, horizon - 1));
  if (selectedStart > maxDay) {
    return { date: dateStr, slots: [] };
  }

  const slots = [];
  const now = new Date();
  for (let t = openMin; t < closeMin; t += interval) {
    const slotStart = buildLocalDate(y, mo, d, t);
    // If today, skip slots in the past
    if (selectedStart.getTime() === todayStart.getTime() && slotStart <= now) {
      continue;
    }
    const slotEnd = new Date(slotStart.getTime() + interval * 60 * 1000);
    if (slotEnd > buildLocalDate(y, mo, d, closeMin)) {
      break;
    }

    const booked = await Ticket.countDocuments({
      queue: queueId,
      status: "waiting",
      scheduledStart: slotStart
    });

    slots.push({
      start: slotStart.toISOString(),
      label: slotStart.toLocaleTimeString(undefined, {
        hour: "numeric",
        minute: "2-digit",
        hour12: true
      }),
      booked,
      capacity: maxPerSlot,
      available: Math.max(0, maxPerSlot - booked)
    });
  }

  return { date: dateStr, slots };
}
