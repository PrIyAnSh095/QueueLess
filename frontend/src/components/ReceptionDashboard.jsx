import React, { useEffect, useMemo, useState } from 'react';
import {
  addWalkInTicketAPI,
  getOrgQueuesAPI,
  getOrgServicesAPI,
  updateQueueStatusAPI
} from '../services/api';
import { UserPlus, CheckCircle, RefreshCcw, Layers3 } from 'lucide-react';
import { SkeletonCard, SkeletonLine } from './Skeleton';
import './ReceptionDashboard.css';

const ReceptionDashboard = () => {
  const [services, setServices] = useState([]);
  const [queues, setQueues] = useState([]);
  const [selectedService, setSelectedService] = useState('');
  const [selectedQueue, setSelectedQueue] = useState('');
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({ name: '', email: '', phone: '' });
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(null);

  const availableQueues = useMemo(
    () => queues.filter(q => String(q.serviceId?._id) === String(selectedService)),
    [queues, selectedService]
  );

  const selectedQueueDetails = availableQueues.find(q => String(q._id) === String(selectedQueue));

  const fetchReceptionData = async (isPolling = false) => {
    try {
      if (!isPolling) setLoading(true);
      const [servicesRes, queuesRes] = await Promise.all([getOrgServicesAPI(), getOrgQueuesAPI()]);
      const serviceData = (servicesRes.data?.data || []).filter(
        s => s.approvalStatus === 'approved' && s.status !== false
      );
      const queueData = queuesRes.data?.data || [];

      setServices(serviceData);
      setQueues(queueData);

      if (!selectedService && serviceData.length > 0) {
        setSelectedService(serviceData[0]._id);
      }
    } catch (err) {
      console.error('Failed to fetch reception data', err);
    } finally {
      if (!isPolling) setLoading(false);
    }
  };

  useEffect(() => {
    fetchReceptionData();
    const interval = setInterval(() => {
      fetchReceptionData(true);
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!selectedService && services.length > 0) {
      setSelectedService(services[0]._id);
    }
  }, [services, selectedService]);

  useEffect(() => {
    if (!availableQueues.length) {
      setSelectedQueue('');
      return;
    }

    const queueStillExists = availableQueues.some(q => String(q._id) === String(selectedQueue));
    if (!queueStillExists) {
      setSelectedQueue(availableQueues[0]._id);
    }
  }, [availableQueues, selectedQueue]);

  const handleUpdateQueueStatus = async (status, queueId) => {
    if (!queueId) return;
    try {
      await updateQueueStatusAPI(queueId, status);
      alert(`Queue status set to ${status}`);
      fetchReceptionData(true);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update queue status');
    }
  };

  const handleAddWalkIn = async (e) => {
    e.preventDefault();
    if (!selectedQueue) {
      alert('Please select a queue for this walk-in customer');
      return;
    }

    try {
      setSubmitting(true);
      const res = await addWalkInTicketAPI({
        queueId: selectedQueue,
        name: formData.name,
        email: formData.email,
        phone: formData.phone
      });
      setSuccess(res.data?.data || null);
      await fetchReceptionData(true);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to add walk-in customer');
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({ name: '', email: '', phone: '' });
    setSuccess(null);
  };

  if (loading) {
    return (
      <div className="reception-dashboard loading-state">
        <div className="skeleton-header">
          <SkeletonLine width="200px" height="32px" />
          <SkeletonLine width="250px" height="20px" />
        </div>
        <div className="rd-container">
          <SkeletonCard lines={6} />
          <div className="rd-sidebar-skeletons">
            <SkeletonLine height="100px" />
            <SkeletonLine height="150px" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="reception-dashboard">
      <div className="rd-header">
        <h1>Reception Desk</h1>
        <div className="rd-subtitle-row">
          <p>Add walk-in customers directly to any active queue in your organization.</p>
          <button type="button" className="btn-secondary btn-refresh-inline" onClick={() => fetchReceptionData()}>
            <RefreshCcw size={15} /> Refresh
          </button>
        </div>
      </div>

      <div className="rd-container">
        {success ? (
          <div className="rd-card success-card">
            <CheckCircle size={64} className="success-icon" />
            <h2>Walk-in Added Successfully</h2>
            <div className="ticket-summary">
              <span className="ts-label">Token Number</span>
              <span className="ts-value">#{success.tokenNumber}</span>
              <p>{success.user?.name || formData.name} has been added to <strong>{success.queue?.queueName || 'the queue'}</strong>.</p>
            </div>
            <button className="btn-primary" onClick={resetForm}>Add Another Walk-in</button>
          </div>
        ) : (
          <div className="rd-card">
            <div className="rd-card-header">
              <UserPlus size={24} />
              <h2>New Walk-in Registration</h2>
            </div>

            <form className="rd-form" onSubmit={handleAddWalkIn}>
              <div className="form-group">
                <label>Select Service</label>
                <select value={selectedService} onChange={e => setSelectedService(e.target.value)} required>
                  {services.map(service => (
                    <option key={service._id} value={service._id}>{service.serviceName}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Select Queue</label>
                <select value={selectedQueue} onChange={e => setSelectedQueue(e.target.value)} required>
                  {availableQueues.map(queue => (
                    <option key={queue._id} value={queue._id}>
                      {queue.queueName} {queue.isOnBreak ? '(On Break)' : queue.isActive === false ? '(Inactive)' : ''}
                    </option>
                  ))}
                </select>
                {selectedQueueDetails && (
                  <div className="selected-queue-note">
                    <Layers3 size={14} />
                    <span>
                      {selectedQueueDetails.waitingUsers?.length || 0} waiting • Avg service {selectedQueueDetails.avgServiceTime || 15} min
                    </span>
                  </div>
                )}
              </div>

              <div className="form-group">
                <label>Customer Name</label>
                <input
                  type="text"
                  placeholder="Full Name"
                  required
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label>Email Address</label>
                <input
                  type="email"
                  placeholder="email@example.com"
                  required
                  value={formData.email}
                  onChange={e => setFormData({ ...formData, email: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label>Phone Number</label>
                <input
                  type="tel"
                  placeholder="Phone Number"
                  required
                  value={formData.phone}
                  onChange={e => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>

              <button type="submit" className="btn-primary" disabled={submitting || !selectedQueue}>
                {submitting ? 'Adding Walk-in...' : 'Add Walk-in to Queue'}
              </button>
            </form>
          </div>
        )}

        <div className="rd-info-panel">
          <h3>Queue Actions</h3>
          <ul>
            <li>Select the exact queue to place a walk-in customer where staff needs them.</li>
            <li>The queue selector works across all active queues in the organization.</li>
            <li>Each customer still receives their token details by email if the address is valid.</li>
          </ul>

          <div className="queue-snapshot">
            <h4>Live Queue Snapshot</h4>
            {queues.length === 0 ? (
              <p className="queue-empty-note">No queues are available yet.</p>
            ) : queues.map(queue => (
              <div key={queue._id} className="qs-item">
                <div className="qs-info">
                  <span>{queue.serviceId?.serviceName || 'Service'} • {queue.queueName}</span>
                  <strong>{queue.waitingUsers?.length || 0} waiting</strong>
                  <small className={`qs-status ${queue.isActive === false ? 'inactive' : queue.isOnBreak ? 'break' : 'live'}`}>
                    {queue.isActive === false ? 'Inactive' : queue.isOnBreak ? 'On Break' : 'Live'}
                  </small>
                </div>
                <div className="qs-actions">
                  <button
                    type="button"
                    className="q-mini-btn add"
                    onClick={() => {
                      setSelectedService(queue.serviceId?._id || '');
                      setSelectedQueue(queue._id);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    title="Use this queue for the next walk-in"
                  >
                    ＋
                  </button>
                  <button
                    type="button"
                    className="q-mini-btn overload"
                    onClick={() => handleUpdateQueueStatus('overload', queue._id)}
                    title="Set to Overload"
                  >
                    ⚡
                  </button>
                  <button
                    type="button"
                    className="q-mini-btn end"
                    onClick={() => handleUpdateQueueStatus('ended', queue._id)}
                    title="End Queue"
                  >
                    🛑
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReceptionDashboard;
