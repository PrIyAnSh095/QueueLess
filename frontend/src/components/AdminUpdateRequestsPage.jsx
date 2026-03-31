import React, { useEffect, useState } from 'react';
import {
  adminGetUpdateRequestsAPI,
  adminApproveOrgAPI,
  adminRejectOrgAPI,
  adminApproveAddressAPI,
  adminRejectAddressAPI,
  adminSetServiceApproval
} from '../services/api';
import './AllServicesPage.css';

const AdminUpdateRequestsPage = () => {
  const [pendingOrgs, setPendingOrgs] = useState([]);
  const [pendingServices, setPendingServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const reload = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await adminGetUpdateRequestsAPI();
      setPendingOrgs(res.data?.data?.pendingOrgs || []);
      setPendingServices(res.data?.data?.pendingServices || []);
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to fetch update requests');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    reload();
  }, []);

  const handleOrgDecision = async (orgId, action, isAddressChange = false) => {
    try {
      setLoading(true);
      if (action === 'approve') {
        if (isAddressChange) await adminApproveAddressAPI(orgId);
        else await adminApproveOrgAPI(orgId);
      } else {
        if (isAddressChange) await adminRejectAddressAPI(orgId);
        else await adminRejectOrgAPI(orgId);
      }
      await reload();
    } catch (e) {
      setError(e.response?.data?.message || 'Operation failed');
      setLoading(false);
    }
  };

  const handleServiceDecision = async (serviceId, decision) => {
    try {
      setLoading(true);
      await adminSetServiceApproval(serviceId, decision);
      await reload();
    } catch (e) {
      setError(e.response?.data?.message || 'Operation failed');
      setLoading(false);
    }
  };

  return (
    <div className="all-services-page admin-orgs">
      <div className="asp-container">
        <div className="asp-header">
          <div className="admin-badge">ADMIN CONTROL</div>
          <h1>Pending Update & Approval Requests</h1>
          <p>
            Review all pending organization verification and service edit approvals on one management page.
          </p>
        </div>

        {error && <div className="error-message">{error}</div>}

        {loading ? (
          <div className="asp-empty"><p>Loading requests...</p></div>
        ) : (
          <>
            <section className="section" style={{ marginBottom: '1.5rem' }}>
              <h2>Organization Update Requests</h2>
              {pendingOrgs.length === 0 ? (
                <p>No organizations require review at the moment.</p>
              ) : (
                <div className="asp-grid">
                  {pendingOrgs.map(org => (
                    <div key={org._id} className="asp-card admin-org-card">
                      <div className="admin-card-header">
                        <span className={`status-tag ${org.status || (org.pendingEdit ? 'pending_edit' : 'pending')}`}>
                          {org.status === 'pending' ? 'Pending Approval' : org.status === 'approved' ? 'Approved' : 'Rejected'}
                          {org.pendingEdit ? ' / Address Update Requested' : ''}
                        </span>
                      </div>
                      <div className="asp-card-top">
                        <div className="asp-avatar">{(org.businessName || 'O').split(' ').slice(0,2).map(word=>word[0]?.toUpperCase()).join('')}</div>
                        <div>
                          <div className="asp-service-name">{org.businessName}</div>
                          <div className="asp-org-name">{org.user?.name || org.user?.email || 'Unknown'}</div>
                        </div>
                      </div>
                      <p className="asp-desc">{org.address || 'No address provided'}</p>
                      {org.verificationDocument && (
                        <a href={org.verificationDocument} target="_blank" rel="noreferrer" className="btn-view-doc">
                          View verification document
                        </a>
                      )}
                      {org.pendingEdit && (
                        <p className="asp-meta"><strong>Requested address:</strong> {org.pendingEdit.address || 'Not set'}</p>
                      )}
                      <div className="admin-approval-btns">
                        {org.status === 'pending' && (
                          <>
                            <button className="btn-approve" onClick={() => handleOrgDecision(org._id, 'approve')}>
                              Approve
                            </button>
                            <button className="btn-reject" onClick={() => handleOrgDecision(org._id, 'reject')}>
                              Reject
                            </button>
                          </>
                        )}
                        {org.pendingEdit && (
                          <>
                            <button className="btn-approve" onClick={() => handleOrgDecision(org._id, 'approve', true)}>
                              Approve Address Update
                            </button>
                            <button className="btn-reject" onClick={() => handleOrgDecision(org._id, 'reject', true)}>
                              Reject Address Update
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="section">
              <h2>Service Edit Requests</h2>
              {pendingServices.length === 0 ? (
                <p>No service edits or submissions pending at the moment.</p>
              ) : (
                <div className="asp-grid">
                  {pendingServices.map(service => (
                    <div key={service._id} className="asp-card admin-card">
                      <div className="admin-card-header">
                        <span className={`status-tag ${service.approvalStatus}`}>{service.approvalStatus}</span>
                      </div>
                      <div className="asp-card-top">
                        <div className="asp-avatar">{(service.organization?.businessName || 'S').split(' ').slice(0,2).map(word=>word[0]?.toUpperCase()).join('')}</div>
                        <div>
                          <div className="asp-org-name">{service.organization?.businessName || 'Organization'}</div>
                          <div className="asp-service-name">{service.serviceName}</div>
                        </div>
                      </div>
                      <p className="asp-desc">{service.description || 'Service details pending approval'}</p>
                      {service.certificateUrl && (
                        <a href={service.certificateUrl} target="_blank" rel="noreferrer" className="btn-view-doc">
                          View certificate
                        </a>
                      )}
                      {service.pendingEdit && service.pendingEdit.photoProof && (
                        <a href={service.pendingEdit.photoProof} target="_blank" rel="noreferrer" className="btn-view-doc" style={{ marginTop: '0.8rem' }}>
                          View edit proof
                        </a>
                      )}
                      <div className="admin-approval-btns">
                        <button className="btn-approve" onClick={() => handleServiceDecision(service._id, 'approved')}>
                          Approve
                        </button>
                        <button className="btn-reject" onClick={() => handleServiceDecision(service._id, 'rejected')}>
                          Reject
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </div>
  );
};

export default AdminUpdateRequestsPage;
