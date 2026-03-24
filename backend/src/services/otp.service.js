import crypto from "crypto";
import Otp from "../models/Otp.model.js";

const OTP_EXPIRY_MINUTES = 10;

export function generateOTP() {
  return crypto.randomInt(100000, 999999).toString();
}

export async function createOTP(email, purpose, meta = {}) {
  // Remove any existing OTP for this email+purpose
  await Otp.deleteMany({ email: email.toLowerCase(), purpose });

  const otp = generateOTP();
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

  await Otp.create({
    email: email.toLowerCase(),
    otp,
    purpose,
    meta,
    expiresAt
  });

  return otp;
}

export async function verifyOTP(email, otp, purpose) {
  const record = await Otp.findOne({
    email: email.toLowerCase(),
    otp,
    purpose,
    expiresAt: { $gt: new Date() }
  });

  if (!record) return { valid: false, meta: {} };

  const meta = record.meta || {};
  await Otp.deleteMany({ email: email.toLowerCase(), purpose });

  return { valid: true, meta };
}
