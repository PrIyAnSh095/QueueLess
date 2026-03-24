import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getMyTicketsAPI, getNotificationsAPI } from '../services/api';
import { useAuth } from '../utils/AuthContext';
import ChangePasswordModal from './ChangePasswordModal';
import { SkeletonGrid } from './Skeleton';
import './UserDashboard.css';

const UserDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [unread, setUnread] = useState(0);
  const [showPwModal, setShowPwModal] = useState(false);

  useEffect(() => {
    if (!user) { navigate('/login'); return; }
    (async () => {
      try {
        const [ticketRes, notifRes] = await Promise.all([
          getMyTicketsAPI(),
          getNotificationsAPI().catch(() => ({ data: { data: { unreadCount: 0 } } }))
        ]);
        setTickets(ticketRes.data?.data || []);
        setUnread(notifRes.data?.data?.unreadCount || 0);
      } catch {}
      finally { setLoading(false); }
    })();
  }, [user, navigate]);

  if (!user) return null;

  const activeTickets = tickets.filter(t => t.status === 'waiting');
  const servedTickets = tickets.filter(t => t.status === 'served');
  const cancelledTickets = tickets.filter(t => t.status === 'cancelled');

  return (
    <div className="user-dash-page">
      <div className="ud-container">
        <div className="ud-welcome">
          <div className="ud-avatar">{user.name?.[0]?.toUpperCase() || 'U'}</div>
          <div>
            <h1>Welcome back, {user.name?.split(' ')[0] || 'User'}!</h1>
            <p className="ud-role">Role: <span>{user.role}</span> · {user.email}</p>
          </div>
        </div>

        <div className="ud-stats-grid">
          <div className="ud-stat-card">
            <div className="ud-stat-num">{activeTickets.length}</div>
            <div className="ud-stat-label">Active Bookings</div>
          </div>
          <div className="ud-stat-card">
            <div className="ud-stat-num">{servedTickets.length}</div>
            <div className="ud-stat-label">Completed</div>
          </div>
          <div className="ud-stat-card">
            <div className="ud-stat-num">{cancelledTickets.length}</div>
            <div className="ud-stat-label">Cancelled</div>
          </div>
          <div className="ud-stat-card">
            <div className="ud-stat-num">{unread}</div>
            <div className="ud-stat-label">Unread Notifications</div>
          </div>
        </div>

        <div className="ud-actions-grid">
          <button className="ud-action-btn" onClick={() => navigate('/services')}>
            <span className="ud-action-icon">🔍</span>
            <span>Browse Services</span>
          </button>
          <button className="ud-action-btn" onClick={() => navigate('/my-tickets')}>
            <span className="ud-action-icon">🎫</span>
            <span>My Tickets</span>
          </button>
          <button className="ud-action-btn" onClick={() => navigate('/queue-history')}>
            <span className="ud-action-icon">📊</span>
            <span>Queue History</span>
          </button>
          <button className="ud-action-btn" onClick={() => navigate('/organizations')}>
            <span className="ud-action-icon">🏢</span>
            <span>Organizations</span>
          </button>
          <button className="ud-action-btn" onClick={() => setShowPwModal(true)}>
            <span className="ud-action-icon">🔒</span>
            <span>Change Password</span>
          </button>
        </div>

        {loading ? <SkeletonGrid count={3} lines={2} /> : activeTickets.length > 0 && (
          <div className="ud-active-section">
            <h2>Active Bookings</h2>
            <div className="ud-ticket-grid">
              {activeTickets.slice(0, 6).map(t => (
                <div key={t._id} className="ud-ticket-card" onClick={() => navigate('/my-tickets')}>
                  <div className="ud-ticket-header">
                    <span className="ud-ticket-service">{t.service?.serviceName || 'Service'}</span>
                    <span className="ud-ticket-token">#{t.tokenNumber}</span>
                  </div>
                  <div className="ud-ticket-org">{t.service?.organizationId?.businessName || ''}</div>
                  <div className="ud-ticket-meta">{new Date(t.createdAt).toLocaleString()}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      <ChangePasswordModal isOpen={showPwModal} onClose={() => setShowPwModal(false)} />
    </div>
  );
};

export default UserDashboard;
