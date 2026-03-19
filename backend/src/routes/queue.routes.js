// import express from "express";
// import authMiddleware from "../middlewares/auth.middleware.js";
// import { createQueue, getQueues } from "../controllers/queue.controller.js";
// import roleMiddleware from "../middlewares/role.middleware.js";


// const router = express.Router();

// router.post(
//   "/",
//   authMiddleware,
//   roleMiddleware(["ADMIN", "SUB_ADMIN"]),
//   createQueue
// );

// router.get("/", authMiddleware, getQueues);

// export default router;
