// import express from "express";
// import authMiddleware from "../middlewares/auth.middleware.js";
// import { getTicketsWithETA } from "../controllers/ticket.controller.js";

// const router = express.Router();

// router.get("/protected", authMiddleware, (req, res) => {
//   res.json({
//     success: true,
//     message: "Protected route accessed",
//     user: req.user
//   });
// });

// router.get("/eta/:queueId", authMiddleware, getTicketsWithETA);


// export default router;
