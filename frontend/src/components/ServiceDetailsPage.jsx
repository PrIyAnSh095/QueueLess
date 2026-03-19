import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getServiceById, joinQueueAPI, getQueuePositionAPI } from '../services/api';
import { useAuth } from '../utils/AuthContext';
import './ServiceDetailsPage.css';

const ServiceDetailsPage = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [service, setService] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [queueData, setQueueData] = useState(null);
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [serviceRes, queueRes] = await Promise.all([
          getServiceById(id),
          user ? getQueuePositionAPI(id) : Promise.resolve({ data: { data: { inQueue: false } } })
        ]);
        
        setService(serviceRes.data.data);
        if (queueRes.data.success) {
          setQueueData(queueRes.data.data);
        }
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load service details');
      } finally {
        setLoading(false);
      }
    };

    if (id) fetchData();
  }, [id, user]);

  const handleJoinQueue = async () => {
    if (!user) {
      navigate('/login', { state: { from: `/service-details/${id}` } });
      return;
    }

    try {
      setJoining(true);
      setError('');
      
      // Get user location
      let userLocation = null;
      if ("geolocation" in navigator) {
        try {
          const position = await new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject);
          });
          userLocation = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
        } catch (err) {
          console.warn("Geolocation failed", err);
        }
      }

      const res = await joinQueueAPI(id, userLocation);
      if (res.data.success) {
        // Refresh queue position
        const posRes = await getQueuePositionAPI(id);
        setQueueData(posRes.data.data);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to join queue');
    } finally {
      setJoining(false);
    }
  };

  if (loading) return <div className="loading-state">Loading service details...</div>;
  if (!service) return <div className="error-state">Service not found</div>;

  return (
    <div className="service-details-page">
      <div className="details-container">
        <div className="service-header-card">
          <div className="header-flex">
            <div className="service-main-info">
              <span className="category-tag">Service</span>
              <h1 className="service-name-title">{service.serviceName}</h1>
              <p className="org-name-sub">by {service.organizationId?.businessName}</p>
            </div>
            <div className={`status-badge ${service.status ? 'active' : 'inactive'}`}>
              {service.status ? '● Open Now' : '○ Closed'}
            </div>
          </div>
          
          <div className="service-meta-grid">
            <div className="meta-item">
              <span className="meta-icon">⏱</span>
              <div className="meta-txt">
                <span className="meta-label">Avg Time</span>
                <span className="meta-val">{service.avgServiceTime} mins</span>
              </div>
            </div>
            <div className="meta-item">
              <span className="meta-icon">📍</span>
              <div className="meta-txt">
                <span className="meta-label">Location</span>
                <span className="meta-val">{service.organizationId?.businessName}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="details-grid">
          <div className="info-section">
            <h2 className="section-title-sd">Description</h2>
            <p className="description-text-sd">
              {service.description || 'No description provided for this service.'}
            </p>

            <div className="contact-info-sd">
              <h3 className="section-subtitle-sd">Contact Details</h3>
              <p>📞 {service.organizationId?.phone || 'N/A'}</p>
              <p>🏢 {service.organizationId?.address || 'N/A'}</p>
            </div>
          </div>

          <div className="interaction-section">
            {error && <div className="error-banner-sd">{error}</div>}
            
            <div className="queue-action-card">
              {queueData?.inQueue ? (
                <div className="in-queue-status">
                  <div className="position-circle">
                    <span className="pos-label">Your Position</span>
                    <span className="pos-num">#{queueData.position}</span>
                  </div>
                  <div className="eta-info-sd">
                    <p className="eta-main">Estimated Wait: {queueData.etaMinutes} mins</p>
                    <p className="eta-sub">Ahead of you: {queueData.aheadCount} people</p>
                  </div>
                  <button className="btn-my-tickets-sd" onClick={() => navigate('/my-tickets')}>
                    View My Ticket
                  </button>
                </div>
              ) : (
                <>
                  <h3 className="card-title-sd">Ready to join?</h3>
                  <p className="card-desc-sd">
                    Secure your spot in the queue. We'll track your position in real-time.
                  </p>
                  <button 
                    className="btn-join-queue" 
                    onClick={handleJoinQueue}
                    disabled={joining || !service.status}
                  >
                    {joining ? 'Joining...' : service.status ? 'Join Queue Now' : 'Queue Closed'}
                  </button>
                </>
              )}
            </div>

            <div className="location-info-card">
              <h3 className="card-title-sd-small">Location</h3>
              <div className="mini-map-placeholder">
                📍 {service.location?.lat ? `${service.location.lat.toFixed(4)}, ${service.location.lng.toFixed(4)}` : 'Location not provided'}
              </div>
              <p className="location-helper-sd">
                You can view the exact location on the map when you arrive at the organization.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ServiceDetailsPage;
