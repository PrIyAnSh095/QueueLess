import express from "express";
import { updateLocation, getProfile } from "../controllers/user.controller.js";
import { protect } from "../middlewares/auth.middleware.js";

const router = express.Router();

// User profile and location management
router.get("/profile", protect, getProfile);
router.put("/profile/location", protect, updateLocation);

export default router;
