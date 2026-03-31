import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },

  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },

  phone: {
    type: String,
    trim: true
  },

  role: {
    type: String,
    enum: ["user", "provider", "admin", "counter", "reception"],
    default: "user"
  },

  password: {
    type: String
  },

  googleId: {
    type: String,
    sparse: true
  },

  oauthProvider: {
    type: String,
    default: "local"
  },

  organizationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "ServiceProvider"
  },

  location: {
    type: { type: String, enum: ["Point"], default: "Point" },
    coordinates: { type: [Number], default: [0, 0] }
  }

}, { timestamps: true });

userSchema.index({ location: "2dsphere" });

export default mongoose.model("User", userSchema);
