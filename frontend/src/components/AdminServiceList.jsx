import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminListServices, adminSetServiceApproval } from '../services/api';
import SearchBar from './SearchBar';
import { SkeletonGrid } from './Skeleton';
import { CheckCircle, XCircle, AlertCircle, Eye, ShieldCheck } from 'lucide-react';
import './AllServicesPage.css'; // Consistent grid styles

const AdminServiceList = () => {
  const navigate = useNavigate();
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, pending, approved, rejected

  const fetchServices = async () => {
    try {
      setLoading(true);
      const res = await adminListServices();
      setServices(res.data?.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchServices();
  }, []);

  const handleApproval = async (id, status) => {
    try {
      await adminSetServiceApproval(id, status);
      fetchServices();
    } catch (err) {
      alert("Status update failed");
    }
  };

  const filteredServices = services.filter(s => {
    if (filter === 'all') return true;
    return s.approvalStatus === filter;
  });

  return (
    <div className="all-services-page admin-services">
      <div className="asp-container">
        <div className="asp-header">
          <div className="admin-badge">ADMIN CONTROL</div>
          <h1>Service Moderation</h1>
          <p>Review and audit service offerings across the platform.</p>
        </div>

        <div className="admin-filter-bar">
          <button className={filter === 'all' ? 'active' : ''} onClick={() => setFilter('all')}>All</button>
          <button className={filter === 'pending' ? 'active' : ''} onClick={() => setFilter('pending')}>Pending</button>
          <button className={filter === 'approved' ? 'active' : ''} onClick={() => setFilter('approved')}>Approved</button>
          <button className={filter === 'rejected' ? 'active' : ''} onClick={() => setFilter('rejected')}>Rejected</button>
        </div>

        {loading ? <SkeletonGrid count={8} /> : filteredServices.length === 0 ? (
          <div className="asp-empty">
            <p>No services match the current filter.</p>
          </div>
        ) : (
          <div className="asp-grid">
            {filteredServices.map(item => (
              <div key={item._id} className={`asp-card admin-card ${item.approvalStatus}`}>
                <div className="admin-card-header">
                  <span className={`status-tag ${item.approvalStatus}`}>{item.approvalStatus}</span>
                  <div className="admin-card-actions">
                    <button className="admin-icon-btn" onClick={() => navigate(`/service-details/${item._id}`)} title="View Details"><Eye size={16} /></button>
                  </div>
                </div>
                <div className="asp-card-top">
                   <div>
                      <div className="asp-org-name">{item.organizationName || 'N/A'}</div>
                      <div className="asp-service-name">{item.serviceName}</div>
                   </div>
                </div>
                <p className="asp-desc">{item.description}</p>
                <div className="admin-approval-btns">
                   {item.approvalStatus !== 'approved' && (
                     <button className="btn-approve" onClick={() => handleApproval(item._id, 'approved')}><CheckCircle size={14} /> Approve</button>
                   )}
                   {item.approvalStatus !== 'rejected' && (
                     <button className="btn-reject" onClick={() => handleApproval(item._id, 'rejected')}><XCircle size={14} /> Reject</button>
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

export default AdminServiceList;
