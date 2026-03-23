import express from "express";
import {
  register,
  login,
  logout,
  getMe,
  updateMe,
  googleOAuthRedirect,
  googleOAuthCallback
} from "../controllers/auth.controller.js";
import { protect } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.post("/logout", logout);
router.get("/me", protect, getMe);
router.put("/me", protect, updateMe);
router.get("/google", googleOAuthRedirect);
router.get("/google/callback", googleOAuthCallback);

export default router;
