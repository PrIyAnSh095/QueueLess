import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getPublicOrganizationAPI } from '../services/api';
import { useAuth } from '../utils/AuthContext';
import ReviewSection from './ReviewSection';
import { SkeletonCard } from './Skeleton';
import './AllServicesPage.css';

const OrganizationDetailsPage = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { navigate('/login'); return; }
    (async () => {
      try {
        const res = await getPublicOrganizationAPI(id);
        setData(res.data.data);
      } catch {}
      finally { setLoading(false); }
    })();
  }, [id, user, navigate]);

  if (!user) return null;

  if (loading) return (
    <div className="all-services-page">
      <div className="asp-container"><SkeletonCard lines={5} /></div>
    </div>
  );

  if (!data?.organization) return (
    <div className="all-services-page">
      <div className="asp-container">
        <div className="asp-empty"><p>Organization not found.</p></div>
      </div>
    </div>
  );

  const org = data.organization;
  const services = data.services || [];
  const initials = org.businessName?.split(' ').filter(Boolean).slice(0,2).map(p => p[0]?.toUpperCase()).join('') || 'O';

  return (
    <div className="all-services-page">
      <div className="asp-container">
        <button className="asp-book-btn" style={{width:'auto',marginBottom:20}} onClick={() => navigate(-1)}>← Back</button>

        <div className="asp-card" style={{cursor:'default',marginBottom:28}}>
          <div className="asp-card-top">
            <div className="asp-avatar" style={{width:56,height:56,fontSize:20}}>{initials}</div>
            <div>
              <div className="asp-service-name" style={{fontSize:24}}>{org.businessName}</div>
              <div className="asp-org-name">{org.user?.name || 'Owner'} · {org.user?.email || ''}</div>
            </div>
          </div>
          {org.description && <p className="asp-desc">{org.description}</p>}
          {org.address && <p className="asp-meta">📍 {org.address}</p>}
          {org.phone && <p className="asp-meta">📞 {org.phone}</p>}
        </div>

        <h2 style={{color:'#f1f5f9',marginBottom:20}}>Services ({services.length})</h2>
        {services.length === 0 ? (
          <div className="asp-empty"><p>No services available from this organization.</p></div>
        ) : (
          <div className="asp-grid">
            {services.map(s => (
              <div key={s._id} className="asp-card" onClick={() => navigate(`/service-details/${s._id}`)}>
                <div className="asp-service-name" style={{marginBottom:8}}>{s.serviceName}</div>
                <p className="asp-desc">{s.description || 'Book a slot for this service.'}</p>
                <div className="asp-meta">
                  {s.duration ? `${s.duration} min` : ''} {s.maxTokens ? `· Up to ${s.maxTokens} tokens` : ''}
                </div>
                <button className="asp-book-btn">Book Slot →</button>
              </div>
            ))}
          </div>
        )}

        <ReviewSection targetType="organization" targetId={id} />
      </div>
    </div>
  );
};

export default OrganizationDetailsPage;
