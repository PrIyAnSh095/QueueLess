import User from "../models/user.model.js";
import ServiceProvider from "../models/ServiceProvider.model.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import axios from "axios";

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

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      phone,
      role: role || "user"
    });

    if (user.role === "provider") {
      if (!organizationName) {
        await User.findByIdAndDelete(user._id);
        return res.status(400).json({ message: "Organization name is required for service providers" });
      }

      await ServiceProvider.create({
        user: user._id,
        businessName: organizationName,
        phone,
        location: location || {},
        status: "pending"
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

    const user = await User.findOne({ email });
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
    }

    return res.status(200).json({ user, providerProfile });
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

    const redirect = user.role === "provider" ? "/service-provider" : user.role === "admin" ? "/admin" : "/";
    res.redirect(`http://localhost:5173${redirect}`);
  } catch (error) {
    res.redirect("http://localhost:5173/login?error=oauth_failed");
  }
};