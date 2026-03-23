import mongoose from "mongoose";

const queueSchema = new mongoose.Schema(
  {
    serviceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Service",
      required: true
    },
    userLimit: {
      type: Number,
      default: 100
    },
    openingTime: {
      type: String,
      default: "09:00"
    },
    closingTime: {
      type: String,
      default: "17:00"
    },
    breakStartTime: {
      type: String
    },
    breakEndTime: {
      type: String
    },
    avgServiceTime: {
      type: Number,
      required: true
    },
    isActive: {
      type: Boolean,
      default: true
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    }
  },
  { timestamps: true }
);

const Queue = mongoose.model("Queue", queueSchema);

export default Queue;
