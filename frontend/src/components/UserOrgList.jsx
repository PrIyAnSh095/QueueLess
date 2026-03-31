import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getPublicOrganizationsAPI } from '../services/api';
import { useAuth } from '../utils/AuthContext';
import SearchBar from './SearchBar';
import { SkeletonGrid } from './Skeleton';
import './AllServicesPage.css';

const AllOrganizationsPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [orgs, setOrgs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { navigate('/login'); return; }
    if (user.role === 'provider') { navigate('/service-provider'); return; }
    (async () => {
      try {
        const res = await getPublicOrganizationsAPI();
        setOrgs(res.data?.data || []);
      } catch {}
      finally { setLoading(false); }
    })();
  }, [user, navigate]);

  if (!user) return null;

  return (
    <div className="all-services-page">
      <div className="asp-container">
        <div className="asp-header">
          <h1>All Organizations</h1>
          <p>Browse all approved organizations on QueueLess</p>
        </div>
        <div className="asp-search-row">
          <SearchBar placeholder="Search organizations..." />
        </div>
        {loading ? <SkeletonGrid count={6} /> : orgs.length === 0 ? (
          <div className="asp-empty"><p>No approved organizations yet.</p></div>
        ) : (
          <div className="asp-grid">
            {orgs.map(org => {
              const initials = (org.businessName || 'Organization').split(' ').filter(Boolean).slice(0,2).map(p => p[0]?.toUpperCase()).join('') || 'O';
              return (
                <div key={org._id} className="asp-card" onClick={() => navigate(`/organizations/${org._id}`)}>
                  <div className="asp-card-top">
                    <div className="asp-avatar">{initials}</div>
                    <div>
                      <div className="asp-service-name">{org.businessName}</div>
                      <div className="asp-org-name">{org.user?.name || 'Owner'}</div>
                    </div>
                  </div>
                  <p className="asp-desc">{org.description || org.address || 'View services from this organization.'}</p>
                  <div className="asp-meta">
                    Status: <span style={{color:'#22c55e',fontWeight:600}}>{org.status}</span>
                  </div>
                  <button className="asp-book-btn">View Services →</button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default AllOrganizationsPage;
