import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../utils/AuthContext';
import { getMyServices, getServiceQueueAPI, serveNextAPI, deleteServiceAPI } from '../services/api';
import './ServiceProviderPage.css';

const ServiceProviderPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [services, setServices] = useState([]);
  const [selectedService, setSelectedService] = useState(null);
  const [queue, setQueue] = useState([]);
  const [loading, setLoading] = useState(true);
  const [queueLoading, setQueueLoading] = useState(false);
  const [error, setError] = useState('');
  const [stats, setStats] = useState({ total: 0, waiting: 0, served: 0 });

  useEffect(() => {
    const fetchServices = async () => {
      try {
        setLoading(true);
        const res = await getMyServices();
        setServices(res.data.data);
        if (res.data.data.length > 0) {
          setSelectedService(res.data.data[0]);
        }
      } catch (err) {
        setError('Failed to load your services');
      } finally {
        setLoading(false);
      }
    };
    fetchServices();
  }, []);

  useEffect(() => {
    const fetchQueue = async () => {
      if (!selectedService) return;
      try {
        setQueueLoading(true);
        const res = await getServiceQueueAPI(selectedService._id);
        setQueue(res.data.data);
        
        // Update local stats for the selected service
        const waiting = res.data.data.length;
        setStats(prev => ({ ...prev, waiting }));
      } catch (err) {
        console.error("Failed to fetch queue", err);
      } finally {
        setQueueLoading(false);
      }
    };
    fetchQueue();
  }, [selectedService]);

  const handleServeNext = async () => {
    if (!selectedService) return;
    try {
      const res = await serveNextAPI(selectedService._id);
      if (res.data.success) {
        // Refresh queue
        const qRes = await getServiceQueueAPI(selectedService._id);
        setQueue(qRes.data.data);
        setStats(prev => ({ ...prev, served: prev.served + 1 }));
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to serve next ticket');
    }
  };

  const handleDeleteService = async (id) => {
    if (!window.confirm('Are you sure you want to delete this service?')) return;
    try {
      await deleteServiceAPI(id);
      setServices(services.filter(s => s._id !== id));
      if (selectedService?._id === id) {
        setSelectedService(services.find(s => s._id !== id) || null);
      }
    } catch (err) {
      alert('Failed to delete service');
    }
  };

  if (loading) return <div className="provider-loading">Loading dashboard...</div>;

  return (
    <div className="provider-dashboard">
      <div className="provider-container">
        <header className="dashboard-header">
          <div className="header-text-sp">
            <h1 className="dashboard-title">Provider Dashboard</h1>
            <p className="welcome-msg">Welcome back, {user?.name}</p>
          </div>
          <button className="btn-add-service-sp" onClick={() => navigate('/service-provider/create-service')}>
            + Add New Service
          </button>
        </header>

        <div className="dashboard-grid">
          {/* Services List Sidebar */}
          <div className="services-sidebar">
            <h2 className="sidebar-title">Your Services</h2>
            {services.length === 0 ? (
              <div className="empty-sidebar">No services yet. Create one to get started!</div>
            ) : (
              <div className="service-list-sp">
                {services.map(s => (
                  <div 
                    key={s._id} 
                    className={`service-item-sp ${selectedService?._id === s._id ? 'active' : ''}`}
                    onClick={() => setSelectedService(s)}
                  >
                    <div className="service-item-info">
                      <span className="service-item-name">{s.serviceName}</span>
                      <span className="service-item-status">{s.status ? 'Active' : 'Paused'}</span>
                    </div>
                    <button className="btn-delete-icon" onClick={(e) => { e.stopPropagation(); handleDeleteService(s._id); }}>
                      🗑️
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Main Queue View */}
          <div className="main-content-sp">
            {selectedService ? (
              <div className="queue-manager">
                <div className="service-summary-sp">
                  <div className="summary-card">
                    <span className="summary-label">Waiting</span>
                    <span className="summary-value">{queue.length}</span>
                  </div>
                  <div className="summary-card">
                    <span className="summary-label">Service Status</span>
                    <span className={`summary-value status-${selectedService.status ? 'on' : 'off'}`}>
                      {selectedService.status ? 'Online' : 'Offline'}
                    </span>
                  </div>
                </div>

                <div className="action-row-sp">
                  <h3 className="section-title-sp">Active Queue</h3>
                  <button 
                    className="btn-serve-next" 
                    onClick={handleServeNext}
                    disabled={queue.length === 0}
                  >
                    🚀 Serve Next Customer
                  </button>
                </div>

                {queueLoading ? (
                  <div className="queue-loading">Updating queue...</div>
                ) : queue.length === 0 ? (
                  <div className="queue-empty-sp">
                    <p>No customers waiting in this queue right now.</p>
                  </div>
                ) : (
                  <div className="queue-table-wrapper">
                    <table className="queue-table">
                      <thead>
                        <tr>
                          <th>Position</th>
                          <th>Token #</th>
                          <th>Customer Name</th>
                          <th>Phone</th>
                          <th>Joined</th>
                        </tr>
                      </thead>
                      <tbody>
                        {queue.map((ticket, index) => (
                          <tr key={ticket._id}>
                            <td><span className="pos-badge">#{index + 1}</span></td>
                            <td>{ticket.tokenNumber}</td>
                            <td>{ticket.user?.name}</td>
                            <td>{ticket.user?.phone}</td>
                            <td>{new Date(ticket.createdAt).toLocaleTimeString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ) : (
              <div className="no-service-selected">
                <h2>Select a service to manage the queue</h2>
                <p>If you haven't created any services yet, click the "Add New Service" button above.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ServiceProviderPage;
