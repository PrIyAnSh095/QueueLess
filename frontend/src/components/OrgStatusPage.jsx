import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getMyOrgProfileAPI } from '../services/api';
import { useAuth } from '../utils/AuthContext';
import './OrgStatusPage.css';

const OrgStatusPage = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(user?.providerProfile || null);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const res = await getMyOrgProfileAPI();
        const nextProfile = res.data?.data || null;
        setProfile(nextProfile);

        if (nextProfile?.status === 'approved') {
          navigate('/service-provider', { replace: true });
        }
      } catch {
        // Keep the last known status if the refresh fails.
      }
    };

    if (user?.role === 'provider') {
      loadProfile();
    }
  }, [navigate, user?.role]);

  const status = profile?.status || 'pending';
  const isPending = status === 'pending';
  const isApproved = status === 'approved';

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="status-page">
      <div className="status-container">
        <div className={`status-card ${status}`}>
          <div className="status-icon">
            {isApproved ? '✅' : isPending ? '⏳' : '❌'}
          </div>
          <h1 className="status-title">
            {isApproved ? 'Account Approved' : isPending ? 'Account Review Pending' : 'Account Rejected'}
          </h1>
          <p className="status-message">
            {isApproved
              ? 'Your organization has been approved. Redirecting you to the dashboard now.'
              : isPending
                ? "We've received your application! Our team is currently reviewing your documents. You'll receive an email once your account is approved."
                : 'Your application has been rejected by the admin. Please contact support or review your submission details to re-apply.'}
          </p>
          
          <div className="status-info">
            <p><strong>Organization:</strong> {profile?.businessName || user?.providerProfile?.businessName || '—'}</p>
            <p><strong>Email:</strong> {user?.email}</p>
            <p><strong>Status:</strong> <span className={`badge ${status}`}>{status.toUpperCase()}</span></p>
          </div>

          <div className="status-actions">
            <button
              onClick={() => (isApproved ? navigate('/service-provider') : window.location.reload())}
              className="btn-refresh"
            >
              {isApproved ? 'Go to Dashboard' : 'Check Again'}
            </button>
            <button onClick={handleLogout} className="btn-logout-status">
              Sign Out
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrgStatusPage;
