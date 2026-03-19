import express from "express";
import {
  getPendingProviders,
  getAllProviders,
  approveProvider,
  rejectProvider
} from "../controllers/admin.controller.js";
import { protect } from "../middlewares/auth.middleware.js";
import { adminOnly } from "../middlewares/role.middleware.js";

const router = express.Router();

router.get("/providers", protect, adminOnly, getAllProviders);
router.get("/providers/pending", protect, adminOnly, getPendingProviders);
router.put("/providers/:id/approve", protect, adminOnly, approveProvider);
router.put("/providers/:id/reject", protect, adminOnly, rejectProvider);

export default router;
