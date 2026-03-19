import express from "express";
import {
  createService,
  getServices,
  getServiceById,
  getMyServices,
  updateService,
  deleteService
} from "../controllers/service.Controller.js";
import { protect } from "../middlewares/auth.middleware.js";
import { providerOnly } from "../middlewares/role.middleware.js";
import { uploadCertificate } from "../middlewares/upload.middleware.js";

const router = express.Router();

router.get("/", getServices);
router.get("/mine", protect, providerOnly, getMyServices);
router.get("/:id", getServiceById);
router.post("/create", protect, providerOnly, uploadCertificate, createService);
router.put("/:id", protect, providerOnly, updateService);
router.delete("/:id", protect, providerOnly, deleteService);

export default router;