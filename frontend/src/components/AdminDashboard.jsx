import React, { useEffect, useMemo, useState } from 'react';
import './AdminDashboard.css';
import { 
  adminListServices, 
  adminSetServiceApproval, 
  getAllProvidersAPI, 
  getAllBookingsAPI,
  approveProviderAPI,
  rejectProviderAPI
} from "../services/api";

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showModal, setShowModal] = useState(false);
  const [selectedCertUrl, setSelectedCertUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [services, setServices] = useState([]);
  const [organizations, setOrganizations] = useState([]);
  const [bookings, setBookings] = useState([]);

  const fetchAllData = async () => {
    try {
      setLoading(true);
      setError("");
      const [servRes, orgRes, bookRes] = await Promise.all([
        adminListServices(),
        getAllProvidersAPI(),
        getAllBookingsAPI()
      ]);
      setServices(servRes.data?.data || []);
      setOrganizations(orgRes.data?.data || []);
      setBookings(bookRes.data?.data || []);
    } catch (e) {
      setError(e.response?.data?.message || "Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  const pendingServices = useMemo(
    () => services.filter((s) => s.approvalStatus === "pending"),
    [services]
  );

  const stats = useMemo(() => {
    return [
      { icon: '💼', value: String(services.length), label: 'Total Services', desc: 'Services submitted by providers', change: '', color: 'emerald' },
      { icon: '🕐', value: String(pendingServices.length), label: 'Pending Approvals', desc: 'Services awaiting verification', change: '', color: 'emerald' },
    ];
  }, [services.length, pendingServices.length]);



  const formatDate = (iso) => {
    try {
      return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "2-digit" });
    } catch {
      return "";
    }
  };

  const statusLabel = (approvalStatus) => {
    if (approvalStatus === "approved") return "Approved";
    if (approvalStatus === "rejected") return "Rejected";
    return "Pending";
  };

  const onApproveReject = async (serviceId, nextStatus) => {
    try {
      setError("");
      await adminSetServiceApproval(serviceId, nextStatus);
      await fetchAllData();
    } catch (e) {
      setError(e.response?.data?.message || "Failed to update approval status");
    }
  };

  const onProviderApproveReject = async (providerId, nextStatus) => {
    try {
      setError("");
      if (nextStatus === "approved") {
        await approveProviderAPI(providerId);
      } else {
        await rejectProviderAPI(providerId);
      }
      await fetchAllData();
    } catch (e) {
      setError(e.response?.data?.message || "Failed to update provider status");
    }
  };

  return (
    <div className="admin-dark">
      <div className="top-bar">
        <h1>Dashboard Overview</h1>
        <span className="welcome">Welcome back, Admin</span>
      </div>

      <div className="stats-grid">
        {stats.map((s, i) => (
          <div key={i} className="stat-card">
            <div className="stat-header">
              <div className={`stat-icon ${s.color}`}>{s.icon}</div>
              {s.change ? <span className="stat-change">{s.change}</span> : <span className="stat-change" />}
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
        <button className={activeTab === 'pending' ? 'active' : ''} onClick={() => setActiveTab('pending')}>
          Pending Requests ({pendingServices.length})
        </button>
        <button className={activeTab === 'organizations' ? 'active' : ''} onClick={() => setActiveTab('organizations')}>
          Organizations
        </button>
        <button className={activeTab === 'bookings' ? 'active' : ''} onClick={() => setActiveTab('bookings')}>
          Recent Bookings
        </button>
      </div>

      <div className="tab-content">
        {error ? (
          <div className="section">
            <div className="section-header">
              <div className="header-left">
                <span className="icon">⚠️</span>
                <div>
                  <h2>Something went wrong</h2>
                  <p>{error}</p>
                </div>
              </div>
            </div>
            <button className="approve" onClick={fetchAllData} disabled={loading}>
              {loading ? "Loading..." : "Retry"}
            </button>
          </div>
        ) : null}

        {activeTab === 'dashboard' && (
          <div className="section">
            <div className="section-header">
              <div className="header-left">
                <span className="icon">📄</span>
                <div>
                  <h2>Organization Verification</h2>
                  <p>Review and approve service registration requests from organizations</p>
                </div>
              </div>
            </div>
            <table>
              <thead>
                <tr>
                  <th>Organization</th>
                  <th>Service</th>
                  <th>Certificate</th>
                  <th>Submitted</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6}><strong>Loading services...</strong></td>
                  </tr>
                ) : services.length === 0 ? (
                  <tr>
                    <td colSpan={6}><strong>No services found.</strong></td>
                  </tr>
                ) : (
                  services.map((s) => {
                    const orgName = s.organization?.name || s.organization?.email || "Unknown";
                    const label = statusLabel(s.approvalStatus);
                    return (
                      <tr key={s._id}>
                        <td><strong>{orgName}</strong></td>
                        <td>{s.serviceName}</td>
                        <td>
                          {s.certificateUrl ? (
                            <button
                              className="view-btn"
                              onClick={() => {
                                setSelectedCertUrl(`http://localhost:5000${s.certificateUrl}`);
                                setShowModal(true);
                              }}
                            >
                              👁 View
                            </button>
                          ) : (
                            <span className="no-action">No file</span>
                          )}
                        </td>
                        <td>{formatDate(s.createdAt)}</td>
                        <td>
                          <span className={`badge ${label.toLowerCase()}`}>{label}</span>
                        </td>
                        <td>
                          {s.approvalStatus === "pending" ? (
                            <div className="actions">
                              <button className="approve" onClick={() => onApproveReject(s._id, "approved")}>✓ Approve</button>
                              <button className="reject" onClick={() => onApproveReject(s._id, "rejected")}>✕ Reject</button>
                            </div>
                          ) : (
                            <span className="no-action">No actions available</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'pending' && (
          <div className="section">
            <div className="section-header">
              <div className="header-left">
                <span className="icon">⏳</span>
                <div>
                  <h2>Pending Verification Requests</h2>
                  <p>Services waiting for admin approval</p>
                </div>
              </div>
            </div>
            <table>
              <thead>
                <tr>
                  <th>Organization</th>
                  <th>Service</th>
                  <th>Certificate</th>
                  <th>Submitted</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6}><strong>Loading services...</strong></td>
                  </tr>
                ) : pendingServices.length === 0 ? (
                  <tr>
                    <td colSpan={6}><strong>No pending services.</strong></td>
                  </tr>
                ) : (
                  pendingServices.map((s) => {
                    const orgName = s.organization?.name || s.organization?.email || "Unknown";
                    return (
                      <tr key={s._id}>
                        <td><strong>{orgName}</strong></td>
                        <td>{s.serviceName}</td>
                        <td>
                          {s.certificateUrl ? (
                            <button
                              className="view-btn"
                              onClick={() => {
                                setSelectedCertUrl(`http://localhost:5000${s.certificateUrl}`);
                                setShowModal(true);
                              }}
                            >
                              👁 View
                            </button>
                          ) : (
                            <span className="no-action">No file</span>
                          )}
                        </td>
                        <td>{formatDate(s.createdAt)}</td>
                        <td><span className="badge pending">Pending</span></td>
                        <td>
                          <div className="actions">
                            <button className="approve" onClick={() => onApproveReject(s._id, "approved")}>✓ Approve</button>
                            <button className="reject" onClick={() => onApproveReject(s._id, "rejected")}>✕ Reject</button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'bookings' && (
          <div className="section">
            <div className="section-header">
              <div className="header-left">
                <span className="icon">📅</span>
                <div>
                  <h2>Recent Bookings</h2>
                  <p>Overview of the most recent service bookings on the platform</p>
                </div>
              </div>
            </div>
            <table>
              <thead>
                <tr>
                  <th>Organization</th>
                  <th>Service</th>
                  <th>User</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {bookings.map((b) => (
                  <tr key={b._id}>
                    <td><strong>{b.service?.organizationId?.businessName || "Unknown"}</strong></td>
                    <td>{b.service?.serviceName}</td>
                    <td>{b.user?.name}</td>
                    <td><span className={`badge ${b.status}`}>{b.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'organizations' && (
          <div className="section">
            <div className="section-header">
              <div className="header-left">
                <span className="icon">🏢</span>
                <div>
                  <h2>Organizations</h2>
                  <p>All registered organizations on the service booking platform</p>
                </div>
              </div>
            </div>
            <table>
              <thead>
                <tr>
                  <th>Organization</th>
                  <th>Business Name</th>
                  <th>Phone</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {organizations.map((o) => (
                  <tr key={o._id}>
                    <td><strong>{o.user?.name || "N/A"}</strong></td>
                    <td>{o.businessName}</td>
                    <td>{o.phone}</td>
                    <td><span className={`badge ${o.status}`}>{o.status}</span></td>
                    <td>
                      {o.status === "pending" ? (
                        <div className="actions">
                          <button className="approve" onClick={() => onProviderApproveReject(o._id, "approved")}>✓</button>
                          <button className="reject" onClick={() => onProviderApproveReject(o._id, "rejected")}>✕</button>
                        </div>
                      ) : (
                        <span className="no-action">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <div className="modal" onClick={() => setShowModal(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Certificate Document</h3>
              <button onClick={() => setShowModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="cert-preview">
                {selectedCertUrl ? (
                  <>
                    <p><strong>Preview</strong></p>
                    <small>{selectedCertUrl}</small>
                  </>
                ) : (
                  <>
                    📄
                    <p>No document</p>
                    <small>Upload missing</small>
                  </>
                )}
              </div>
              <div className="modal-actions">
                {selectedCertUrl ? (
                  <a className="download" href={selectedCertUrl} target="_blank" rel="noreferrer">
                    Open / Download
                  </a>
                ) : (
                  <button className="download" disabled>Download</button>
                )}
                <button className="close" onClick={() => setShowModal(false)}>Close</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
