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
    category: {
      type: String,
      trim: true
    },
    approvalStatus: {
      type: String,
      enum: ["pending", "approved", "rejected", "pending_edit"],
      default: "pending"
    },
    address: {
      type: String,
      trim: true
    },
    location: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: { type: [Number], default: [0, 0] }
    },
    pendingEdit: {
      serviceName: String,
      description: String,
      category: String,
      address: String,
      location: {
        type: { type: String, enum: ['Point'], default: 'Point' },
        coordinates: { type: [Number], default: [0, 0] }
      },
      photoProof: String,
      updatedAt: { type: Date, default: Date.now }
    },
    status: {
      type: Boolean,
      default: false,
      alias: "isActive"
    },
    certificate: {
      type: String // Cloudinary URL
    }
  },
  { timestamps: true }
);

const Service = mongoose.model("Service", serviceSchema);

export default Service;