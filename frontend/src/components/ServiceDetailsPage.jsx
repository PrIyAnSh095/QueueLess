import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  getServiceById,
  joinQueueAPI,
  getQueuePositionAPI,
  getServiceBookableDatesAPI,
  getServiceSlotsAPI
} from '../services/api';
import { useAuth } from '../utils/AuthContext';
import {
  ChevronLeft,
  ChevronRight,
  Timer,
  Banknote,
  Hourglass,
  MapPin,
  CheckCircle2,
  Phone,
  Mail
} from 'lucide-react';
import './ServiceDetailsPage.css';

function formatLongDate(dateKey) {
  const [y, m, d] = dateKey.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  return dt.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });
}

function shortDateLabel(dateKey) {
  const [y, m, d] = dateKey.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  return {
    dow: dt.toLocaleDateString(undefined, { weekday: 'short' }),
    day: d,
    mon: dt.toLocaleDateString(undefined, { month: 'short' })
  };
}

/** Human-readable duration like "30–45 minutes" for the summary. */
function formatDurationRange(durationMins, avgMins) {
  const d = Number(durationMins);
  if (Number.isFinite(d) && d > 0) {
    const hi = Math.max(d + 5, Math.round(d * 1.4));
    return `${d}–${hi} minutes`;
  }
  const a = Number(avgMins) || 15;
  return `${a}–${a + 10} minutes`;
}

function serviceInitials(name) {
  if (!name || !String(name).trim()) return 'ID';
  const parts = String(name).trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase().slice(0, 2);
  }
  return String(name).slice(0, 2).toUpperCase();
}

const SERVICE_FEATURES = [
  'Fast processing',
  'Online status tracking',
  'SMS notifications',
  'Digital receipt'
];

const ServiceDetailsPage = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [service, setService] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [queueData, setQueueData] = useState(null);
  const [joining, setJoining] = useState(false);

  const [bookableDates, setBookableDates] = useState([]);
  const [datesLoading, setDatesLoading] = useState(false);
  const [selectedDateKey, setSelectedDateKey] = useState(null);
  const [slots, setSlots] = useState([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(null);

  const loadBookableDates = useCallback(async () => {
    if (!id) return;
    try {
      setDatesLoading(true);
      const res = await getServiceBookableDatesAPI(id);
      if (res.data.success) {
        const dates = res.data.data.dates || [];
        setBookableDates(dates);
        setSelectedDateKey((prev) => {
          if (prev && dates.includes(prev)) return prev;
          return dates[0] || null;
        });
      }
    } catch {
      setBookableDates([]);
    } finally {
      setDatesLoading(false);
    }
  }, [id]);

  const loadSlots = useCallback(async (dateKey) => {
    if (!id || !dateKey) {
      setSlots([]);
      setSelectedSlot(null);
      return;
    }
    try {
      setSlotsLoading(true);
      const res = await getServiceSlotsAPI(id, dateKey);
      if (res.data.success) {
        const list = res.data.data.slots || [];
        setSlots(list);
        setSelectedSlot((prev) => {
          if (!prev) return null;
          const still = list.find((s) => s.start === prev.start && s.available > 0);
          return still || list.find((s) => s.available > 0) || null;
        });
      }
    } catch {
      setSlots([]);
      setSelectedSlot(null);
    } finally {
      setSlotsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (!id) {
      setLoading(false);
      setService(null);
      setError('');
      return;
    }

    const fetchData = async () => {
      try {
        setLoading(true);
        setError('');
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

    fetchData();
  }, [id, user]);

  useEffect(() => {
    if (service && !queueData?.inQueue) {
      loadBookableDates();
    }
  }, [service, queueData?.inQueue, loadBookableDates]);

  useEffect(() => {
    if (selectedDateKey) {
      loadSlots(selectedDateKey);
    }
  }, [selectedDateKey, loadSlots]);

  const handleJoinQueue = async () => {
    if (!user) {
      navigate('/login', { state: { from: `/service-details/${id}` } });
      return;
    }

    if (!selectedSlot || selectedSlot.available < 1) {
      setError('Please select an available date and time slot.');
      return;
    }

    try {
      setJoining(true);
      setError('');

      let userLocation = null;
      if ('geolocation' in navigator) {
        try {
          const position = await new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject);
          });
          userLocation = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
        } catch (err) {
          console.warn('Geolocation failed', err);
        }
      }

      const res = await joinQueueAPI(id, userLocation, selectedSlot.start);
      if (res.data.success) {
        const posRes = await getQueuePositionAPI(id);
        setQueueData(posRes.data.data);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to book appointment');
    } finally {
      setJoining(false);
    }
  };

  const durationLabel = useMemo(() => {
    if (!service) return '—';
    return formatDurationRange(service.duration, service.avgServiceTime);
  }, [service]);

  const waitEstimateLabel = useMemo(() => {
    if (!service) return '—';
    const a = Number(service.avgServiceTime) || 15;
    return `${a}–${a + 5} minutes`;
  }, [service]);

  const orgAddress =
    service?.organizationId?.address
      ? String(service.organizationId.address).trim()
      : null;
  const orgPhone = service?.organizationId?.phone?.trim() || null;
  const orgEmail = service?.organizationId?.user?.email?.trim() || null;

  const requiredDocs = Array.isArray(service?.requiredDocuments)
    ? service.requiredDocuments.filter(Boolean)
    : [];

  if (loading) {
    return (
      <div className="service-details-page">
        <div className="loading-state">Loading service details...</div>
      </div>
    );
  }
  if (!id) {
    return (
      <div className="service-details-page">
        <div className="error-state">
          <p>No service selected.</p>
          <button type="button" className="btn-join-queue" onClick={() => navigate('/')}>
            Back to home
          </button>
        </div>
      </div>
    );
  }
  if (!service) {
    return (
      <div className="service-details-page">
        <div className="error-state">{error || 'Service not found'}</div>
      </div>
    );
  }

  const scheduledLabel = queueData?.ticket?.scheduledStart
    ? new Date(queueData.ticket.scheduledStart).toLocaleString(undefined, {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit'
      })
    : null;

  return (
    <div className="service-details-page">
      <div className="details-container">
        <button type="button" className="sd-back-btn" onClick={() => navigate(-1)}>
          <ChevronLeft size={18} strokeWidth={2.25} className="sd-icon" aria-hidden />
          Back to Services
        </button>

        <div className="sd-hero">
          <div className="sd-hero-badge" aria-hidden>
            {serviceInitials(service.serviceName)}
          </div>
          <div className="sd-hero-text">
            <h1 className="sd-hero-title">{service.serviceName}</h1>
            <p className="sd-hero-sub">{service.organizationId?.businessName || 'Service provider'}</p>
          </div>
        </div>

        <div className="details-grid sd-details-split">
          <div className="sd-left-column">
            <section className="sd-panel">
              <h2 className="sd-panel-title">About This Service</h2>
              <p className="sd-panel-body">
                {service.description || 'No description provided for this service.'}
              </p>
            </section>

            <div className="sd-stats-grid">
              <div className="sd-stat-card">
                <Timer size={22} strokeWidth={2} className="sd-stat-icon" aria-hidden />
                <span className="sd-stat-label">Duration</span>
                <span className="sd-stat-value">{durationLabel}</span>
              </div>
              <div className="sd-stat-card">
                <Banknote size={22} strokeWidth={2} className="sd-stat-icon" aria-hidden />
                <span className="sd-stat-label">Price</span>
                <span className="sd-stat-value">Free</span>
              </div>
              <div className="sd-stat-card">
                <Hourglass size={22} strokeWidth={2} className="sd-stat-icon" aria-hidden />
                <span className="sd-stat-label">Estimated Wait</span>
                <span className="sd-stat-value">{waitEstimateLabel}</span>
              </div>
              <div className="sd-stat-card">
                <MapPin size={22} strokeWidth={2} className="sd-stat-icon" aria-hidden />
                <span className="sd-stat-label">Location</span>
                <span className="sd-stat-value sd-stat-value-multiline">
                  {orgAddress || 'Address not provided'}
                </span>
              </div>
            </div>

            <section className="sd-panel">
              <h2 className="sd-panel-title">Required Documents</h2>
              {requiredDocs.length > 0 ? (
                <ul className="sd-doc-list">
                  {requiredDocs.map((doc) => (
                    <li key={doc}>{doc}</li>
                  ))}
                </ul>
              ) : (
                <p className="sd-panel-muted">No documents listed for this service.</p>
              )}
            </section>

            <section className="sd-panel">
              <h2 className="sd-panel-title">Service Features</h2>
              <div className="sd-features-grid">
                {SERVICE_FEATURES.map((item) => (
                  <div key={item} className="sd-feature-row">
                    <CheckCircle2 size={18} strokeWidth={2.5} className="sd-feature-check" aria-hidden />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </section>

            <section className="sd-panel sd-panel-contact">
              <h2 className="sd-panel-title">Contact Information</h2>
              {orgPhone && (
                <p className="sd-contact-line">
                  <Phone size={16} strokeWidth={2} className="sd-contact-icon" aria-hidden />
                  <span className="sd-contact-muted">Phone:</span>{' '}
                  <a href={`tel:${orgPhone.replace(/\s/g, '')}`} className="sd-contact-link">
                    {orgPhone}
                  </a>
                </p>
              )}
              {orgEmail && (
                <p className="sd-contact-line">
                  <Mail size={16} strokeWidth={2} className="sd-contact-icon" aria-hidden />
                  <span className="sd-contact-muted">Email:</span>{' '}
                  <a href={`mailto:${orgEmail}`} className="sd-contact-link">
                    {orgEmail}
                  </a>
                </p>
              )}
              {!orgPhone && !orgEmail && (
                <p className="sd-panel-muted">No contact details on file.</p>
              )}
            </section>
          </div>

          <div className="interaction-section sd-book-column">
            {error && <div className="error-banner-sd">{error}</div>}

            <div className="queue-action-card">
              {queueData?.inQueue ? (
                <div className="in-queue-status">
                  <div className="position-circle">
                    <span className="pos-label">Your Position</span>
                    <span className="pos-num">#{queueData.position}</span>
                  </div>
                  {scheduledLabel && (
                    <p className="scheduled-booking-line">Scheduled: {scheduledLabel}</p>
                  )}
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
                  <div className="booking-header-sd">
                    <h3 className="card-title-sd booking-title-sd">Book Your Appointment</h3>
                    <p className="card-desc-sd booking-sub-sd">
                      Select your preferred date and time slot
                    </p>
                  </div>

                  <div className="booking-section-sd">
                    <p className="booking-label-sd">Select Date</p>
                    <div className="date-strip-sd">
                      {datesLoading && (
                        <span className="booking-hint-sd">Loading dates…</span>
                      )}
                      {!datesLoading && bookableDates.length === 0 && (
                        <span className="booking-hint-sd">No bookable dates available.</span>
                      )}
                      {!datesLoading &&
                        bookableDates.map((dk) => {
                          const { dow, day, mon } = shortDateLabel(dk);
                          const sel = selectedDateKey === dk;
                          return (
                            <button
                              key={dk}
                              type="button"
                              className={`date-card-sd ${sel ? 'selected' : ''}`}
                              onClick={() => {
                                setSelectedDateKey(dk);
                                setSelectedSlot(null);
                              }}
                            >
                              <span className="date-card-dow">{dow}</span>
                              <span className="date-card-day">{day}</span>
                              <span className="date-card-mon">{mon}</span>
                            </button>
                          );
                        })}
                    </div>
                  </div>

                  <div className="booking-section-sd">
                    <p className="booking-label-sd">Select Time</p>
                    <div className="time-grid-sd">
                      {slotsLoading && (
                        <span className="booking-hint-sd">Loading time slots…</span>
                      )}
                      {!slotsLoading && selectedDateKey && slots.length === 0 && (
                        <span className="booking-hint-sd">No slots for this date.</span>
                      )}
                      {!slotsLoading &&
                        slots.map((slot) => {
                          const disabled = slot.available < 1;
                          const sel = selectedSlot?.start === slot.start;
                          return (
                            <button
                              key={slot.start}
                              type="button"
                              className={`time-slot-sd ${sel ? 'selected' : ''} ${disabled ? 'disabled' : ''}`}
                              disabled={disabled}
                              onClick={() => !disabled && setSelectedSlot(slot)}
                            >
                              {slot.label}
                            </button>
                          );
                        })}
                    </div>
                  </div>

                  <div className="appointment-summary-sd">
                    <h4 className="summary-title-sd">Appointment Summary</h4>
                    <div className="summary-row-sd">
                      <span className="summary-k">Service</span>
                      <span className="summary-v">{service.serviceName}</span>
                    </div>
                    <div className="summary-row-sd">
                      <span className="summary-k">Date</span>
                      <span className="summary-v">
                        {selectedDateKey ? formatLongDate(selectedDateKey) : '—'}
                      </span>
                    </div>
                    <div className="summary-row-sd">
                      <span className="summary-k">Time</span>
                      <span className="summary-v">{selectedSlot?.label || '—'}</span>
                    </div>
                    <div className="summary-row-sd">
                      <span className="summary-k">Duration</span>
                      <span className="summary-v">{durationLabel}</span>
                    </div>
                    <div className="summary-row-sd summary-total-sd">
                      <span className="summary-k">Total</span>
                      <span className="summary-v">Free</span>
                    </div>
                  </div>

                  <button
                    className="btn-book-appointment-sd"
                    onClick={handleJoinQueue}
                    disabled={joining || !service.status || !selectedSlot || selectedSlot.available < 1}
                  >
                    {joining ? 'Booking…' : 'Book Appointment'}
                    {!joining && (
                      <ChevronRight size={18} strokeWidth={2.5} className="sd-btn-chevron" aria-hidden />
                    )}
                  </button>
                  <p className="sd-booking-footnote">
                    You will receive a confirmation email with your token number and appointment details.
                  </p>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ServiceDetailsPage;
