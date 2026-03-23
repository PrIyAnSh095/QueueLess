import express from "express";
import {
  joinQueue,
  leaveQueue,
  getQueuePosition,
  getQueueByService,
  serveNext,
  getMyTickets,
  completeTicket,
  transferTicket
} from "../controllers/ticket.controller.js";
import { protect } from "../middlewares/auth.middleware.js";
import { providerOnly } from "../middlewares/role.middleware.js";

const router = express.Router();

router.post("/join", protect, joinQueue);
router.put("/leave/:ticketId", protect, leaveQueue);
router.get("/position/:serviceId", protect, getQueuePosition);
router.get("/my-tickets", protect, getMyTickets);
router.get("/service/:serviceId", protect, providerOnly, getQueueByService);
router.put("/serve/:serviceId", protect, providerOnly, serveNext);
router.put("/complete/:ticketId", protect, providerOnly, completeTicket);
router.put("/transfer/:ticketId", protect, providerOnly, transferTicket);

export default router;
