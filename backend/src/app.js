import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import authRoutes from "./routes/auth.routes.js";
import serviceRoutes from "./routes/service.routes.js";
import ticketRoutes from "./routes/ticket.routes.js";
import adminRoutes from "./routes/admin.routes.js";
import organizationRoutes from "./routes/organization.routes.js";
import notificationRoutes from "./routes/notification.routes.js";
import reviewRoutes from "./routes/review.routes.js";
import searchRoutes from "./routes/search.routes.js";
import counterRoutes from "./routes/counter.routes.js";
import queueRoutes from "./routes/queue.routes.js";
import userRoutes from "./routes/user.routes.js";

const app = express();

// Build allowed origins list from env (comma-separated) plus local fallback
const rawOrigins = process.env.FRONTEND_URL || "http://localhost:5173";
const allowedOrigins = rawOrigins
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

// Optional: auto-allow all Vercel preview URLs for this project
// Set VERCEL_PROJECT_NAME=queueless on Render to enable this
const vercelProject = process.env.VERCEL_PROJECT_NAME || "";
const vercelPreviewRegex = vercelProject
  ? new RegExp(`^https://${vercelProject}[a-z0-9-]*\\.vercel\\.app$`, "i")
  : null;

const isOriginAllowed = (origin) => {
  if (!origin) return true; // Allow no-origin (curl, health checks)
  if (allowedOrigins.includes(origin)) return true;
  if (vercelPreviewRegex && vercelPreviewRegex.test(origin)) return true;
  // Always allow localhost for local dev
  if (/^http:\/\/localhost:\d+$/.test(origin)) return true;
  return false;
};

app.use(
  cors({
    origin: (origin, callback) => {
      if (isOriginAllowed(origin)) {
        return callback(null, true);
      }
      console.warn(`CORS blocked: ${origin}`);
      return callback(new Error(`CORS: origin ${origin} not allowed`));
    },
    credentials: true
  })
);

// Handle preflight for all routes
app.options("*", (req, res) => {
  const origin = req.headers.origin;
  if (isOriginAllowed(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin || "*");
    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization");
  }
  res.sendStatus(204);
});
app.use(express.json());
app.use(cookieParser());

app.use("/api/auth", authRoutes);
app.use("/api/services", serviceRoutes);
app.use("/api/tickets", ticketRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/organizations", organizationRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/search", searchRoutes);
app.use("/api/counters", counterRoutes);
app.use("/api/queues", queueRoutes);
app.use("/api/users", userRoutes);

app.use("/uploads", express.static("uploads"));

app.get("/health", (req, res) => {
  res.json({ status: "OK", service: "QueueLess API" });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Internal server error"
  });
});

export default app;
