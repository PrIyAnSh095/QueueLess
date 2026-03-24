import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getMyTicketsAPI, reportDelayAPI } from '../services/api';
import { useAuth } from '../utils/AuthContext';
import { SkeletonGrid } from './Skeleton';
import './QueueHistoryPage.css';

const QueueHistoryPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    if (!user) { navigate('/login'); return; }
    (async () => {
      try {
        const res = await getMyTicketsAPI();
        setTickets(res.data?.data || []);
      } catch {}
      finally { setLoading(false); }
    })();
  }, [user, navigate]);

  const handleReportDelay = async (ticketId) => {
    if (!window.confirm('Report a delay for this booking? The organization will be flagged for review.')) return;
    try {
      await reportDelayAPI(ticketId);
      alert('Delay reported successfully.');
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to report delay');
    }
  };

  if (!user) return null;

  const filteredTickets = filter === 'all' ? tickets : tickets.filter(t => t.status === filter);

  const statusColors = { waiting: '#f59e0b', served: '#22c55e', cancelled: '#ef4444' };

  return (
    <div className="qh-page">
      <div className="qh-container">
        <div className="qh-header">
          <h1>Queue History</h1>
          <p>View all your past and current queue activity</p>
        </div>

        <div className="qh-filters">
          {['all', 'waiting', 'served', 'cancelled'].map(f => (
            <button
              key={f}
              className={`qh-filter-btn ${filter === f ? 'active' : ''}`}
              onClick={() => setFilter(f)}
            >
              {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>

        {loading ? <SkeletonGrid count={6} lines={2} /> : filteredTickets.length === 0 ? (
          <div className="qh-empty">
            <p>No {filter !== 'all' ? filter : ''} tickets found.</p>
          </div>
        ) : (
          <div className="qh-list">
            {filteredTickets.map(t => (
              <div key={t._id} className="qh-item">
                <div className="qh-item-left">
                  <div className="qh-item-token" style={{background: statusColors[t.status] || '#64748b'}}>
                    #{t.tokenNumber}
                  </div>
                  <div>
                    <div className="qh-item-service">{t.service?.serviceName || 'Service'}</div>
                    <div className="qh-item-org">{t.service?.organizationId?.businessName || ''}</div>
                  </div>
                </div>
                <div className="qh-item-right">
                  <span className="qh-item-status" style={{color: statusColors[t.status]}}>{t.status}</span>
                  <span className="qh-item-date">{new Date(t.createdAt).toLocaleDateString()}</span>
                  {t.status === 'served' && (
                    <button className="qh-delay-btn" onClick={() => handleReportDelay(t._id)}>Report Delay</button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default QueueHistoryPage;
