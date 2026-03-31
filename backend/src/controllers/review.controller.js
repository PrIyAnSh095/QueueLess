import Review from "../models/Review.model.js";
import Ticket from "../models/ticket.model.js";
import Service from "../models/Service.model.js";
import ServiceProvider from "../models/ServiceProvider.model.js";
import mongoose from "mongoose";
import { uploadToCloudinary } from "../services/cloudinary.service.js";

export const createReview = async (req, res) => {
  try {
    if (req.user.role !== "user") {
      return res.status(403).json({ success: false, message: "Only users can add reviews." });
    }

    const { targetType, targetId, rating, comment } = req.body;

    if (!["organization", "service", "queue"].includes(targetType)) {
      return res.status(400).json({ success: false, message: "Invalid target type" });
    }
    if (!targetId || !rating || rating < 1 || rating > 5) {
      return res.status(400).json({ success: false, message: "Valid targetId and rating (1-5) are required" });
    }

    // Verify user has joined a queue for this target
    let hasTicket = false;
    if (targetType === "service") {
      hasTicket = await Ticket.exists({ user: req.user._id, service: targetId });
    } else if (targetType === "queue") {
      hasTicket = await Ticket.exists({ user: req.user._id, queue: targetId });
    } else if (targetType === "organization") {
      const services = await Service.find({ organizationId: targetId }).select("_id");
      hasTicket = await Ticket.exists({
        user: req.user._id,
        service: { $in: services.map(s => s._id) }
      });
    }

    if (!hasTicket) {
      return res.status(403).json({ success: false, message: "You can only review after joining a queue" });
    }

    const existing = await Review.findOne({ user: req.user._id, targetType, targetId });
    
    let imagesData = existing ? existing.images : [];
    if (req.files && req.files.length > 0) {
      const uploadPromises = req.files.map(file => 
        uploadToCloudinary(file.buffer, "queueless/reviews")
      );
      const newImages = await Promise.all(uploadPromises);
      imagesData = [...imagesData, ...newImages];
    }

    if (existing) {
      existing.rating = rating;
      existing.comment = comment || existing.comment;
      existing.images = imagesData;
      await existing.save();
      return res.json({ success: true, data: existing });
    }

    const review = await Review.create({
      user: req.user._id,
      targetType,
      targetId,
      rating: Number(rating),
      comment,
      images: imagesData
    });

    return res.status(201).json({ success: true, data: review });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ success: false, message: "You have already reviewed this" });
    }
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const getReviews = async (req, res) => {
  try {
    const { targetType, targetId } = req.query;
    if (!targetType || !targetId) {
      return res.status(400).json({ success: false, message: "targetType and targetId are required" });
    }

    const reviews = await Review.find({ targetType, targetId })
      .sort({ createdAt: -1 })
      .populate("user", "name");

    const avg = reviews.length > 0
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
      : 0;

    return res.json({
      success: true,
      data: { reviews, averageRating: Math.round(avg * 10) / 10, totalReviews: reviews.length }
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const deleteReview = async (req, res) => {
  try {
    const review = await Review.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    if (!review) return res.status(404).json({ success: false, message: "Review not found" });
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};
