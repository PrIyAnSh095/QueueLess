import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  getServiceById, 
  getOrgStatsAPI,
  updateServiceAPI,
  deleteServiceAPI
} from '../services/api';
import { 
  ChevronLeft, 
  Settings, 
  Users, 
  LayoutGrid, 
  BarChart, 
  Edit, 
  Trash2, 
  ToggleLeft,
  ToggleRight,
  TrendingUp,
  AlertCircle,
  History
} from 'lucide-react';
import './ServiceDetailsPage.css'; // Reusing base styles

const ProviderViewService = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [service, setService] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const res = await getServiceById(id);
        setService(res.data.data);
        
        // Fetch some stats
        const statsRes = await getOrgStatsAPI();
        setStats(statsRes.data.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  const toggleStatus = async () => {
    try {
      const newStatus = !service.status;
      await updateServiceAPI(id, { status: String(newStatus) });
      setService(prev => ({ ...prev, status: newStatus }));
    } catch (err) {
      alert("Failed to toggle status");
    }
  };

  if (loading || !service) return <div className="loading-state">Loading Provider View...</div>;

  return (
    <div className="service-details-page provider-view">
      <div className="details-container">
        <button className="sd-back-btn" onClick={() => navigate(-1)}><ChevronLeft size={18} /> Back to Dashboard</button>

        <div className="sd-hero provider-hero">
          <div className="sd-hero-text">
            <div className="provider-badge">SERVICE OWNER</div>
            <h1 className="sd-hero-title">{service.serviceName}</h1>
            <p className="sd-hero-sub">Managed by: {service.organizationId?.businessName}</p>
          </div>
          <div className="provider-hdr-actions">
            <button className="btn-provider-edit" onClick={() => navigate(`/service-provider/create-service?edit=${id}`)}>
              <Edit size={16} /> Edit
            </button>
            <button className="btn-provider-delete">
              <Trash2 size={16} /> Delete
            </button>
          </div>
        </div>

        <div className="details-grid">
          <div className="sd-left-column">
            <section className="sd-panel">
              <h2 className="sd-panel-title">Service Config</h2>
              <div className="provider-config-row">
                 <div className="config-item">
                    <span>Visibility:</span>
                    <strong>{service.status ? 'LIVE' : 'OFFLINE'}</strong>
                 </div>
                 <div className="config-item">
                    <span>Approval:</span>
                    <strong>{service.approvalStatus?.toUpperCase()}</strong>
                 </div>
                 <button className={`toggle-vis ${service.status ? 'on' : 'off'}`} onClick={toggleStatus}>
                    {service.status ? <ToggleRight size={24} color="#8b5cf6" /> : <ToggleLeft size={24} color="#64748b" />}
                 </button>
              </div>
              <p className="sd-panel-body" style={{marginTop: '1rem'}}>{service.description}</p>
            </section>

            <div className="provider-metrics-grid">
               <div className="metric-pill">
                  <Users size={20} />
                  <div className="metric-text">
                     <strong>{stats?.waiting || 0}</strong>
                     <span>Waiting</span>
                  </div>
               </div>
               <div className="metric-pill">
                  <TrendingUp size={20} />
                  <div className="metric-text">
                     <strong>{stats?.served || 0}</strong>
                     <span>Served</span>
                  </div>
               </div>
               <div className="metric-pill">
                  <BarChart size={20} />
                  <div className="metric-text">
                     <strong>{stats?.avgWaitTime || 0}m</strong>
                     <span>Avg Wait</span>
                  </div>
               </div>
            </div>

            <section className="sd-panel">
              <h2 className="sd-panel-title">Assigned Handlers</h2>
              <div className="provider-queues-list">
                {service.queues?.map(q => (
                  <div key={q._id} className="provider-queue-card">
                    <div className="pq-name">{q.queueName}</div>
                    <div className="pq-details">
                       <span>{q.avgServiceTime}m/person</span>
                       <span>Current: #{q.currentServingNumber}</span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>

          <div className="interaction-section">
            <div className="provider-quick-card">
              <h3>Real-Time Control</h3>
              <p className="admin-hint">Quick actions for this specific service and its active tokens.</p>
              
              <div className="admin-btn-group">
                <button className="btn-admin-approve" onClick={() => navigate('/service-provider/manage-queues')}>
                  <LayoutGrid size={18} /> Control Center
                </button>
                <button className="btn-admin-reject" onClick={() => navigate('/service-provider/counters')}>
                  <Users size={18} /> Manage Counters
                </button>
                <button className="btn-admin-flag" onClick={() => navigate('/history')}>
                  <History size={18} /> Full History
                </button>
                <div className="divider-admin" />
                <button className="btn-admin-delete" style={{color: '#94a3b8', border: '1px solid #334155'}}>
                  <Settings size={18} /> Advanced Setup
                </button>
              </div>
            </div>

            <div className="provider-alerts-card">
               <h3><AlertCircle size={18} /> System Status</h3>
               <p className="admin-hint">Service health: {service.approvalStatus === 'approved' ? 'Stable' : 'Pending Review'}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProviderViewService;
