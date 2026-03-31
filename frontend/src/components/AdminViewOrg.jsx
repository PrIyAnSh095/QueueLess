import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getPublicOrganizationAPI, adminApproveOrgAPI, adminRejectOrgAPI, adminGetUsersAPI } from '../services/api';
import { ChevronLeft, ShieldCheck, ShieldAlert, User, Mail, Phone, MapPin, Search } from 'lucide-react';
import './AllServicesPage.css';

const AdminViewOrg = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchOrg = async () => {
    try {
      setLoading(true);
      const res = await getPublicOrganizationAPI(id);
      setData(res.data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrg();
  }, [id]);

  const handleApproval = async (status) => {
    try {
      if (status === 'approved') await adminApproveOrgAPI(id);
      else if (status === 'rejected') await adminRejectOrgAPI(id);
      fetchOrg();
    } catch (err) {
      alert("Status update failed");
    }
  };

  if (loading || !data?.organization) return <div className="loading-state">Loading Audit View...</div>;

  const org = data.organization;
  const services = data.services || [];
  const initials = org.businessName?.split(' ').slice(0,2).map(p => p[0]?.toUpperCase()).join('') || 'O';

  return (
    <div className="all-services-page admin-view">
      <div className="asp-container">
        <button className="asp-book-btn" style={{width:'auto',marginBottom:20}} onClick={() => navigate(-1)}>← Back</button>

        <div className="sd-hero admin-hero shadow-lg">
          <div className="sd-avatar-header">
            <div className="asp-avatar" style={{width:80,height:80,fontSize:32}}>{initials}</div>
            <div className="admin-status-cluster">
               <span className={`status-pill ${org.status}`}>{org.status}</span>
               <div className="admin-badge">AUDIT MODE</div>
            </div>
          </div>
          <div className="sd-hero-text">
            <h1 className="sd-hero-title" style={{fontSize: '2.5rem'}}>{org.businessName}</h1>
            <div className="admin-meta-row">
               <span className="meta-item"><User size={14} /> {org.user?.name}</span>
               <span className="meta-item"><Mail size={14} /> {org.user?.email}</span>
            </div>
          </div>
        </div>

        <div className="details-grid">
           <div className="sd-left-column">
              <section className="sd-panel">
                 <h2 className="sd-panel-title">Business Profile</h2>
                 <p className="sd-panel-body">{org.description || 'No description provided.'}</p>
                 <div className="admin-payload-grid" style={{marginTop: 20}}>
                     <div className="payload-item">
                        <span className="label"><MapPin size={14} /> Address</span>
                        <span className="val">{org.address || 'N/A'}</span>
                     </div>
                     <div className="payload-item">
                        <span className="label"><Phone size={14} /> Phone</span>
                        <span className="val">{org.phone || 'N/A'}</span>
                     </div>
                 </div>
              </section>

              <section className="sd-panel">
                 <h2 className="sd-panel-title">Verification Documents</h2>
                 <div className="admin-doc-preview">
                    {org.verificationDoc ? (
                       <a href={org.verificationDoc} target="_blank" rel="noreferrer" className="btn-view-doc">View Document <Search size={14} /></a>
                    ) : (
                       <p className="role-warning" style={{margin:0}}>No verification document uploaded.</p>
                    )}
                 </div>
              </section>
           </div>

           <div className="interaction-section">
              <div className="admin-actions-card bg-slate-800">
                 <h3>KYC Controls</h3>
                 <p className="admin-hint">Update the organizational status based on manual audit of documents.</p>
                 <div className="admin-btn-group">
                    {org.status !== 'approved' && (
                        <button className="btn-admin-approve" onClick={() => handleApproval('approved')}>Verify & Approve</button>
                    )}
                    {org.status !== 'rejected' && (
                        <button className="btn-admin-reject" onClick={() => handleApproval('rejected')}>Reject / Flag</button>
                    )}
                 </div>
              </div>

              <div className="admin-stats-card">
                 <h3>System Discovery</h3>
                 <div className="admin-mini-stats">
                    <div className="mini-stat">
                       <span>Total Services</span>
                       <strong>{services.length}</strong>
                    </div>
                    <div className="mini-stat">
                       <span>Org ID</span>
                       <code style={{fontSize: 10}}>{id}</code>
                    </div>
                 </div>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};

export default AdminViewOrg;
