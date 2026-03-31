import React, { useState, useEffect } from 'react';
import { getMyTicketsAPI, leaveQueueAPI, getLiveEtaAPI, confirmServeAPI, getMyHistoryAPI, getReviewsAPI, updateUserLocationAPI } from '../services/api';
import './MyTicketsPage.css';
import { Clock, Timer, MapPin, XCircle, Navigation, ExternalLink, Activity, AlertCircle } from 'lucide-react';

const TicketCard = ({ ticket, onCancel }) => {
  const [eta, setEta] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchETA = async () => {
    try {
      const qId = ticket.queue?._id || ticket.queue;
      if (!qId) { setLoading(false); return; }

      // Try to get live location for real-time ETA
      let currentCoords = null;
      try {
        const pos = await new Promise((resolve, reject) =>
          navigator.geolocation.getCurrentPosition(resolve, reject, { 
            timeout: 10000, 
            enableHighAccuracy: true,
            maximumAge: 10000 
          })
        );
        currentCoords = { 
          userLat: pos.coords.latitude, 
          userLng: pos.coords.longitude,
          accuracy: Math.round(pos.coords.accuracy)
        };
        
        console.log(`%c[GPS_DEBUG] 🛰️ Coordinates Received (Tickets): ${pos.coords.latitude}, ${pos.coords.longitude} (Acc: ${pos.coords.accuracy}m)`, "color: #06b6d4; font-weight: bold; background: #083344; padding: 4px; border-radius: 4px;");
        updateUserLocationAPI(pos.coords.latitude, pos.coords.longitude).catch(() => {});
      } catch (err) {
        console.warn('[MyTickets] Loc capture slow/failed. Falling back.');
      }

      const res = await getLiveEtaAPI(qId, currentCoords || {});
      if (res.data.success) setEta(res.data.data);
    } catch {
      // fail silently
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchETA();
    const interval = setInterval(fetchETA, 30000);
    return () => clearInterval(interval);
  }, [ticket._id]);

  if (loading) return <div className="ticket-card-mt loading">Loading position...</div>;

  const etaMins = eta?.etaMinutes ?? null;
  const pos = eta?.position ?? null;

  let leaveMsg = null;
  if (eta?.leaveInMinutes != null) {
    if (eta.shouldLeaveNow || eta.leaveInMinutes <= 0) {
      leaveMsg = { text: 'Leave Now!', cls: 'leave-now' };
    } else if (eta.leaveInMinutes <= 10) {
      leaveMsg = { text: `Leave in ${eta.leaveInMinutes} min`, cls: 'leave-soon' };
    } else {
      leaveMsg = { text: `Leave in ~${eta.leaveInMinutes} min`, cls: 'leave-later' };
    }
  }

  return (
    <div className="ticket-card-mt">
      <div className="ticket-header-mt">
        <div className="ticket-org-info">
          <h3 className="ticket-service-name">{ticket.service?.serviceName}</h3>
          <p className="ticket-org-name">{ticket.service?.organizationId?.businessName}</p>
        </div>
        <div className="ticket-number-badge">#{ticket.tokenNumber}</div>
      </div>

      <div className="ticket-status-mt">
        <span className="dot active"></span>
        <span className="status-text">
          {pos === 1 ? 'Next in Queue! 🎉' : pos ? `Position: #${pos}` : 'Active'}
        </span>
      </div>

      <div className="ticket-body-mt">
        <div className="countdown-timer-box">
          <Clock size={24} className="timer-icon" />
          <div className="timer-info">
            <span className="timer-label">Estimated Wait Time</span>
            <span className="timer-value">
              {etaMins === null ? '—' : etaMins === 0 ? "You're next!" : `${etaMins} minutes`}
            </span>
          </div>
        </div>

        {(eta?.distanceKm != null || eta?.travelMinutes != null) && (
          <div className="ticket-location-info">
            {eta.distanceKm != null && (
              <div className="tm-row">
                <Navigation size={14} />
                <span>{eta.distanceKm} km away</span>
              </div>
            )}
            {eta.travelMinutes != null && (
              <div className="tm-row">
                <Timer size={14} />
                <span>~{eta.travelMinutes} min travel time</span>
              </div>
            )}
            {leaveMsg && (
              <div className={`leave-suggestion ${leaveMsg.cls}`}>
                🚶 {leaveMsg.text}
              </div>
            )}
          </div>
        )}

        <div className="ticket-meta-info">
          <div className="tm-row">
            <Timer size={14} />
            <span>Booked: {new Date(ticket.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          </div>
          <div className="tm-row">
            <MapPin size={14} />
            <span>{eta?.displayAddress || 'Location tracked'}</span>
          </div>
          {eta?.mapsUrl && (
            <div className="tm-row">
              <a href={eta.mapsUrl} target="_blank" rel="noopener noreferrer" className="maps-link">
                <ExternalLink size={14} /> Get Directions
              </a>
            </div>
          )}
          {eta?.locationSource && (
            <div className="tm-row metadata-row">
               <Activity size={12} title="Tracking Source" />
               <span className="meta-text">{eta.locationSource.replace('_', ' ')}</span>
               {eta.userLat && (
                 <>
                   <span className="dot-sep"></span>
                   <span className="meta-text coords-text" title="Captured Latitude/Longitude">
                     {Number(eta.userLat).toFixed(4)}, {Number(eta.userLng).toFixed(4)}
                   </span>
                 </>
               )}
            </div>
          )}
          {eta?.accuracy > 1000 && (
            <div className="tm-row warning-row">
              <AlertCircle size={12} color="#f59e0b" />
              <span className="warning-text">Poor accuracy ({eta.accuracy}m). Move near a window.</span>
            </div>
          )}
          <button className="sync-loc-btn" onClick={() => { setLoading(true); fetchETA(); }}>
            <Activity size={12} /> Sync Precise Location
          </button>
        </div>
      </div>

      <div className="ticket-footer-mt">
        <button className="btn-cancel-ticket" onClick={() => onCancel(ticket._id)}>
          <XCircle size={16} /> Cancel Booking
        </button>
      </div>
    </div>
  );
};


const DisputePrompt = ({ history, onSubmit }) => {
  const [submitted, setSubmitted] = useState(false);
  if (submitted) return <span className="dispute-done">✓ Feedback recorded</span>;
  return (
    <div className="dispute-prompt">
      <span>Were you served?</span>
      <button className="btn-yes" onClick={() => { onSubmit(history._id, 'served'); setSubmitted(true); }}>Yes ✓</button>
      <button className="btn-no" onClick={() => { onSubmit(history._id, 'not_served'); setSubmitted(true); }}>No ✗</button>
    </div>
  );
};

const MyTicketsPage = () => {
  const [tickets, setTickets] = useState([]);
  const [history, setHistory] = useState([]);
  const [reviewsByService, setReviewsByService] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchAll = async () => {
    try {
      setLoading(true);
      const [tRes, hRes] = await Promise.all([
        getMyTicketsAPI(),
        getMyHistoryAPI().catch(() => ({ data: { data: [] } }))
      ]);

      const ticketsData = tRes.data.data || [];
      const historyData = hRes.data.data || [];

      setTickets(ticketsData);
      setHistory(historyData);

      const serviceIds = [...new Set(historyData.map(h => h.service?._id).filter(Boolean))];
      const reviewPromises = serviceIds.map(serviceId =>
        getReviewsAPI('service', serviceId)
          .then(res => ({ serviceId, data: res.data.data }))
          .catch(() => ({ serviceId, data: null }))
      );

      const reviewResults = await Promise.all(reviewPromises);
      setReviewsByService(reviewResults.reduce((acc, item) => {
        if (item.data) acc[item.serviceId] = item.data;
        return acc;
      }, {}));

    } catch {
      setError('Failed to load your tickets');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, []);

  const handleCancel = async (ticketId) => {
    if (!window.confirm('Are you sure you want to cancel this booking?')) return;
    try {
      await leaveQueueAPI(ticketId);
      fetchAll();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to cancel ticket');
    }
  };

  const handleConfirmServe = async (historyId, status) => {
    try {
      await confirmServeAPI(historyId, status);
    } catch (err) {
      console.error('Failed to confirm serve status:', err);
    }
  };

  if (loading) return <div className="loading-container-mt">Loading your tickets...</div>;

  const activeTickets = tickets.filter(t => t.status === 'waiting' || t.status === 'processing');
  const pastTickets = tickets.filter(t => t.status !== 'waiting' && t.status !== 'processing');

  // History entries that need user feedback (served status pending)
  const pendingFeedback = history.filter(h => h.userServeStatus === 'pending' || h.userServeStatus === 'followup_sent');

  return (
    <div className="my-tickets-page">
      <div className="mt-container">
        <h1 className="mt-page-title">My Bookings & Tickets</h1>

        {error && <div className="mt-error-banner">{error}</div>}

        {pendingFeedback.length > 0 && (
          <section className="mt-section dispute-section">
            <h2 className="mt-section-title">⚠️ Feedback Required</h2>
            <p className="dispute-hint">Your estimated wait time has passed. Please confirm if you were served.</p>
            <div className="dispute-list">
              {pendingFeedback.map(h => (
                <div key={h._id} className="dispute-item">
                  <div>
                    <strong>{h.service?.serviceName || 'Service'}</strong>
                    <span className="hist-date"> — Token #{h.tokenNumber}</span>
                  </div>
                  <DisputePrompt history={h} onSubmit={handleConfirmServe} />
                </div>
              ))}
            </div>
          </section>
        )}

        <section className="mt-section">
          <h2 className="mt-section-title">Active Tickets</h2>
          {activeTickets.length === 0 ? (
            <div className="empty-tickets-card">
              <p>You don't have any active bookings right now.</p>
              <button className="btn-browse-mt" onClick={() => window.location.href = '/services'}>Browse Services</button>
            </div>
          ) : (
            <div className="tickets-grid-mt">
              {activeTickets.map(ticket => (
                <TicketCard key={ticket._id} ticket={ticket} onCancel={handleCancel} />
              ))}
            </div>
          )}
        </section>

        <section className="mt-section past-sec">
          <h2 className="mt-section-title">Past History</h2>
          {pastTickets.length === 0 ? (
            <p className="no-history-text">No past bookings found.</p>
          ) : (
            <div className="history-list-mt">
              {pastTickets.map(ticket => (
                <div key={ticket._id} className="history-item-mt">
                  <div className="history-main-info">
                    <h4 className="hist-service">{ticket.service?.serviceName}</h4>
                    <p className="hist-org">{ticket.service?.organizationId?.businessName}</p>
                  </div>
                  <div className="history-meta">
                    <span className="hist-date">{new Date(ticket.createdAt).toLocaleDateString()}</span>
                    <span className={`hist-status ${ticket.status}`}>{ticket.status}</span>
                  </div>
                  {reviewsByService[ticket.service?._id] && (
                    <div className="history-review-summary">
                      <strong>Reviews:</strong> {reviewsByService[ticket.service?._id].totalReviews} entries, {reviewsByService[ticket.service?._id].averageRating.toFixed(1)}★
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default MyTicketsPage;
