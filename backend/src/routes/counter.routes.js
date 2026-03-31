import express from "express";
import { 
  getOrgCounters, 
  createOrgCounter, 
  serveNextByCounter, 
  completeCurrentToken, 
  deleteOrgCounter 
} from "../controllers/counter.controller.js";
import { protect } from "../middlewares/auth.middleware.js";
import { providerOnly, allowRoles } from "../middlewares/role.middleware.js";

const router = express.Router();

/**
 * Dedicated Counter Routes
 * Handles all desk and staff serving operations.
 */

// General list and create
router.get("/", protect, allowRoles("provider", "counter", "reception"), getOrgCounters);
router.post("/", protect, providerOnly, createOrgCounter);

// Specific counter operations
router.delete("/:id", protect, providerOnly, deleteOrgCounter);
router.put("/:counterId/serve-next", protect, allowRoles("provider", "counter"), serveNextByCounter);
router.put("/:counterId/complete", protect, allowRoles("provider", "counter"), completeCurrentToken);

export default router;
