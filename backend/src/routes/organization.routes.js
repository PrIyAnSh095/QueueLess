import express from "express";
import multer from "multer";
import {
  getMyOrgProfile,
  updateMyOrgProfile,
  uploadVerificationDoc,
  uploadOrgImages,
  getOrgServices,
  getOrgStats,
  getOrgQueueUsers,
  getOrgCounters,
  createOrgCounter,
  deleteOrgCounter,
  getPublicOrganization,
  getPublicOrganizations
} from "../controllers/organization.controller.js";
import { protect } from "../middlewares/auth.middleware.js";
import { providerOnly } from "../middlewares/role.middleware.js";

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });
const router = express.Router();

// Public
router.get("/public", getPublicOrganizations);
router.get("/public/:id", getPublicOrganization);

// Provider only
router.get("/me", protect, providerOnly, getMyOrgProfile);
router.put("/me", protect, providerOnly, updateMyOrgProfile);
router.post("/me/verification-doc", protect, providerOnly, upload.single("document"), uploadVerificationDoc);
router.post("/me/images", protect, providerOnly, upload.array("images", 5), uploadOrgImages);
router.get("/me/services", protect, providerOnly, getOrgServices);
router.get("/me/stats", protect, providerOnly, getOrgStats);
router.get("/me/queue-users", protect, providerOnly, getOrgQueueUsers);
router.get("/me/counters", protect, providerOnly, getOrgCounters);
router.post("/me/counters", protect, providerOnly, createOrgCounter);
router.delete("/me/counters/:id", protect, providerOnly, deleteOrgCounter);

export default router;
