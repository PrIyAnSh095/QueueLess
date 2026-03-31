import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminGetOrganizationsAPI, adminApproveOrgAPI, adminRejectOrgAPI } from '../services/api';
import SearchBar from './SearchBar';
import { SkeletonGrid } from './Skeleton';
import { ShieldCheck, ShieldX, User, MapPin, Eye } from 'lucide-react';
import './AllServicesPage.css';

const AdminOrgList = () => {
  const navigate = useNavigate();
  const [orgs, setOrgs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, pending, approved, rejected
  const [error, setError] = useState('');

  const fetchOrgs = async () => {
    try {
      setLoading(true);
      const res = await adminGetOrganizationsAPI({ status: filter === 'all' ? undefined : filter });
      setOrgs(res.data?.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrgs();
  }, [filter]);

  const handleOrgApproval = async (id, status) => {
    try {
      if (status === 'approved') await adminApproveOrgAPI(id);
      else if (status === 'rejected') await adminRejectOrgAPI(id);
      fetchOrgs();
    } catch (err) {
      setError("Org update failed");
    }
  };

  return (
    <div className="all-services-page admin-orgs">
      <div className="asp-container">
        <div className="asp-header">
          <div className="admin-badge">ADMIN CONTROL</div>
          <h1>Organization Management</h1>
          <p>Audit and verify businesses on the QueueLess platform.</p>
        </div>

        <div className="admin-filter-bar">
          <button className={filter === 'all' ? 'active' : ''} onClick={() => setFilter('all')}>All</button>
          <button className={filter === 'pending' ? 'active' : ''} onClick={() => setFilter('pending')}>Pending</button>
          <button className={filter === 'approved' ? 'active' : ''} onClick={() => setFilter('approved')}>Approved</button>
          <button className={filter === 'rejected' ? 'active' : ''} onClick={() => setFilter('rejected')}>Rejected</button>
        </div>

        {error && <div className="error-message">{error}</div>}

        {loading ? <SkeletonGrid count={6} /> : orgs.length === 0 ? (
          <div className="asp-empty"><p>No organizations found.</p></div>
        ) : (
          <div className="asp-grid">
            {orgs.map(org => {
               const initials = org.businessName?.split(' ').slice(0,2).map(p => p[0]?.toUpperCase()).join('') || 'O';
               return (
                <div key={org._id} className={`asp-card admin-org-card ${org.status}`}>
                  <div className="admin-card-header">
                    <span className={`status-tag ${org.status}`}>{org.status}</span>
                    <button className="admin-icon-btn" onClick={() => navigate(`/organizations/${org._id}`)}><Eye size={16} /></button>
                  </div>
                  <div className="asp-card-top">
                    <div className="asp-avatar">{initials}</div>
                    <div>
                      <div className="asp-service-name">{org.businessName}</div>
                      <div className="asp-org-name"><User size={12} /> {org.user?.name || 'Owner'}</div>
                    </div>
                  </div>
                  <div className="admin-org-meta">
                     <div className="meta-item"><MapPin size={12} /> {org.address || 'No address'}</div>
                     <div className="meta-item">Status: <strong>{org.status}</strong></div>
                  </div>
                  <div className="admin-approval-btns">
                    {org.status !== 'approved' && (
                        <button className="btn-approve" onClick={() => handleOrgApproval(org._id, 'approved')}><ShieldCheck size={14} /> Verify</button>
                    )}
                    {org.status !== 'rejected' && (
                        <button className="btn-reject" onClick={() => handleOrgApproval(org._id, 'rejected')}><ShieldX size={14} /> Reject</button>
                    )}
                  </div>
                </div>
               );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminOrgList;
