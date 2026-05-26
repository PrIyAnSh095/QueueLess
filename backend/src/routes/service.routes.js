import express from "express";
import {
  createService,
  listPublicServices,
  listServicesForAdmin,
  getPublicServiceById,
  getServiceBookableDates,
  getQueueSlots,
  updateServiceApprovalStatus,
  requestServiceEdit,
  getServiceStatsController
} from "../controllers/service.controller.js";

import { protect } from "../middlewares/auth.middleware.js";
import { adminOnly, providerOnly } from "../middlewares/role.middleware.js";
import { uploadCertificate } from "../middlewares/upload.middleware.js";

const router = express.Router();

router.get("/", listPublicServices);
router.post("/create", protect, providerOnly, uploadCertificate, createService);
router.post("/:id/request-edit", protect, providerOnly, uploadCertificate, requestServiceEdit);
router.get("/admin", protect, adminOnly, listServicesForAdmin);
router.get("/:id/bookable-dates", getServiceBookableDates);
router.get("/:id/stats", protect, getServiceStatsController);
router.get("/queue/:queueId/slots", getQueueSlots);
router.get("/:id", getPublicServiceById);

router.patch("/:id/approval-status", protect, adminOnly, updateServiceApprovalStatus);

export default router;