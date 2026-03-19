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
    duration: {
      type: Number
    },
    avgServiceTime: {
      type: Number,
      default: 15
    },
    maxTokens: {
      type: Number
    },
    certificate: {
      type: String
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
      default: true
    }
  },
  { timestamps: true }
);

const Service = mongoose.model("Service", serviceSchema);

export default Service;