import React, { useState, useEffect, useRef } from 'react';
import { getNotificationsAPI, markNotificationReadAPI, markAllNotificationsReadAPI } from '../services/api';
import './NotificationPanel.css';

const NotificationPanel = ({ isOpen, onClose }) => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const ref = useRef(null);

  const fetchNotifications = async () => {
    try {
      const res = await getNotificationsAPI();
      setNotifications(res.data.data.notifications || []);
      setUnreadCount(res.data.data.unreadCount || 0);
    } catch {}
  };

  useEffect(() => {
    if (isOpen) fetchNotifications();
  }, [isOpen]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onClose();
    };
    if (isOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);

  const handleMarkRead = async (id) => {
    await markNotificationReadAPI(id);
    fetchNotifications();
  };

  const handleMarkAllRead = async () => {
    await markAllNotificationsReadAPI();
    fetchNotifications();
  };

  const typeIcons = {
    'queue-join': '🎫', 'otp': '🔐', 'turn-alert': '⏰',
    'delay-check': '⏳', 'admin-approval': '✅', 'org-status': '🏢',
    'review': '⭐', 'system': '📢'
  };

  if (!isOpen) return null;

  return (
    <div className="notif-panel" ref={ref}>
      <div className="notif-header">
        <h3>Notifications {unreadCount > 0 && <span className="notif-badge">{unreadCount}</span>}</h3>
        {unreadCount > 0 && (
          <button className="notif-mark-all" onClick={handleMarkAllRead}>Mark all read</button>
        )}
      </div>
      <div className="notif-list">
        {notifications.length === 0 ? (
          <div className="notif-empty">No notifications yet</div>
        ) : (
          notifications.map(n => (
            <div
              key={n._id}
              className={`notif-item ${n.read ? '' : 'unread'}`}
              onClick={() => !n.read && handleMarkRead(n._id)}
            >
              <div className="notif-icon">{typeIcons[n.type] || '📢'}</div>
              <div className="notif-content">
                <div className="notif-title">{n.title}</div>
                <div className="notif-message">{n.message}</div>
                <div className="notif-time">{new Date(n.createdAt).toLocaleString()}</div>
              </div>
              {!n.read && <div className="notif-dot" />}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default NotificationPanel;
