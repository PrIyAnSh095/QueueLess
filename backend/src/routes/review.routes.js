import express from "express";
import { createReview, getReviews, deleteReview } from "../controllers/review.controller.js";
import { protect } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.get("/", getReviews);
router.post("/", protect, createReview);
router.delete("/:id", protect, deleteReview);

export default router;
