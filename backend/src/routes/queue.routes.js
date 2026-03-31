import express from "express";
import { protect } from "../middlewares/auth.middleware.js";
import { allowRoles } from "../middlewares/role.middleware.js";
import { createQueue, getQueues, toggleBreak } from "../controllers/queue.controller.js";

const router = express.Router();

router.post("/", protect, createQueue);
router.get("/", protect, getQueues);
router.put("/:queueId/toggle-break", protect, allowRoles("provider", "counter", "reception"), toggleBreak);

export default router;
