import express from "express";
import {
  register,
  login,
  logout,
  getMe,
  googleOAuthRedirect,
  googleOAuthCallback,
  forgotPassword,
  resetPassword,
  changePassword,
  changePasswordByAdmin,
  sendChangePasswordOTP
} from "../controllers/auth.controller.js";
import { protect } from "../middlewares/auth.middleware.js";
import { requireRole } from "../middlewares/role.middleware.js";

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.post("/logout", logout);
router.get("/me", protect, getMe);
router.get("/google", googleOAuthRedirect);
router.get("/google/callback", googleOAuthCallback);

// Password management
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);
router.post("/change-password", protect, changePassword);
router.post("/change-password-admin", protect, requireRole("admin", "provider"), changePasswordByAdmin);
router.post("/send-change-otp", protect, sendChangePasswordOTP);

export default router;
