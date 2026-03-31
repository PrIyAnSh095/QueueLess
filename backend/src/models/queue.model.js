import mongoose from "mongoose";

const queueSchema = new mongoose.Schema(
  {
    serviceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Service",
      required: true
    },
    queueName: {
      type: String,
      required: true,
      trim: true
    },
    capacity: {
      type: Number,
      default: 10
    },
    isActive: {
      type: Boolean,
      default: true,
      alias: "activeStatus"
    },
    isOnBreak: {
      type: Boolean,
      default: false
    },
    counters: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
      }
    ],
    openTime: {
      type: String,
      default: "09:00",
      trim: true
    },
    closeTime: {
      type: String,
      default: "17:00",
      trim: true
    },
    workingDays: {
      type: [Number],
      default: [1, 2, 3, 4, 5]
    },
    avgServiceTime: {
      type: Number,
      default: 15
    },
    currentServingNumber: {
      type: Number,
      default: 0
    },
    slotIntervalMinutes: {
      type: Number,
      default: 30
    },
    status: {
      type: String,
      enum: ["active", "overload", "ended"],
      default: "active"
    }
  },
  { timestamps: true }
);

const Queue = mongoose.model("Queue", queueSchema);

export default Queue;
