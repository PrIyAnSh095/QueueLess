import express from "express";
import {
  createService,
  listPublicServices,
  listServicesForAdmin,
  getPublicServiceById,
  getServiceBookableDates,
  getServiceSlots,
  updateServiceApprovalStatus,
  getPublicProvider,
  listServicesByProvider,
  configureQueue
} from "../controllers/service.Controller.js";
import { protect } from "../middlewares/auth.middleware.js";
import { adminOnly, providerOnly } from "../middlewares/role.middleware.js";
import { uploadCertificate } from "../middlewares/upload.middleware.js";

const router = express.Router();

router.get("/", listPublicServices);
router.post("/create", protect, providerOnly, uploadCertificate, createService);
router.get("/admin", protect, adminOnly, listServicesForAdmin);
router.get("/:id/bookable-dates", getServiceBookableDates);
router.get("/:id/slots", getServiceSlots);
router.get("/:id", getPublicServiceById);
router.patch("/:id/approval-status", protect, adminOnly, updateServiceApprovalStatus);
router.post("/:id/configure-queue", protect, providerOnly, configureQueue);
router.post("/configure-queue", protect, providerOnly, configureQueue); // For compatibility with frontend sending serviceId in body

router.get("/provider/:id", getPublicProvider);
router.get("/provider/:id/services", listServicesByProvider);

export default router;