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
    enum: ["user", "provider", "admin"],
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
  }

}, { timestamps: true });

export default mongoose.model("User", userSchema);