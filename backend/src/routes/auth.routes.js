import express from "express";
import {
  register,
  login,
  logout,
  getMe,
  googleOAuthRedirect,
  googleOAuthCallback
} from "../controllers/auth.controller.js";
import { protect } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.post("/logout", logout);
router.get("/me", protect, getMe);
router.get("/google", googleOAuthRedirect);
router.get("/google/callback", googleOAuthCallback);

export default router;
