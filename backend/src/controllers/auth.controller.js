import User from "../models/user.model.js";
import ServiceProvider from "../models/ServiceProvider.model.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import axios from "axios";
import { createOTP, verifyOTP } from "../services/otp.service.js";
import { sendOTPEmail } from "../services/email.service.js";
import { uploadToCloudinary } from "../services/cloudinary.service.js";

const signToken = (user) =>
  jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, {
    expiresIn: "7d"
  });

const setCookie = (res, token) => {
  res.cookie("token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: "/"
  });
};

export const register = async (req, res) => {
  try {
    const { name, email, password, phone, role, organizationName, location } = req.body;

    if (!name || !email || !password || !phone) {
      return res.status(400).json({ message: "All required fields must be provided" });
    }

    const targetRole = role || "user";

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // If it's a provider, we MUST have a file and org name
    let verificationUrl = "";
    if (targetRole === "provider") {
      if (!organizationName) {
        return res.status(400).json({ message: "Organization name is required for providers" });
      }
      if (!req.file) {
        return res.status(400).json({ message: "Verification document is required for providers" });
      }
      
      try {
        const result = await uploadToCloudinary(req.file.buffer, "queueless/verification");
        verificationUrl = result.url;
      } catch (uploadError) {
        return res.status(500).json({ message: "File upload failed. Please try again." });
      }
    }

    // Now create user
    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      phone,
      role: targetRole
    });

    if (targetRole === "provider") {
      let parsedLocation = location;
      if (typeof location === 'string') {
        try {
          parsedLocation = JSON.parse(location);
        } catch (e) {
          parsedLocation = {};
        }
      }

      await ServiceProvider.create({
        user: user._id,
        businessName: organizationName,
        phone,
        location: parsedLocation || {},
        status: "pending",
        verificationDocument: verificationUrl
      });
    }

    return res.status(201).json({ message: "Registered successfully" });
  } catch (error) {
    return res.status(500).json({ message: "Server error" });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const normalizedEmail = String(email || "").trim().toLowerCase();
    const adminEmail = "admin@queueless";
    const adminPassword = "Admin@1234";

    if (!normalizedEmail || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    // Seed/fix default admin on first successful login attempt.
    if (normalizedEmail === adminEmail && password === adminPassword) {
      let existingAdmin = await User.findOne({ email: adminEmail });
      if (!existingAdmin) {
        const hashedAdminPassword = await bcrypt.hash(adminPassword, 10);
        existingAdmin = await User.create({
          name: "Admin",
          email: adminEmail,
          password: hashedAdminPassword,
          role: "admin"
        });
      } else {
        let shouldSave = false;

        if (existingAdmin.role !== "admin") {
          existingAdmin.role = "admin";
          shouldSave = true;
        }

        const hasPassword = Boolean(existingAdmin.password);
        const passwordMatches = hasPassword
          ? await bcrypt.compare(adminPassword, existingAdmin.password)
          : false;

        if (!passwordMatches) {
          existingAdmin.password = await bcrypt.hash(adminPassword, 10);
          shouldSave = true;
        }

        if (shouldSave) {
          await existingAdmin.save();
        }
      }
    }

    const user = await User.findOne({ email: normalizedEmail });
    if (!user || !user.password) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    const token = signToken(user);
    setCookie(res, token);

    return res.status(200).json({
      message: "Login successful",
      user: { id: user._id, role: user.role, name: user.name, email: user.email }
    });
  } catch (error) {
    return res.status(500).json({ message: "Server error" });
  }
};


export const logout = (req, res) => {
  res.clearCookie("token", { path: "/" });
  return res.status(200).json({ message: "Logged out successfully" });
};

export const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });

    let providerProfile = null;
    if (user.role === "provider") {
      providerProfile = await ServiceProvider.findOne({ user: user._id });
      // BUG FIX: Auto-create provider profile if it's missing
      if (!providerProfile) {
        providerProfile = await ServiceProvider.create({
          user: user._id,
          businessName: user.name + "'s Organization",
          phone: user.phone || "",
          status: "pending"
        });
      }
    }

    return res.status(200).json({ user, providerProfile });
  } catch (error) {
    return res.status(500).json({ message: "Server error" });
  }
};

export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: "Email is required" });

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      // Don't reveal if user exists
      return res.json({ message: "If this email is registered, you will receive an OTP." });
    }

    const code = await createOTP(email, "forgot-password");
    await sendOTPEmail(email, code, "forgot-password");

    return res.json({ message: "If this email is registered, you will receive a verification code." });
  } catch (error) {
    return res.status(500).json({ message: "Server error" });
  }
};

export const resetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;
    if (!email || !otp || !newPassword) {
      return res.status(400).json({ message: "Email, OTP, and new password are required" });
    }
    if (newPassword.length < 8) {
      return res.status(400).json({ message: "Password must be at least 8 characters" });
    }

    const result = await verifyOTP(email, otp, "forgot-password");
    if (!result.valid) {
      return res.status(400).json({ message: "Invalid or expired OTP" });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) return res.status(404).json({ message: "User not found" });

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    return res.json({ message: "Password reset successfully" });
  } catch (error) {
    return res.status(500).json({ message: "Server error" });
  }
};

export const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: "Current and new passwords are required" });
    }
    if (newPassword.length < 8) {
      return res.status(400).json({ message: "New password must be at least 8 characters" });
    }

    const user = await User.findById(req.user._id);
    if (!user || !user.password) {
      return res.status(400).json({ message: "Cannot change password for OAuth accounts" });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Current password is incorrect" });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    return res.json({ message: "Password changed successfully" });
  } catch (error) {
    return res.status(500).json({ message: "Server error" });
  }
};

export const changePasswordByAdmin = async (req, res) => {
  try {
    const { userId, otp, newPassword } = req.body;
    if (!userId || !newPassword) {
      return res.status(400).json({ message: "User ID and new password are required" });
    }

    const targetUser = await User.findById(userId);
    if (!targetUser) return res.status(404).json({ message: "User not found" });

    // Verify OTP sent to the counter/target user's email
    if (otp) {
      const result = await verifyOTP(targetUser.email, otp, "change-password");
      if (!result.valid) {
        return res.status(400).json({ message: "Invalid or expired OTP" });
      }
    }

    targetUser.password = await bcrypt.hash(newPassword, 10);
    await targetUser.save();

    return res.json({ message: "Password changed successfully" });
  } catch (error) {
    return res.status(500).json({ message: "Server error" });
  }
};

export const sendChangePasswordOTP = async (req, res) => {
  try {
    const { userId } = req.body;
    const targetUser = await User.findById(userId || req.user._id);
    if (!targetUser) return res.status(404).json({ message: "User not found" });

    const otp = await createOTP(targetUser.email, "change-password");
    await sendOTPEmail(targetUser.email, otp, "change-password");

    return res.json({ message: "OTP sent to user's email" });
  } catch (error) {
    return res.status(500).json({ message: "Server error" });
  }
};

export const googleOAuthRedirect = (req, res) => {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID,
    redirect_uri: process.env.GOOGLE_REDIRECT_URI,
    response_type: "code",
    scope: "openid email profile",
    access_type: "offline",
    prompt: "consent"
  });
  res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
};

export const googleOAuthCallback = async (req, res) => {
  try {
    const { code } = req.query;
    if (!code) return res.redirect("http://localhost:5173/login?error=no_code");

    const tokenRes = await axios.post("https://oauth2.googleapis.com/token", {
      code,
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      redirect_uri: process.env.GOOGLE_REDIRECT_URI,
      grant_type: "authorization_code"
    });

    const { access_token } = tokenRes.data;

    const profileRes = await axios.get("https://www.googleapis.com/oauth2/v1/userinfo", {
      headers: { Authorization: `Bearer ${access_token}` }
    });

    const { id: googleId, email, name } = profileRes.data;

    let user = await User.findOne({ $or: [{ googleId }, { email }] });

    if (!user) {
      user = await User.create({
        name,
        email,
        googleId,
        oauthProvider: "google",
        role: "user"
      });
    } else if (!user.googleId) {
      user.googleId = googleId;
      user.oauthProvider = "google";
      await user.save();
    }

    const token = signToken(user);
    setCookie(res, token);

    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
    const redirect = user.role === "provider" ? "/service-provider" : user.role === "admin" ? "/admin" : "/";
    res.redirect(`${frontendUrl}${redirect}`);
  } catch (error) {
    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
    res.redirect(`${frontendUrl}/login?error=oauth_failed`);
  }
};