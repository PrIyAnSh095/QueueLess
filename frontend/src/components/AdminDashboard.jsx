import React, { useEffect, useMemo, useState } from 'react';
import './AdminDashboard.css';
import { 
  getAdminDashboardDataAPI, 
  adminApproveOrgAPI, 
  adminRejectOrgAPI,
  adminSetServiceApproval 
} from "../services/api";
import { SkeletonCard, SkeletonLine, SkeletonGrid } from './Skeleton';
import { useAdminSocket } from '../utils/useSocket';
const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [dashboardData, setDashboardData] = useState(null);
  const [reviewService, setReviewService] = useState(null);

  const fetchDashboardData = async (isPolling = false) => {
    try {
      if (!isPolling) setLoading(true);
      setError("");
      const res = await getAdminDashboardDataAPI();
      setDashboardData(res.data?.data || null);
    } catch (e) {
      setError(e.response?.data?.message || "Failed to load dashboard data");
    } finally {
      if (!isPolling) setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(() => {
      fetchDashboardData(true);
    }, 30000); 

    return () => clearInterval(interval);
  }, []);

  useAdminSocket(() => {
    fetchDashboardData(true);
  });

  const stats = useMemo(() => {
    if (!dashboardData) return [];
    const { stats: s } = dashboardData;
    const allServices = dashboardData.allServices || [];
    const editRequests = allServices.filter(svc => svc.approvalStatus === 'pending_edit').length;
    
    return [
      { icon: '👥', value: String(s.totalUsers), label: 'Total Users', desc: 'Registered customers', color: 'blue' },
      { icon: '🏢', value: String(s.totalOrgs), label: 'Organizations', desc: `${s.pendingOrgs} pending`, color: 'emerald' },
      { icon: '💼', value: String(s.totalServices), label: 'Services', desc: `${s.pendingServices + editRequests} requests`, color: 'purple' },
      { icon: '🎫', value: String(s.totalTickets), label: 'Total Tickets', desc: 'Queue bookings', color: 'orange' },
    ];
  }, [dashboardData]);

  const onApproveOrg = async (id) => {
    try {
      await adminApproveOrgAPI(id);
      fetchDashboardData();
    } catch (e) {
      setError("Failed to approve organization");
    }
  };

  const onRejectOrg = async (id) => {
    try {
      await adminRejectOrgAPI(id);
      fetchDashboardData();
    } catch (e) {
      setError("Failed to reject organization");
    }
  };

  const onApproveService = async (id) => {
    try {
      await adminSetServiceApproval(id, "approved");
      setReviewService(null);
      fetchDashboardData();
    } catch (e) {
      setError("Failed to approve service");
    }
  };

  const onRejectService = async (id) => {
    try {
      await adminSetServiceApproval(id, "rejected");
      setReviewService(null);
      fetchDashboardData();
    } catch (e) {
      setError("Failed to reject service");
    }
  };

  if (loading || !dashboardData) {
    return (
      <div className="admin-dark loading-state">
        <div className="skeleton-header">
           <SkeletonLine width="300px" height="40px" />
           <SkeletonLine width="200px" height="20px" />
        </div>
        <div className="stats-grid">
           {[1,2,3,4].map(i => <SkeletonCard key={i} lines={2} />)}
        </div>
        <div className="tab-skeleton" style={{ marginTop: '2rem' }}>
           <SkeletonLine height="50px" />
           <div style={{ marginTop: '1rem' }}>
              <SkeletonGrid count={3} lines={5} />
           </div>
        </div>
      </div>
    );
  }

  const groupedData = dashboardData.groupedData || [];
  const allServices = dashboardData.allServices || [];
  const pendingOrgs = groupedData.filter(org => org.status === 'pending');
  const serviceRequests = allServices.filter(s => ['pending', 'pending_edit'].includes(s.approvalStatus));

  const formatDate = (iso) => {
    try {
      return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "2-digit" });
    } catch { return ""; }
  };

  return (
    <div className="admin-dark">
      <div className="top-bar">
        <h1>Admin Control Panel</h1>
        <span className="welcome">System Status: Active</span>
      </div>

      <div className="stats-grid">
        {stats.map((s, i) => (
          <div key={i} className="stat-card">
            <div className="stat-header">
              <div className={`stat-icon ${s.color}`}>{s.icon}</div>
            </div>
            <h2>{s.value}</h2>
            <h3>{s.label}</h3>
            <p>{s.desc}</p>
          </div>
        ))}
      </div>

      <div className="tabs">
        <button className={activeTab === 'dashboard' ? 'active' : ''} onClick={() => setActiveTab('dashboard')}>
          Dashboard
        </button>
        <button className={activeTab === 'orgs' ? 'active' : ''} onClick={() => setActiveTab('orgs')}>
          Organizations ({pendingOrgs.length} Pending)
        </button>
        <button className={activeTab === 'services' ? 'active' : ''} onClick={() => setActiveTab('services')}>
          Service Requests ({serviceRequests.length})
        </button>
        <button className={activeTab === 'queues' ? 'active' : ''} onClick={() => setActiveTab('queues')}>
          Live Queues
        </button>
      </div>

      <div className="tab-content">
        {error && <div className="error-banner">{error}</div>}

        {activeTab === 'dashboard' && (
          <div className="section">
            <h2>System Overview</h2>
            <div className="grouped-grid">
              {groupedData.map(org => (
                <div key={org._id} className="org-group-box">
                  <div className="org-header-mini">
                    <h3>{org.businessName}</h3>
                    <span className={`badge ${org.status}`}>{org.status}</span>
                  </div>
                  <div className="org-services-list">
                    {org.services?.length === 0 ? <p className="small-text">No services</p> : 
                      org.services?.map(s => (
                        <div key={s._id} className="service-mini-item">
                          <span>{s.serviceName}</span>
                          <span className="queue-count">{s.tickets?.length || 0} waiting</span>
                        </div>
                      ))
                    }
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'orgs' && (
          <div className="section">
            <h2>Organization Approvals</h2>
            <table>
              <thead>
                <tr>
                  <th>Business Name</th>
                  <th>Owner</th>
                  <th>Submitted</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {groupedData.map(org => (
                  <tr key={org._id}>
                    <td>
                      <div className="org-main-info">
                        <strong>{org.businessName}</strong>
                        {org.verificationDocument && (
                          <a href={org.verificationDocument} target="_blank" rel="noreferrer" className="doc-link">
                            View Document 📄
                          </a>
                        )}
                      </div>
                    </td>
                    <td>{org.user?.name} ({org.user?.email})</td>
                    <td>{formatDate(org.createdAt)}</td>
                    <td><span className={`badge ${org.status}`}>{org.status}</span></td>
                    <td>
                      {org.status === 'pending' && (
                        <div className="actions">
                          <button className="approve" onClick={() => onApproveOrg(org._id)}>Approve</button>
                          <button className="reject" onClick={() => onRejectOrg(org._id)}>Reject</button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'services' && (
          <div className="section">
            <h2>Service Approvals & Edits</h2>
            <table>
              <thead>
                <tr>
                  <th>Service Name</th>
                  <th>Organization</th>
                  <th>Submitted</th>
                  <th>Type</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {serviceRequests.map(s => (
                  <tr key={s._id}>
                    <td>
                      <div className="service-main-info">
                        <strong>{s.serviceName}</strong>
                        {s.approvalStatus === 'pending' && s.certificate && (
                          <a href={s.certificate} target="_blank" rel="noreferrer" className="doc-link">
                            View Cert 📄
                          </a>
                        )}
                      </div>
                    </td>
                    <td>{s.organization?.businessName || s.organizationId?.businessName}</td>
                    <td>{formatDate(s.createdAt)}</td>
                    <td>
                       <span className={`badge ${s.approvalStatus}`}>
                          {s.approvalStatus === 'pending_edit' ? 'Edit Request' : 'New Service'}
                       </span>
                    </td>
                    <td>
                      <div className="actions">
                         {s.approvalStatus === 'pending_edit' ? (
                            <button className="review-btn" onClick={() => setReviewService(s)}>Review Changes</button>
                         ) : (
                            <>
                               <button className="approve" onClick={() => onApproveService(s._id)}>Approve</button>
                               <button className="reject" onClick={() => onRejectService(s._id)}>Reject</button>
                            </>
                         )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'queues' && (
          <div className="section">
            <h2>Live Queue Monitor</h2>
            <div className="queues-container">
              {groupedData.flatMap(org => 
                org.services.filter(s => s.tickets?.length > 0 || s.queues?.some(q => q.currentServingNumber > 0)).map(s => (
                  <div key={s._id} className="queue-monitor-card">
                    <div className="qm-header">
                      <div className="qm-org-name">{org.businessName}</div>
                      <h4 className="qm-svc-name">{s.serviceName}</h4>
                    </div>
                    <div className="qm-body">
                      {s.queues?.map(q => (
                        <div key={q._id} className="qm-q-stat">
                           <div className="qm-q-name">{q.queueName}</div>
                           <div className="qm-row">
                              <span className="qm-label">Serving</span>
                              <span className="qm-value highlighted">#{q.currentServingNumber || 'None'}</span>
                           </div>
                           <div className="qm-row">
                              <span className="qm-label">Waiting</span>
                              <span className="qm-value">{s.tickets.filter(t => t.queue === q._id || t.queue?._id === q._id).length}</span>
                           </div>
                        </div>
                      ))}
                      <div className="qm-tickets-preview">
                        {s.tickets.slice(0, 3).map(t => (
                          <div key={t._id} className="qm-ticket-row">
                            <span>#{t.tokenNumber}</span>
                            <span>{t.user?.name}</span>
                          </div>
                        ))}
                        {s.tickets.length > 3 && <div className="qm-more">+{s.tickets.length - 3} more</div>}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {reviewService && (
        <div className="modal-overlay">
           <div className="review-modal">
              <div className="modal-hdr">
                 <h2>Review Service Changes</h2>
                 <button onClick={() => setReviewService(null)}><X size={20} /></button>
              </div>
              <div className="review-scroll-area">
                 <div className="comparison-grid">
                    <div className="compare-col">
                       <h3>Current (Live)</h3>
                       <div className="val-box">
                          <label>Name</label>
                          <p>{reviewService.serviceName}</p>
                       </div>
                       <div className="val-box">
                          <label>Description</label>
                          <p>{reviewService.description}</p>
                       </div>
                       <div className="val-box">
                          <label>Address</label>
                          <p>{reviewService.address || 'N/A'}</p>
                       </div>
                    </div>
                    <div className="compare-col new">
                       <h3>Proposed Changes</h3>
                       <div className="val-box">
                          <label>Name</label>
                          <p className={reviewService.serviceName !== reviewService.pendingEdit.serviceName ? 'changed' : ''}>{reviewService.pendingEdit.serviceName}</p>
                       </div>
                       <div className="val-box">
                          <label>Description</label>
                          <p className={reviewService.description !== reviewService.pendingEdit.description ? 'changed' : ''}>{reviewService.pendingEdit.description}</p>
                       </div>
                       <div className="val-box">
                          <label>Address</label>
                          <p className={reviewService.address !== reviewService.pendingEdit.address ? 'changed' : ''}>{reviewService.pendingEdit.address}</p>
                       </div>
                    </div>
                 </div>
                 <div className="proof-section">
                    <h3>Photo Proof of Change</h3>
                    <img src={reviewService.pendingEdit.photoProof} alt="Proof" className="proof-img" />
                 </div>
              </div>
              <div className="modal-actions">
                 <button className="approve" onClick={() => onApproveService(reviewService._id)}>Approve Changes</button>
                 <button className="reject" onClick={() => onRejectService(reviewService._id)}>Reject Changes</button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
