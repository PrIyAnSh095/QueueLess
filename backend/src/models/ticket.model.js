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
    }
  },
  { timestamps: true }
);

const Ticket = mongoose.model("Ticket", ticketSchema);

export default Ticket;
