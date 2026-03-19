import React, { useState, useEffect } from 'react';
import { getPendingProvidersAPI, approveProviderAPI, rejectProviderAPI } from '../services/api';
import './AdminPage.css';

const AdminPage = () => {
  const [pendingProviders, setPendingProviders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchPending = async () => {
    try {
      setLoading(true);
      const res = await getPendingProvidersAPI();
      setPendingProviders(res.data.data);
    } catch (err) {
      setError('Failed to load pending providers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPending();
  }, []);

  const handleApprove = async (id) => {
    try {
      await approveProviderAPI(id);
      setPendingProviders(pendingProviders.filter(p => p._id !== id));
    } catch (err) {
      alert('Approval failed');
    }
  };

  const handleReject = async (id) => {
    if (!window.confirm('Are you sure you want to reject this provider?')) return;
    try {
      await rejectProviderAPI(id);
      setPendingProviders(pendingProviders.filter(p => p._id !== id));
    } catch (err) {
      alert('Rejection failed');
    }
  };

  if (loading) return <div className="admin-loading">Loading admin dashboard...</div>;

  return (
    <div className="admin-dashboard-page">
      <div className="admin-container">
        <header className="admin-header">
          <h1 className="admin-title">Admin Dashboard</h1>
          <p className="admin-subtitle">Manage organization approvals and platform overview</p>
        </header>

        <div className="admin-stats-row">
          <div className="stat-card-total">
            <span className="stat-num">{pendingProviders.length}</span>
            <span className="stat-label">Pending Approvals</span>
          </div>
        </div>

        <section className="admin-section">
          <h2 className="section-title-admin">Pending Provider Requests</h2>
          {pendingProviders.length === 0 ? (
            <div className="admin-empty-state">
              <p>No pending service provider requests at the moment.</p>
            </div>
          ) : (
            <div className="provider-grid-admin">
              {pendingProviders.map(provider => (
                <div key={provider._id} className="provider-card-admin">
                  <div className="provider-info-admin">
                    <h3 className="biz-name-admin">{provider.businessName}</h3>
                    <p className="owner-name-admin">Owner: {provider.user?.name}</p>
                    <p className="email-admin">Email: {provider.user?.email}</p>
                    <p className="phone-admin">Phone: {provider.phone || provider.user?.phone}</p>
                    <p className="date-admin">Requested: {new Date(provider.createdAt).toLocaleDateString()}</p>
                  </div>
                  <div className="card-actions-admin">
                    <button className="btn-approve-admin" onClick={() => handleApprove(provider._id)}>Approve</button>
                    <button className="btn-reject-admin" onClick={() => handleReject(provider._id)}>Reject</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default AdminPage;
