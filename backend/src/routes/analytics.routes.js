import express from "express";
import { getProviderStats, getTrendingServices, getGlobalStats } from "../controllers/analytics.controller.js";
import { protect } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.get("/provider/:providerId", protect, getProviderStats);
router.get("/trending", getTrendingServices);
router.get("/global", getGlobalStats);

export default router;
