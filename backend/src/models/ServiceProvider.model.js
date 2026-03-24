import mongoose from "mongoose";

const serviceProviderSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    unique: true
  },

  businessName: {
    type: String,
    required: true,
    trim: true
  },

  ownerName: {
    type: String,
    trim: true
  },

  phone: {
    type: String,
    trim: true
  },

  contactNumber: {
    type: String,
    trim: true
  },

  alternateEmail: {
    type: String,
    trim: true,
    lowercase: true
  },

  description: {
    type: String,
    trim: true
  },

  address: {
    type: String,
    trim: true
  },

  location: {
    lat: { type: Number },
    lng: { type: Number }
  },

  verificationDocument: {
    type: String // Cloudinary URL
  },

  images: {
    type: [String], // Cloudinary URLs
    default: []
  },

  status: {
    type: String,
    enum: ["pending", "approved", "rejected"],
    default: "pending"
  },

  disableSmartWaitTime: {
    type: Boolean,
    default: false
  }

}, { timestamps: true });

export default mongoose.model("ServiceProvider", serviceProviderSchema);