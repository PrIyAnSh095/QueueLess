import express from "express";
import {
  getAllOrganizations,
  approveOrg,
  rejectOrg,
  approveAddressChange,
  rejectAddressChange,
  getAllUsers,
  getUserHistory,
  getSystemStats,
  getAdminDashboardData,
  getAdminUpdateRequests,
  adminGetAllTickets,
  adminGetCounters,
  adminCreateCounter,
  adminDeleteCounter
} from "../controllers/admin.controller.js";
import { protect } from "../middlewares/auth.middleware.js";
import { adminOnly } from "../middlewares/role.middleware.js";

const router = express.Router();

router.use(protect, adminOnly);

router.get("/stats", getSystemStats);
router.get("/dashboard-data", getAdminDashboardData);
router.get("/organizations", getAllOrganizations);
router.put("/organizations/:id/approve", approveOrg);
router.put("/organizations/:id/reject", rejectOrg);
router.put("/organizations/:id/approve-address", approveAddressChange);
router.put("/organizations/:id/reject-address", rejectAddressChange);
router.get("/users", getAllUsers);
router.get("/users/:userId/history", getUserHistory);
router.get("/tickets", adminGetAllTickets);
router.get("/update-requests", getAdminUpdateRequests);
router.get("/counters", adminGetCounters);
router.post("/counters", adminCreateCounter);
router.delete("/counters/:id", adminDeleteCounter);

export default router;
