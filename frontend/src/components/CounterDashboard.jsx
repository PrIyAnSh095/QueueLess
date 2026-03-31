import React, { useState, useEffect } from 'react';
import { getMyOrgProfileAPI, getOrgCountersAPI, serveNextByCounterAPI, getServiceQueueAPI, toggleQueueBreakAPI, completeCurrentTokenAPI, updateQueueStatusAPI, getOrgQueuesAPI } from '../services/api';
import { useAuth } from '../utils/AuthContext';
import { Timer, Users, ArrowRightCircle, RefreshCcw, Coffee, UserCheck } from 'lucide-react';
import { SkeletonCard, SkeletonLine } from './Skeleton';
import './CounterDashboard.css';

const CounterDashboard = () => {
  const { user } = useAuth();
  const [counter, setCounter] = useState(null);
  const [queue, setQueue] = useState([]);
  const [queueMeta, setQueueMeta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [serving, setServing] = useState(false);
  const [error, setError] = useState('');

  const formatAMPM = (date) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
  };

  const fetchCounterInfo = async (isPolling = false) => {
    try {
      if (!isPolling) setLoading(true);
      const res = await getOrgCountersAPI();
      const userId = user?.id || user?._id;
      
      let myCounter = res.data.data.find(c => {
        const counterUserId = c.user?._id || c.user;
        return String(counterUserId) === String(userId);
      });

      // Special case: Provider can see/use any counter if they don't have one assigned
      if (!myCounter && user.role === 'provider' && res.data.data.length > 0) {
        myCounter = res.data.data[0];
      }
      
      if (myCounter) {
        setCounter(myCounter);

        const [qRes, orgQueuesRes] = await Promise.all([
          getServiceQueueAPI(myCounter.service?._id),
          getOrgQueuesAPI()
        ]);

        setQueue(qRes.data.data);
        const myQueue = orgQueuesRes.data.data.find(
          q => String(q.serviceId?._id) === String(myCounter.service?._id)
        );
        setQueueMeta(myQueue || null);
      } else {
        setError('No counter assigned to this account.');
      }
    } catch (err) {
      if (!isPolling) setError('Failed to fetch counter information.');
    } finally {
      if (!isPolling) setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchCounterInfo();
      const interval = setInterval(() => {
        fetchCounterInfo(true);
      }, 15000);
      return () => clearInterval(interval);
    }
  }, [user]);

  const handleServeNext = async () => {
    if (!counter) return;
    try {
      setServing(true);
      const res = await serveNextByCounterAPI(counter._id);
      if (res.data.success) {
        fetchCounterInfo();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Error serving next token');
    } finally {
      setServing(false);
    }
  };

  const handleCompleteToken = async () => {
    if (!counter) return;
    try {
      const res = await completeCurrentTokenAPI(counter._id);
      if (res.data.success) {
        fetchCounterInfo();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Error completing token');
    }
  };

  const handleUpdateQueueStatus = async (status) => {
     // We need the queueId. Assuming it's on counter.service.queues or similar.
     // For now, let's find the queue via getOrgQueues if needed, or if it's in the data.
     try {
       const qRes = await getOrgQueuesAPI();
       const myQueue = qRes.data.data.find(
         q => String(q.serviceId?._id) === String(counter.service?._id)
       );
       if (myQueue) {
         await updateQueueStatusAPI(myQueue._id, status);
         fetchCounterInfo();
       }
     } catch (err) {
       setError('Failed to update queue status');
     }
  };

  const handleToggleBreak = async () => {
    try {
      const qRes = await getOrgQueuesAPI();
      const myQueue = qRes.data.data.find(
        q => String(q.serviceId?._id) === String(counter.service?._id)
      );
      if (myQueue) {
        await toggleQueueBreakAPI(myQueue._id);
        fetchCounterInfo();
      }
    } catch (err) {
      setError('Failed to toggle break');
    }
  };

  if (loading) {
    return (
      <div className="counter-dashboard loading-state">
        <div className="skeleton-header">
           <SkeletonLine width="200px" height="32px" />
           <SkeletonLine width="150px" height="20px" />
        </div>
        <div className="cd-grid">
           <SkeletonCard lines={4} />
           <SkeletonCard lines={6} />
           <div className="cd-sidebar-skeletons">
              <SkeletonLine height="80px" />
              <SkeletonLine height="80px" />
           </div>
        </div>
      </div>
    );
  }

  if (error) return <div className="cd-error">{error}</div>;

  const nextToken = queue.length > 0 ? queue[0] : null;

  return (
    <div className="counter-dashboard">
      <div className="cd-header">
        <div className="cd-header-text">
          <div className="cd-role-indicator">Counter Desk</div>
          <h1>{counter?.name}</h1>
          <div className="cd-badges">
            <span className="service-badge">{counter?.service?.serviceName}</span>
            {queueMeta?.isOnBreak && <span className="break-badge">On Break ☕</span>}
          </div>
        </div>
        <div className="cd-h-actions">
           <button 
             className={`btn-status overload ${queueMeta?.status === 'overload' ? 'active' : ''}`}
             onClick={() => handleUpdateQueueStatus(queueMeta?.status === 'overload' ? 'active' : 'overload')}
             title={queueMeta?.status === 'overload' ? 'Return queue to normal' : 'Mark as Overloaded'}
           >
             {queueMeta?.status === 'overload' ? 'Normal' : 'Overload'}
           </button>
           <button 
             className={`btn-status end-q ${queueMeta?.status === 'ended' ? 'active' : ''}`}
             onClick={() => handleUpdateQueueStatus(queueMeta?.status === 'ended' ? 'active' : 'ended')}
             title={queueMeta?.status === 'ended' ? 'Start queue again' : 'End queue for today'}
           >
             {queueMeta?.status === 'ended' ? 'Start Queue' : 'End Queue'}
           </button>
           <button 
             className={`btn-break ${queueMeta?.isOnBreak ? 'active' : ''}`}
             onClick={handleToggleBreak}
             title={queueMeta?.isOnBreak ? "Resume Queue" : "Send to Break"}
           >
             <Coffee size={18} /> {queueMeta?.isOnBreak ? "Resume" : "Break"}
           </button>
           <button className="btn-refresh" onClick={() => fetchCounterInfo()}>
             <RefreshCcw size={18} />
           </button>
        </div>
      </div>

      <div className="cd-grid">
        {/* Current Ticket Card */}
        <div className="cd-card active-serve">
          <div className="card-lbl">Now Serving</div>
          {counter?.currentTicket ? (
            <div className="current-token-view">
              <span className="token-number">#{counter.currentTicket.tokenNumber}</span>
              <p className="token-user">{counter.currentTicket.user?.name || 'Walk-in User'}</p>
              <div className="token-stats">
                <div className="t-stat">
                  <Timer size={14} />
                  <span>Started: {formatAMPM(counter.currentTicket.updatedAt)}</span>
                </div>
              </div>
              <button className="btn-complete-serve" onClick={handleCompleteToken}>
                Mark as Completed
              </button>
            </div>
          ) : (
            <div className="no-token-view">
              <span className="idle-icon">📭</span>
              <p>Ready for next customer</p>
            </div>
          )}
          
          <div className="next-up-preview">
             <div className="next-hdr">
                <UserCheck size={14} />
                <span>Next in Line</span>
             </div>
             {nextToken ? (
                <div className="next-val">
                   <strong>#{nextToken.tokenNumber}</strong>
                   <span className="n-wait">{queue.length * (counter?.service?.avgServiceTime || 15)}m wait</span>
                   <span>{nextToken.user?.name || 'Walk-in'}</span>
                </div>
             ) : (
                <div className="next-val empty">No one waiting</div>
             )}
          </div>

          <button 
            className="btn-serve-next" 
            onClick={handleServeNext} 
            disabled={serving || queue.length === 0 || counter?.currentTicket}
            style={{ opacity: counter?.currentTicket ? 0.5 : 1 }}
          >
            {serving ? 'Processing...' : 'Serve Next Token'} 
            <ArrowRightCircle size={20} />
          </button>
          {queue.length === 0 && !counter?.currentTicket && (
            <p className="queue-empty-hint">All caught up! Queue is empty.</p>
          )}
        </div>

        {/* Queue Preview Card */}
        <div className="cd-card queue-list-card">
          <div className="q-header">
            <h2>Waiting List</h2>
            <span className="q-count">{queue.length} People</span>
          </div>
          <div className="q-items">
            {queue.map((t, index) => (
              <div key={t._id} className="q-item">
                <span className="q-idx">{index + 1}</span>
                <span className="q-tnum">#{t.tokenNumber}</span>
                <span className="q-name">{t.user?.name || 'Walk-in'}</span>
                <span className="q-time">{formatAMPM(t.createdAt)}</span>
              </div>
            ))}
            {queue.length === 0 && <p className="empty-msg">No one is waiting.</p>}
          </div>
        </div>

        {/* Quick Stats Column */}
        <div className="cd-sidebar">
          <div className="stat-pill">
            <Users size={20} />
            <div className="sp-text">
              <strong>{queue.length}</strong>
              <span>Waiting</span>
            </div>
          </div>
          <div className="stat-pill">
            <Timer size={20} />
            <div className="sp-text">
              <strong>{Math.round(queue.length * (counter?.service?.avgServiceTime || 15))}m</strong>
              <span>Total ETA</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CounterDashboard;
