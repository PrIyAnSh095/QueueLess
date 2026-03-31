import mongoose from "mongoose";

const ticketSchema = new mongoose.Schema(
  {
    service: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Service",
      required: true
    },
    queue: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Queue",
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
      enum: ["waiting", "processing", "served", "cancelled"],
      default: "waiting"
    },
    actualWaitDuration: {
      type: Number // in minutes
    },
    servedAt: {
      type: Date
    },
    /** When set, this ticket is tied to a scheduled slot (same instant for all bookings in that slot). */
    scheduledStart: {
      type: Date
    },
    notificationSent: {
      type: Boolean,
      default: false
    },
    userLocation: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: { type: [Number], default: [0, 0] }
    }
  },
  { timestamps: true }
);

ticketSchema.index({ service: 1, scheduledStart: 1, status: 1 });

const Ticket = mongoose.model("Ticket", ticketSchema);

export default Ticket;
