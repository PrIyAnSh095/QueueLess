import Notification from "../models/notification.model.js";

export const getMyNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .limit(50);
    const unreadCount = await Notification.countDocuments({ user: req.user._id, read: false });
    return res.json({ success: true, data: { notifications, unreadCount } });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const markAsRead = async (req, res) => {
  try {
    await Notification.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      { read: true }
    );
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const markAllRead = async (req, res) => {
  try {
    await Notification.updateMany({ user: req.user._id, read: false }, { read: true });
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export async function createNotification(userId, type, title, message, data = {}) {
  try {
    await Notification.create({ user: userId, type, title, message, data });
  } catch (err) {
    console.error("Failed to create notification:", err.message);
  }
}
