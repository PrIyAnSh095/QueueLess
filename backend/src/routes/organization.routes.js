import express from "express";
import multer from "multer";
import {
  getMyOrgProfile,
  updateMyOrgProfile,
  uploadVerificationDoc,
  uploadOrgImages,
  getOrgServices,
  deleteOrgCounter,
  getOrgStats,
  getOrgQueueUsers,
  getOrgQueues,
  getOrgHistory,
  getOrgCharts,
  getPublicOrganization,
  getPublicOrganizations,
  getOrgStaff,
  createStaffAccount,
  updateQueueStatus,
  acceptAvgTimeUpdate,
  uploadFile
} from "../controllers/organization.controller.js";

import { protect } from "../middlewares/auth.middleware.js";
import { providerOnly, allowRoles } from "../middlewares/role.middleware.js";

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });
const router = express.Router();

// Public
router.get("/public", getPublicOrganizations);
router.get("/public/:id", getPublicOrganization);

// Provider only
router.get("/me", protect, allowRoles("provider", "reception", "counter"), getMyOrgProfile);
router.put("/me", protect, providerOnly, updateMyOrgProfile);
router.post("/me/upload", protect, providerOnly, upload.single("file"), uploadFile);
router.post("/me/verification-doc", protect, providerOnly, upload.single("document"), uploadVerificationDoc);
router.post("/me/images", protect, providerOnly, upload.array("images", 5), uploadOrgImages);
router.get("/me/services", protect, allowRoles("provider", "reception", "counter"), getOrgServices);
router.get("/me/stats", protect, providerOnly, getOrgStats);
router.get("/me/queue-users", protect, providerOnly, getOrgQueueUsers);
router.get("/me/queues", protect, allowRoles("provider", "counter", "reception"), getOrgQueues);
router.get("/me/history", protect, providerOnly, getOrgHistory);
router.get("/me/charts", protect, providerOnly, getOrgCharts);

// Staff management
router.get("/me/staff", protect, allowRoles("provider", "counter", "reception"), getOrgStaff);
router.post("/me/staff", protect, providerOnly, createStaffAccount);
router.put("/me/accept-avg-time", protect, providerOnly, acceptAvgTimeUpdate);

router.put("/me/queues/:queueId/status", protect, allowRoles("provider", "counter", "reception"), updateQueueStatus);

export default router;
