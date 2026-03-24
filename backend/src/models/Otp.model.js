import mongoose from "mongoose";

const otpSchema = new mongoose.Schema({
  email: { type: String, required: true, lowercase: true, trim: true },
  otp: { type: String, required: true },
  purpose: {
    type: String,
    enum: ["queue-join", "forgot-password", "verify-email", "change-password"],
    required: true
  },
  meta: { type: mongoose.Schema.Types.Mixed, default: {} },
  expiresAt: { type: Date, required: true, index: { expires: 0 } }
}, { timestamps: true });

otpSchema.index({ email: 1, purpose: 1 });

export default mongoose.model("Otp", otpSchema);
