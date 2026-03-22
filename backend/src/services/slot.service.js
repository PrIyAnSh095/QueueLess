import Ticket from "../models/ticket.model.js";
import Service from "../models/Service.model.js";
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

/**
 * Returns calendar dates (YYYY-MM-DD strings) from today for `horizon` days that are working days.
 */
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

/**
 * List available slot start times for a service on a given date (YYYY-MM-DD).
 */
export async function getAvailableSlotsForService(serviceId, dateStr) {
  if (!mongoose.Types.ObjectId.isValid(serviceId)) {
    throw new Error("Invalid serviceId");
  }

  const service = await Service.findOne({
    _id: serviceId,
    approvalStatus: "approved",
    status: true
  });
  if (!service) throw new Error("Service not found");

  const open = service.openTime || DEFAULT_OPEN;
  const close = service.closeTime || DEFAULT_CLOSE;
  const interval = service.slotIntervalMinutes || DEFAULT_INTERVAL;
  const workingDays = Array.isArray(service.workingDays) && service.workingDays.length
    ? service.workingDays
    : DEFAULT_WORKING_DAYS;
  const maxPerSlot = service.maxTokens != null && service.maxTokens > 0 ? service.maxTokens : 10;

  const openMin = parseTimeToMinutes(open);
  const closeMin = parseTimeToMinutes(close);
  if (openMin == null || closeMin == null || closeMin <= openMin) {
    throw new Error("Invalid service hours");
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

  const horizon = service.bookingHorizonDays ?? DEFAULT_HORIZON;
  const maxDay = new Date(todayStart);
  maxDay.setDate(maxDay.getDate() + Math.max(0, horizon - 1));
  if (selectedStart > maxDay) {
    return { date: dateStr, slots: [] };
  }

  const slots = [];
  for (let t = openMin; t < closeMin; t += interval) {
    const slotStart = buildLocalDate(y, mo, d, t);
    if (selectedStart.getTime() === todayStart.getTime() && slotStart <= now) {
      continue;
    }
    const slotEnd = new Date(slotStart.getTime() + interval * 60 * 1000);
    if (slotEnd > buildLocalDate(y, mo, d, closeMin)) {
      break;
    }

    const booked = await Ticket.countDocuments({
      service: serviceId,
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
