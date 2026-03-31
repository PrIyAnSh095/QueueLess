import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getServices } from '../services/api';
import { useAuth } from '../utils/AuthContext';
import SearchBar from './SearchBar';
import { SkeletonGrid } from './Skeleton';
import './AllServicesPage.css';

const AllServicesPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { navigate('/login'); return; }
    if (user.role === 'provider') { navigate('/service-provider'); return; }
    (async () => {
      try {
        const res = await getServices();
        setServices(res.data?.data || []);
      } catch {}
      finally { setLoading(false); }
    })();
  }, [user, navigate]);

  if (!user) return null;

  return (
    <div className="all-services-page">
      <div className="asp-container">
        <div className="asp-header">
          <h1>All Services</h1>
          <p>Browse all available services from verified organizations</p>
        </div>
        <div className="asp-search-row">
          <SearchBar placeholder="Search services..." />
        </div>
        {loading ? <SkeletonGrid count={8} /> : services.length === 0 ? (
          <div className="asp-empty">
            <p>No approved services available yet.</p>
          </div>
        ) : (
          <div className="asp-grid">
            {services.map(item => {
              const orgName = item.organizationName || 'Organization';
              const initials = orgName.split(' ').filter(Boolean).slice(0,2).map(p => p[0]?.toUpperCase()).join('');
              return (
                <div key={item._id} className="asp-card" onClick={() => navigate(`/service-details/${item._id}`)}>
                  <div className="asp-card-top">
                    <div className="asp-avatar">{initials}</div>
                    <div>
                      <div className="asp-org-name">{orgName}</div>
                      <div className="asp-service-name">{item.serviceName}</div>
                    </div>
                  </div>
                  <p className="asp-desc">{item.description || 'Book a slot for this service.'}</p>
                  <div className="asp-meta">
                    {item.duration ? `${item.duration} min` : ''} {item.maxTokens ? `· Up to ${item.maxTokens} tokens` : ''}
                  </div>
                  <button className="asp-book-btn">Book Slot →</button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default AllServicesPage;
