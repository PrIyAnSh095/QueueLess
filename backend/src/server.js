import dns from "dns";
import http from "http";
import { Server } from "socket.io";
import connectDB from "./config/db.js";
import app from "./app.js";

// Force Node.js to prefer IPv4 over IPv6 when resolving hostnames.
// Render does not support outbound IPv6 routing, so resolving to IPv6 addresses causes ENETUNREACH errors.
if (typeof dns.setDefaultResultOrder === "function") {
  dns.setDefaultResultOrder("ipv4first");
}
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

// Build allowed origins — same logic as app.js
const rawSocketOrigins = (process.env.FRONTEND_URL || "http://localhost:5173")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

const vercelProjectSocket = process.env.VERCEL_PROJECT_NAME || "";
const vercelPreviewRegexSocket = vercelProjectSocket
  ? new RegExp(`^https://${vercelProjectSocket}[a-z0-9-]*\\.vercel\\.app$`, "i")
  : null;

const isSocketOriginAllowed = (origin) => {
  if (!origin) return true;
  if (rawSocketOrigins.includes(origin)) return true;
  if (vercelPreviewRegexSocket && vercelPreviewRegexSocket.test(origin)) return true;
  if (/^http:\/\/localhost:\d+$/.test(origin)) return true;
  return false;
};

export const io = new Server(server, {
  cors: {
    origin: (origin, callback) => {
      if (isSocketOriginAllowed(origin)) {
        callback(null, true);
      } else {
        console.warn(`Socket.IO CORS blocked: ${origin}`);
        callback(new Error(`Socket.IO CORS: origin ${origin} not allowed`));
      }
    },
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
