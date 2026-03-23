import mongoose from "mongoose";

const serviceSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ServiceProvider",
      required: true
    },
    serviceName: {
      type: String,
      required: true,
      trim: true
    },
    description: {
      type: String,
      trim: true
    },
    features: {
      type: [String],
      default: []
    },
    additionalRequirements: {
      type: String,
      trim: true
    },
    duration: {
      type: Number
    },
    avgServiceTime: {
      type: Number,
      default: 15
    },
    currentToken: {
      type: Number,
      default: 0
    },
    maxTokens: {
      type: Number
    },
    certificate: {
      type: String
    },
    requiredDocuments: {
      type: [String],
      default: []
    },
    location: {
      lat: { type: Number },
      lng: { type: Number }
    },
    approvalStatus: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending"
    },
    status: {
      type: Boolean,
      default: false,
      alias: "isActive"
    },
    /** Daily window for slot generation (24h "HH:mm", local server timezone). */
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
    slotIntervalMinutes: {
      type: Number,
      default: 30,
      min: 5
    },
    /** 0 = Sunday … 6 = Saturday */
    workingDays: {
      type: [Number],
      default: [1, 2, 3, 4, 5]
    },
    bookingHorizonDays: {
      type: Number,
      default: 14,
      min: 1,
      max: 90
    }
  },
  { timestamps: true }
);

const Service = mongoose.model("Service", serviceSchema);

export default Service;