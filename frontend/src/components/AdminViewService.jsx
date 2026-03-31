import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  getServiceById, 
  adminSetServiceApproval, 
  getReviewsAPI,
  getOrgHistoryAPI
} from '../services/api';
import { 
  ChevronLeft, 
  ShieldCheck, 
  ShieldAlert, 
  History, 
  BarChart3, 
  Trash2,
  AlertTriangle,
  CheckCircle2,
  Clock
} from 'lucide-react';
import './ServiceDetailsPage.css'; // Reusing base styles but with admin variants

const AdminViewService = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [service, setService] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [history, setHistory] = useState([]);

  useEffect(() => {
    fetchService();
  }, [id]);

  const fetchService = async () => {
    try {
      setLoading(true);
      const res = await getServiceById(id);
      setService(res.data.data);
      
      // Fetch some history for context
      const histRes = await getOrgHistoryAPI({ serviceId: id, limit: 10 });
      setHistory(histRes.data.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleApproval = async (status) => {
    try {
      setUpdating(true);
      await adminSetServiceApproval(id, status);
      await fetchService();
    } catch (err) {
      alert("Failed to update status");
    } finally {
      setUpdating(false);
    }
  };

  if (loading || !service) return <div className="loading-state">Loading Management View...</div>;

  return (
    <div className="service-details-page admin-view">
      <div className="details-container">
        <button className="sd-back-btn" onClick={() => navigate(-1)}><ChevronLeft size={18} /> Back to Audit</button>

        <div className="sd-hero admin-hero">
          <div className="sd-hero-text">
            <div className="admin-badge">ADMIN MODERATOR</div>
            <h1 className="sd-hero-title">{service.serviceName}</h1>
            <p className="sd-hero-sub">Managed by: {service.organizationId?.businessName} ({service.organizationId?.user?.email})</p>
          </div>
          <div className="status-indicator">
            <span className={`status-pill ${service.approvalStatus}`}>
              {service.approvalStatus === 'approved' ? <ShieldCheck size={14} /> : <ShieldAlert size={14} />}
              {service.approvalStatus?.toUpperCase()}
            </span>
          </div>
        </div>

        <div className="details-grid">
          <div className="sd-left-column">
            <section className="sd-panel">
              <h2 className="sd-panel-title">Service Payload</h2>
              <div className="admin-payload-grid">
                <div className="payload-item">
                  <span className="label">Category:</span>
                  <span className="val">{service.category}</span>
                </div>
                <div className="payload-item">
                  <span className="label">Queues:</span>
                  <span className="val">{service.queues?.length || 0} active handlers</span>
                </div>
                <div className="payload-item">
                  <span className="label">Created:</span>
                  <span className="val">{new Date(service.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
              <p className="sd-panel-body" style={{marginTop: '1rem'}}>{service.description}</p>
            </section>

            <section className="sd-panel">
              <h2 className="sd-panel-title"><History size={18} /> Recent Audit Log</h2>
              <div className="admin-history-list">
                {history.length > 0 ? history.map(h => (
                  <div key={h._id} className="admin-history-item">
                    <Clock size={14} />
                    <span>Token #{h.tokenNumber} - {h.status} - {new Date(h.joinTime).toLocaleString()}</span>
                  </div>
                )) : <p>No recent activity logs.</p>}
              </div>
            </section>
          </div>

          <div className="interaction-section">
            <div className="admin-actions-card">
              <h3>Moderation Controls</h3>
              <p className="admin-hint">Update the visibility and approval status of this service across the platform.</p>
              
              <div className="admin-btn-group">
                {service.approvalStatus !== 'approved' && (
                  <button 
                    className="btn-admin-approve" 
                    onClick={() => handleApproval('approved')}
                    disabled={updating}
                  >
                    <CheckCircle2 size={18} /> Approve Service
                  </button>
                )}
                {service.approvalStatus !== 'rejected' && (
                  <button 
                    className="btn-admin-reject" 
                    onClick={() => handleApproval('rejected')}
                    disabled={updating}
                  >
                    <ShieldAlert size={18} /> Reject/Sustain
                  </button>
                )}
                <button className="btn-admin-flag" disabled={updating}>
                  <AlertTriangle size={18} /> Flag for Review
                </button>
                <div className="divider-admin" />
                <button className="btn-admin-delete">
                  <Trash2 size={18} /> Permanently Remove
                </button>
              </div>
            </div>

            <div className="admin-stats-card">
               <h3><BarChart3 size={18} /> Quick Metrics</h3>
               <div className="admin-mini-stats">
                  <div className="mini-stat">
                    <span>Total Served</span>
                    <strong>124</strong>
                  </div>
                  <div className="mini-stat">
                    <span>Cancellations</span>
                    <strong>12%</strong>
                  </div>
               </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminViewService;
