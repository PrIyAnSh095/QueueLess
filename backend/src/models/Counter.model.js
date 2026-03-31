import mongoose from "mongoose";

const counterSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  service: { type: mongoose.Schema.Types.ObjectId, ref: "Service" },
  organization: { type: mongoose.Schema.Types.ObjectId, ref: "ServiceProvider", required: true },
  isActive: { type: Boolean, default: true },
  currentTicket: { type: mongoose.Schema.Types.ObjectId, ref: "Ticket", default: null }
}, { timestamps: true });

counterSchema.index({ organization: 1, service: 1 });

export default mongoose.model("Counter", counterSchema);
