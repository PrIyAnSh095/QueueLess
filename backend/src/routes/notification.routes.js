import express from "express";
import { getMyNotifications, markAsRead, markAllRead } from "../controllers/notification.controller.js";
import { protect } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.get("/", protect, getMyNotifications);
router.put("/:id/read", protect, markAsRead);
router.put("/read-all", protect, markAllRead);

export default router;
