import express from "express";
import {
  requestJoinCode,
  confirmJoinWithCode,
  joinQueue,
  addWalkInTicket,
  leaveQueue,
  getQueuePosition,
  getLiveETA,
  getQueueByService,
  serveNext,
  getMyTickets,
  reportDelay,
  confirmServe,
  getMyHistory
} from "../controllers/ticket.controller.js";
import { protect } from "../middlewares/auth.middleware.js";
import { providerOnly, allowRoles } from "../middlewares/role.middleware.js";

const router = express.Router();

router.post("/request-join-code", protect, requestJoinCode);
router.post("/confirm-join", protect, confirmJoinWithCode);
router.post("/join", protect, joinQueue);
router.post("/walk-in", protect, allowRoles("provider", "reception", "counter"), addWalkInTicket);
router.put("/leave/:ticketId", protect, leaveQueue);
router.get("/position/:queueId", protect, getQueuePosition);
router.get("/live-eta/:queueId", protect, getLiveETA);
router.get("/my-tickets", protect, getMyTickets);
router.get("/my-history", protect, getMyHistory);
router.get("/service/:serviceId", protect, allowRoles("user", "provider", "counter", "admin"), getQueueByService);
router.put("/serve/:queueId", protect, providerOnly, serveNext);
router.post("/report-delay/:ticketId", protect, reportDelay);
router.post("/confirm-serve/:historyId", protect, confirmServe);

export default router;
