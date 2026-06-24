import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  getServiceById,
  requestJoinCodeAPI,
  confirmJoinAPI,
  getQueuePositionAPI,
  getReviewsAPI,
  updateUserLocationAPI
} from '../services/api';
import { useAuth } from '../utils/AuthContext';
import {
  ChevronLeft,
  Timer,
  MapPin,
  CheckCircle2,
  Star,
  Users,
  AlertCircle
} from 'lucide-react';
import LocationPermissionModal from './LocationPermissionModal';
import OTPVerificationModal from './OTPVerificationModal';
import './ServiceDetailsPage.css';

function serviceInitials(name) {
  if (!name || !String(name).trim()) return 'ID';
  const parts = String(name).trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase().slice(0, 2);
  return String(name).slice(0, 2).toUpperCase();
}

const UserViewService = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [service, setService] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [queues, setQueues] = useState([]);
  const [selectedQueue, setSelectedQueue] = useState(null);
  const [queueData, setQueueData] = useState(null);
  const [joining, setJoining] = useState(false);
  const [showVerification, setShowVerification] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [userLocation, setUserLocation] = useState(null);

  const [reviews, setReviews] = useState([]);
  const [avgRating, setAvgRating] = useState(0);

  // Initialize location from localStorage if previously granted
  useEffect(() => {
    const savedLoc = localStorage.getItem('user_location');
    if (savedLoc) {
      try {
        setUserLocation(JSON.parse(savedLoc));
      } catch (e) {
        console.error("Failed to parse saved location", e);
      }
    }
  }, []);

  useEffect(() => {
    if (!id) return;
    const fetchData = async () => {
      try {
        setLoading(true);
        const res = await getServiceById(id);
        const sData = res.data.data;
        setService(sData);
        setQueues(sData.queues || []);
        if (sData.queues?.length > 0) {
          setSelectedQueue(sData.queues[0]);
        }

        const reviewRes = await getReviewsAPI("service", id);
        if (reviewRes.data.success) {
          setReviews(reviewRes.data.data.reviews);
          setAvgRating(reviewRes.data.data.averageRating);
        }
      } catch (err) {
        setError('Failed to load service details');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  const getFreshLocation = useCallback(async () => {
    const pos = await new Promise((resolve, reject) =>
      navigator.geolocation.getCurrentPosition(resolve, reject, { 
        timeout: 8000,
        enableHighAccuracy: true, 
        maximumAge: 30000  // allow a slightly cached position to speed things up
      })
    );
    const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
    const accuracy = pos.coords.accuracy;
    
    console.log(`%c[GPS_DEBUG] 🛰️ Coordinates Received: ${loc.lat}, ${loc.lng} (Accuracy: ${accuracy}m)`, "color: #06b6d4; font-weight: bold; background: #083344; padding: 4px; border-radius: 4px;");
    console.log('[UserViewService] Fresh position acquired:', loc);
    
    // Sync to state and localStorage
    setUserLocation(loc);
    localStorage.setItem('user_location', JSON.stringify(loc));
    
    // Sync to User profile (Last Known)
    try {
      await updateUserLocationAPI(loc.lat, loc.lng);
      console.log('[UserViewService] Profile location updated');
    } catch (err) {
      console.warn('[UserViewService] Profile location sync failed:', err.message);
    }

    return loc;
  }, []);

  const handleJoinQueue = async () => {
    if (!user) {
      navigate('/login', { state: { from: `/service-details/${id}` } });
      return;
    }
    if (user.role !== 'user') {
      setError("Only customers can join queues.");
      return;
    }

    if (!selectedQueue || selectedQueue.isOnBreak) {
      setError("This queue is currently on break.");
      return;
    }

    // Disable the button immediately
    setJoining(true);
    setError('');

    let latestLocation = userLocation;
    try {
      latestLocation = await getFreshLocation();
    } catch {
      const savedLoc = localStorage.getItem('user_location');
      if (savedLoc) {
        try {
          latestLocation = JSON.parse(savedLoc);
          setUserLocation(latestLocation);
        } catch {}
      }
    }

    if (!latestLocation) {
      setJoining(false);
      setShowLocationModal(true);
      return;
    }

    try {
      await requestJoinCodeAPI({ queueId: selectedQueue._id, userLocation: latestLocation });
      setShowVerification(true);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send verification code');
    } finally {
      setJoining(false);
    }
  };

  const attemptLocationFetch = async () => {
    try {
      await getFreshLocation();
      setShowLocationModal(false);
    } catch (err) {
      setError("Please enable location permissions in your browser settings to continue with high accuracy.");
    }
  };

  const handleVerifyAndJoin = async (code) => {
    try {
      setJoining(true);
      const latestLocation = userLocation || (() => {
        try {
          return JSON.parse(localStorage.getItem('user_location') || 'null')
        } catch {
          return null
        }
      })();
      const res = await confirmJoinAPI({
        queueId: selectedQueue._id,
        code,
        userLocation: latestLocation
      });
      if (res.data.success) {
        setShowVerification(false);
        const posRes = await getQueuePositionAPI(selectedQueue._id);
        setQueueData(posRes.data.data);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid verification code');
    } finally {
      setJoining(false);
    }
  };

  if (loading || !service) return <div className="loading-state">Loading Service...</div>;

  return (
    <div className="service-details-page user-view">
      <div className="details-container">
        <button className="sd-back-btn" onClick={() => navigate(-1)}><ChevronLeft size={18} /> Back</button>

        <div className="sd-hero">
          <div className="sd-hero-badge">{serviceInitials(service.serviceName)}</div>
          <div className="sd-hero-text">
            <h1 className="sd-hero-title">{service.serviceName}</h1>
            <p className="sd-hero-sub">{service.organizationId?.businessName}</p>
          </div>
        </div>

        <div className="details-grid">
          <div className="sd-left-column">
            <section className="sd-panel">
              <h2 className="sd-panel-title">Overview</h2>
              <p className="sd-panel-body">{service.description}</p>
            </section>

            <div className="sd-stats-grid">
              <div className="sd-stat-card">
                <Timer size={22} className="sd-stat-icon" />
                <span className="sd-stat-label">Rating</span>
                <span className="sd-stat-value">{avgRating} <Star size={12} fill="#ef4444" color="#ef4444" /></span>
              </div>
              <div className="sd-stat-card">
                <Users size={22} className="sd-stat-icon" />
                <span className="sd-stat-label">Active Queues</span>
                <span className="sd-stat-value">{queues.length}</span>
              </div>
              <div className="sd-stat-card">
                <MapPin size={22} className="sd-stat-icon" />
                <span className="sd-stat-label">Location</span>
                <span className="sd-stat-value">{service.address || service.organizationId?.address || "On-site"}</span>
              </div>
            </div>

            <section className="sd-panel">
              <h2 className="sd-panel-title">Current Reviews</h2>
              <div className="sd-reviews-list">
                {reviews.length > 0 ? reviews.map(r => (
                  <div key={r._id} className="sd-review-item">
                    <div className="review-header">
                      <strong>{r.user?.name}</strong>
                      <div className="rating-stars">
                        {[...Array(5)].map((_, i) => (
                          <Star key={i} size={14} fill={i < r.rating ? "#ef4444" : "none"} color="#ef4444" />
                        ))}
                      </div>
                    </div>
                    <p className="review-comment">{r.comment}</p>
                    {r.images?.length > 0 && (
                      <div className="review-images">
                        {r.images.map((img, i) => (
                          <img key={i} src={img} alt="review" className="review-img-thumb" />
                        ))}
                      </div>
                    )}
                  </div>
                )) : <p>No reviews yet.</p>}
              </div>
            </section>
          </div>

          <div className="interaction-section">
            {error && <div className="error-banner-sd"><AlertCircle size={16} /> {error}</div>}

            <div className="queue-action-card">
              {queueData?.inQueue ? (
                <div className="in-queue-status">
                  <div className="position-circle">
                    <span className="pos-label">Your Position</span>
                    <span className="pos-num">#{queueData.position}</span>
                  </div>
                  <p className="eta-main">
                    Estimated Wait: {queueData.etaMinutes === 0 ? "You're next!" : `${queueData.etaMinutes} mins`}
                  </p>
                  <button className="btn-my-tickets-sd" onClick={() => navigate('/my-tickets')}>View Ticket</button>
                </div>
              ) : (
                <>
                  <h3 className="card-title-sd">Join Queue</h3>
                  <p className="sd-join-hint">Select a queue below and join instantly. We'll email you a verification code.</p>

                  <div className="queue-selector">
                    <p className="booking-label-sd">Select Queue</p>
                    <div className="queue-pills">
                      {queues.map(q => (
                        <button
                          key={q._id}
                          className={`queue-pill ${selectedQueue?._id === q._id ? 'selected' : ''} ${q.isOnBreak ? 'on-break' : ''}`}
                          onClick={() => setSelectedQueue(q)}
                        >
                          {q.queueName} {q.isOnBreak && "(On Break)"}
                        </button>
                      ))}
                    </div>
                  </div>

                  {selectedQueue && (
                    <div className="queue-info-pill">
                      <Timer size={14} />
                      <span>~{selectedQueue.avgServiceTime || 15} min avg wait per person</span>
                    </div>
                  )}

                  <button
                    className="btn-book-appointment-sd"
                    disabled={joining || !selectedQueue || selectedQueue?.isOnBreak}
                    onClick={handleJoinQueue}
                  >
                    {joining ? "Processing..." : user ? "Join Queue" : "Login to Join"}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {showVerification && (
        <OTPVerificationModal 
          isOpen={showVerification}
          onClose={() => setShowVerification(false)}
          onVerify={handleVerifyAndJoin}
          email={user?.email}
          loading={joining}
        />
      )}

      <LocationPermissionModal 
        isOpen={showLocationModal}
        onAllow={attemptLocationFetch}
        onCancel={() => {
          setShowLocationModal(false);
          setUserLocation(null);
        }}
      />
    </div>
  );
};

export default UserViewService;
