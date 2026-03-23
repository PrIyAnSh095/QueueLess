import mongoose from "mongoose";

const ticketSchema = new mongoose.Schema(
  {
    service: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Service",
      required: true
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    tokenNumber: {
      type: Number,
      required: true
    },
    status: {
      type: String,
      enum: ["waiting", "served", "cancelled"],
      default: "waiting"
    },
    userLocation: {
      lat: { type: Number },
      lng: { type: Number }
    },
    serviceLocation: {
      lat: { type: Number },
      lng: { type: Number }
    },
    /** When set, this ticket is tied to a scheduled slot (same instant for all bookings in that slot). */
    scheduledStart: {
      type: Date
    },
    servedAt: {
      type: Date
    },
    completedAt: {
      type: Date
    },
    notified: {
      type: Boolean,
      default: false
    }
  },
  { timestamps: true }
);

ticketSchema.index({ service: 1, scheduledStart: 1, status: 1 });

const Ticket = mongoose.model("Ticket", ticketSchema);

export default Ticket;
