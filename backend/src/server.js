import http from "http";
import { Server } from "socket.io";
import connectDB from "./config/db.js";
import app from "./app.js";
import { checkAndNotifyUsers, checkExpiredTickets } from "./services/notification.service.js";
import { setIO } from "./socket.js";

import { fileURLToPath } from "url";
import { dirname, join } from "path";
import dotenv from "dotenv";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, "../../.env") });

connectDB();

// Notification engine — reentry guard prevents overlapping runs
let notifyRunning = false;
let expiredRunning = false;

console.log("🚀 Smart Notification Engine started (60s interval)");

setInterval(async () => {
  if (notifyRunning) return; // skip if previous run still in progress
  notifyRunning = true;
  try {
    await checkAndNotifyUsers();
  } finally {
    notifyRunning = false;
  }
}, 60000);

// Check for expired tickets every 5 minutes
setInterval(async () => {
  if (expiredRunning) return;
  expiredRunning = true;
  try {
    await checkExpiredTickets();
  } finally {
    expiredRunning = false;
  }
}, 5 * 60 * 1000);

const server = http.createServer(app);
const socketOrigins = (process.env.FRONTEND_URL || "http://localhost:5173")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

export const io = new Server(server, {
  cors: {
    origin: socketOrigins,
    credentials: true
  }
});
setIO(io);

io.on("connection", (socket) => {
  console.log("🔌 New socket connection:", socket.id);
  
  socket.on("join_queue_room", (queueId) => {
    socket.join(`queue_${queueId}`);
    console.log(`👤 Socket ${socket.id} joined room: queue_${queueId}`);
  });

  socket.on("disconnect", () => {
    console.log("🔌 Socket disconnected:", socket.id);
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
