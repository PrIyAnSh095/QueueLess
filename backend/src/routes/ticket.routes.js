import express from "express";
import {
  requestJoinOTP,
  confirmJoinWithOTP,
  joinQueue,
  leaveQueue,
  getQueuePosition,
  getQueueByService,
  serveNext,
  getMyTickets,
  reportDelay
} from "../controllers/ticket.controller.js";
import { protect } from "../middlewares/auth.middleware.js";
import { providerOnly } from "../middlewares/role.middleware.js";

const router = express.Router();

router.post("/request-join-otp", protect, requestJoinOTP);
router.post("/confirm-join", protect, confirmJoinWithOTP);
router.post("/join", protect, joinQueue);
router.put("/leave/:ticketId", protect, leaveQueue);
router.get("/position/:serviceId", protect, getQueuePosition);
router.get("/my-tickets", protect, getMyTickets);
router.get("/service/:serviceId", protect, providerOnly, getQueueByService);
router.put("/serve/:serviceId", protect, providerOnly, serveNext);
router.post("/report-delay/:ticketId", protect, reportDelay);

export default router;
