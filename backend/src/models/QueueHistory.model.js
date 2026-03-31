import mongoose from "mongoose";

const queueHistorySchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  service: { type: mongoose.Schema.Types.ObjectId, ref: "Service", required: true },
  organization: { type: mongoose.Schema.Types.ObjectId, ref: "ServiceProvider" },
  ticket: { type: mongoose.Schema.Types.ObjectId, ref: "Ticket" },
  tokenNumber: { type: Number },
  joinTime: { type: Date, required: true },
  servedTime: { type: Date },
  cancelledTime: { type: Date },
  actualWaitDuration: { type: Number }, // in minutes
  predictedWaitDuration: { type: Number }, // in minutes — predicted at join time
  expectedServeTime: { type: Date }, // joinTime + predictedWaitDuration
  scheduledStart: { type: Date },
  status: { type: String, enum: ["served", "cancelled", "no-show"], default: "served" },
  delayReported: { type: Boolean, default: false },
  orgFlagged: { type: Boolean, default: false },
  // Dispute tracking
  userServeStatus: {
    type: String,
    enum: ["pending", "served", "not_served", "followup_sent"],
    default: "pending"
  },
  counterServeStatus: {
    type: String,
    enum: ["pending", "served"],
    default: "pending"
  }
}, { timestamps: true });

queueHistorySchema.index({ user: 1, createdAt: -1 });
queueHistorySchema.index({ service: 1, createdAt: -1 });
queueHistorySchema.index({ organization: 1, createdAt: -1 });
queueHistorySchema.index({ expectedServeTime: 1, userServeStatus: 1 });

export default mongoose.model("QueueHistory", queueHistorySchema);
