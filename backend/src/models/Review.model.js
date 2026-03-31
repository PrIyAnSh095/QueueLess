import mongoose from "mongoose";

const reviewSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  targetType: { type: String, enum: ["organization", "service", "queue"], required: true },
  targetId: { type: mongoose.Schema.Types.ObjectId, required: true },
  rating: { type: Number, required: true, min: 1, max: 5 },
  comment: { type: String, trim: true, maxlength: 1000 },
  images: {
    type: [{
      url: { type: String, required: true },
      public_id: { type: String, required: true }
    }],
    default: []
  }
}, { timestamps: true });

reviewSchema.index({ targetType: 1, targetId: 1 });
reviewSchema.index({ user: 1, targetType: 1, targetId: 1 }, { unique: true });

export default mongoose.model("Review", reviewSchema);
