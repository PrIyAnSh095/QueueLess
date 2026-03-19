import React, { useState, useEffect } from 'react';
import { getMyTicketsAPI, leaveQueueAPI } from '../services/api';
import './MyTicketsPage.css';

const MyTicketsPage = () => {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchTickets = async () => {
    try {
      setLoading(true);
      const res = await getMyTicketsAPI();
      setTickets(res.data.data);
    } catch (err) {
      setError('Failed to load your tickets');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, []);

  const handleCancel = async (ticketId) => {
    if (!window.confirm('Are you sure you want to cancel this booking?')) return;
    try {
      await leaveQueueAPI(ticketId);
      // Refresh tickets
      fetchTickets();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to cancel ticket');
    }
  };

  if (loading) return <div className="loading-container-mt">Loading your tickets...</div>;

  const activeTickets = tickets.filter(t => t.status === 'waiting');
  const pastTickets = tickets.filter(t => t.status !== 'waiting');

  return (
    <div className="my-tickets-page">
      <div className="mt-container">
        <h1 className="mt-page-title">My Bookings & Tickets</h1>
        
        {error && <div className="mt-error-banner">{error}</div>}

        <section className="mt-section">
          <h2 className="mt-section-title">Active Tickets</h2>
          {activeTickets.length === 0 ? (
            <div className="empty-tickets-card">
              <p>You don't have any active bookings right now.</p>
              <button className="btn-browse-mt" onClick={() => window.location.href = '/#services'}>Browse Services</button>
            </div>
          ) : (
            <div className="tickets-grid-mt">
              {activeTickets.map(ticket => (
                <div key={ticket._id} className="ticket-card-mt">
                  <div className="ticket-header-mt">
                    <div className="ticket-org-info">
                      <h3 className="ticket-service-name">{ticket.service?.serviceName}</h3>
                      <p className="ticket-org-name">{ticket.service?.organizationId?.businessName}</p>
                    </div>
                    <div className="ticket-number-badge">#{ticket.tokenNumber}</div>
                  </div>
                  
                  <div className="ticket-status-mt">
                    <span className="dot active"></span>
                    <span className="status-text">In Queue</span>
                  </div>

                  <div className="ticket-body-mt">
                    <div className="ticket-info-row">
                      <span className="label">Booked on</span>
                      <span className="value">{new Date(ticket.createdAt).toLocaleDateString()}</span>
                    </div>
                    <div className="ticket-info-row">
                      <span className="label">Estimated Wait</span>
                      <span className="value highlight-text">{ticket.service?.avgServiceTime || 15} mins approx.</span>
                    </div>
                  </div>

                  <div className="ticket-footer-mt">
                    <button className="btn-cancel-ticket" onClick={() => handleCancel(ticket._id)}>Cancel Booking</button>
                  </div>
                </div>
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
