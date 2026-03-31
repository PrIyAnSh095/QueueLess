import React, { useState, useEffect } from 'react';
import { 
  getOrgQueuesAPI, 
  serveNextAPI, 
  toggleQueueBreakAPI,
  updateQueueStatusAPI
} from '../services/api';
import { useSocket } from '../utils/useSocket';
import { 
  Users, 
  Timer, 
  Play, 
  Coffee, 
  ArrowRightCircle, 
  RefreshCcw, 
  AlertCircle,
  LayoutDashboard,
  Bell,
  CheckCircle2,
  TrendingUp,
  XCircle
} from 'lucide-react';
import './QueueManagementPage.css';

const QueueManagementPage = () => {
  const [queues, setQueues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [serving, setServing] = useState({});
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const socket = useSocket();

  const formatAMPM = (date) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
  };

  const fetchQueues = async () => {
    try {
      setLoading(true);
      const res = await getOrgQueuesAPI();
      setQueues(res.data.data || []);
      setLastUpdated(new Date());
    } catch (err) {
      console.error("Failed to fetch queues", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQueues();
    
    if (socket) {
      socket.on('queue_update', () => {
        fetchQueues();
      });
      return () => socket.off('queue_update');
    }
  }, [socket]);

  const handleServeNext = async (queueId) => {
    try {
      setServing(prev => ({ ...prev, [queueId]: true }));
      await serveNextAPI(queueId);
    } catch (err) {
      alert(err.response?.data?.message || "Error serving next");
    } finally {
      setServing(prev => ({ ...prev, [queueId]: false }));
    }
  };

  const handleToggleBreak = async (queueId) => {
    try {
      await toggleQueueBreakAPI(queueId);
      fetchQueues();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to toggle break');
    }
  };

  const handleUpdateStatus = async (queueId, status) => {
    try {
      await updateQueueStatusAPI(queueId, status);
      fetchQueues();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update status');
    }
  };

  if (loading) return <div className="loading-state">Initializing Control Center...</div>;

  return (
    <div className="queue-management-page">
      <div className="qm-container">
        <header className="qm-header">
           <div className="qm-header-left">
              <LayoutDashboard className="qm-icon" />
              <div>
                <h1>Queue Control Center</h1>
                <p>Last updated at {formatAMPM(lastUpdated)}</p>
              </div>
           </div>
           <button className="btn-refresh-qm" onClick={fetchQueues}><RefreshCcw size={18} /> Refresh</button>
        </header>

        <div className="qm-grid">
           {queues.length === 0 ? (
             <div className="qm-empty">
                <AlertCircle size={48} />
                <p>No active queues found. Create a service to get started.</p>
             </div>
           ) : (
             queues.map(q => (
               <div key={q._id} className={`qm-card ${q.isOnBreak ? 'on-break' : ''} status-${q.status}`}>
                  <div className="qm-card-hdr">
                     <div className="q-info">
                        <h3>{q.queueName}</h3>
                        <div className="q-meta-tags">
                           <span className="q-service-label">{q.serviceId?.serviceName}</span>
                           <span className={`q-status-tag ${q.status}`}>{q.status}</span>
                        </div>
                     </div>
                     <div className="qm-card-actions">
                        <button 
                         className={`qm-break-btn ${q.isOnBreak ? 'active' : ''}`}
                         onClick={() => handleToggleBreak(q._id)}
                         disabled={q.status === 'ended' && !q.isOnBreak}
                         title={q.status === 'ended' ? 'Start the queue before using break mode' : q.isOnBreak ? 'Resume queue' : 'Put queue on break'}
                        >
                         {q.isOnBreak ? <Play size={16} /> : <Coffee size={16} />}
                        </button>
                     </div>
                  </div>

                  <div className="q-current-stats">
                     <div className="stat-box">
                        <span className="s-lbl">Now Serving</span>
                        <span className="s-val highlighted">#{q.currentServingNumber || '--'}</span>
                     </div>
                     <div className="stat-box">
                        <span className="s-lbl">In Queue</span>
                        <span className="s-val"><Users size={14} /> {q.waitingUsers?.length || 0}</span>
                     </div>
                  </div>

                  <div className="qm-status-controls">
                     <button 
                       className={`btn-ctrl ${q.status === 'overload' ? 'active' : ''}`}
                       onClick={() => handleUpdateStatus(q._id, q.status === 'overload' ? 'active' : 'overload')}
                     >
                       <TrendingUp size={14} /> {q.status === 'overload' ? 'Back to Normal' : 'Peak / Overload'}
                     </button>
                     <button 
                       className={`btn-ctrl end ${q.status === 'ended' ? 'active' : ''}`}
                       onClick={() => handleUpdateStatus(q._id, q.status === 'ended' ? 'active' : 'ended')}
                     >
                       {q.status === 'ended' ? <Play size={14} /> : <XCircle size={14} />} {q.status === 'ended' ? 'Start Queue' : 'End Queue'}
                     </button>
                  </div>

                  <div className="q-waiting-list">
                     <div className="list-hdr">Waiting Tokens</div>
                     {q.waitingUsers?.length > 0 ? (
                        <div className="tokens-strip">
                           {q.waitingUsers.map(u => (
                              <div key={u._id} className="token-pill">#{u.tokenNumber}</div>
                           ))}
                        </div>
                     ) : (
                        <div className="no-tokens">All clear! No one waiting.</div>
                     )}
                  </div>

                  <button 
                    className="btn-serve-qm"
                    disabled={serving[q._id] || q.waitingUsers?.length === 0 || q.isOnBreak || q.status === 'ended'}
                    onClick={() => handleServeNext(q._id)}
                  >
                    {serving[q._id] ? "Processing..." : (
                       <>
                          <CheckCircle2 size={18} /> Serve Next Token
                       </>
                    )}
                  </button>
               </div>
             ))
           )}
        </div>
      </div>
    </div>
  );
};

export default QueueManagementPage;
