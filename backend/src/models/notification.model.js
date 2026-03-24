import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  type: {
    type: String,
    enum: ["queue-join", "otp", "turn-alert", "delay-check", "admin-approval", "org-status", "review", "system"],
    default: "system"
  },
  title: { type: String, required: true },
  message: { type: String, required: true },
  read: { type: Boolean, default: false },
  data: { type: mongoose.Schema.Types.Mixed, default: {} }
}, { timestamps: true });

notificationSchema.index({ user: 1, read: 1, createdAt: -1 });

export default mongoose.model("Notification", notificationSchema);
