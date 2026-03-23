import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getServiceQueueAPI, serveNextAPI, API, getMyServices, transferTicketAPI } from "../services/api";
import {
  Users,
  Play,
  CheckCircle,
  ArrowRightLeft,
  Timer,
  Pause,
  UserCheck,
  ChevronRight
} from "lucide-react";
import "./ServiceProviderPage.css";

export default function CounterPage() {
  const { serviceId } = useParams();
  const [tickets, setTickets] = useState([]);
  const [currentTicket, setCurrentTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [myServices, setMyServices] = useState([]);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [transferTarget, setTransferTarget] = useState("");

  useEffect(() => {
    fetchQueue();
    const interval = setInterval(fetchQueue, 5000); // Poll every 5s
    return () => clearInterval(interval);
  }, [serviceId]);

  const fetchQueue = async () => {
    try {
      const [res, servRes] = await Promise.all([
        getServiceQueueAPI(serviceId),
        getMyServices()
      ]);
      if (res.data.success) {
        setTickets(res.data.data);
      }
      if (servRes.data.success) {
        setMyServices(servRes.data.data.filter(s => s._id !== serviceId));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleNext = async () => {
    try {
      const res = await serveNextAPI(serviceId);
      if (res.data.success) {
        setCurrentTicket(res.data.data);
        fetchQueue();
      }
    } catch (err) {
      alert(err.response?.data?.message || "No more tickets");
    }
  };

  const handleComplete = async () => {
    if (!currentTicket) return;
    try {
      await API.put(`/tickets/complete/${currentTicket._id}`);
      setCurrentTicket(null);
      fetchQueue();
    } catch (err) {
      console.error(err);
    }
  };

  const handleTransfer = async () => {
    if (!currentTicket || !transferTarget) return;
    try {
      await transferTicketAPI(currentTicket._id, transferTarget);
      setShowTransferModal(false);
      setCurrentTicket(null);
      fetchQueue();
      alert("Ticket transferred successfully");
    } catch (err) {
      alert(err.response?.data?.message || "Transfer failed");
    }
  };

  return (
    <div className="sp-container" style={{paddingTop: '100px'}}>
      <div className="sp-header">
        <h1 className="sp-title">Service Counter</h1>
        <div className="badge">Service ID: {serviceId}</div>
      </div>

      <div className="sp-stats-grid">
        <div className="sp-stat-card">
          <div className="sp-stat-icon">👥</div>
          <div className="sp-stat-info">
            <div className="sp-stat-value">{tickets.length}</div>
            <div className="sp-stat-label">Waiting in Queue</div>
          </div>
        </div>
        <div className="sp-stat-card active" style={{border: '2px solid #7c3aed'}}>
          <div className="sp-stat-icon">🎫</div>
          <div className="sp-stat-info">
            <div className="sp-stat-value">{currentTicket ? `Token #${currentTicket.tokenNumber}` : 'Idle'}</div>
            <div className="sp-stat-label">Currently Serving</div>
          </div>
        </div>
      </div>

      <div className="sp-content">
        <div className="sp-dashboard-grid">
          <div className="sp-dashboard-card">
            <h3>Active Controls</h3>
            <div className="quick-actions-list">
              <button className="sp-quick-action-btn primary" onClick={handleNext} disabled={currentTicket}>
                <span className="action-icon"><Play size={20}/></span>
                Call Next Token
              </button>
              <button className="sp-quick-action-btn success" onClick={handleComplete} disabled={!currentTicket}>
                <span className="action-icon"><CheckCircle size={20}/></span>
                Mark Completed
              </button>
              <button className="sp-quick-action-btn" onClick={() => setShowTransferModal(true)} disabled={!currentTicket}>
                <span className="action-icon"><ArrowRightLeft size={20}/></span>
                Transfer to Another Counter
              </button>
            </div>
          </div>

          <div className="sp-dashboard-card">
            <h3>Upcoming Queue</h3>
            <div className="schedule-list">
              {tickets.length > 0 ? (
                tickets.map((t) => (
                  <div key={t._id} className="schedule-item">
                     <div className="schedule-time" style={{background: '#7c3aed', color: 'white', padding: '5px 10px', borderRadius: '5px'}}>
                        #{t.tokenNumber}
                     </div>
                     <div className="schedule-details">
                        <div className="schedule-user">{t.user?.name}</div>
                        <div className="schedule-service">{t.user?.email}</div>
                     </div>
                     <ChevronRight size={16} />
                  </div>
                ))
              ) : (
                <p style={{textAlign: 'center', padding: '20px', color: '#94a3b8'}}>No users waiting</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {showTransferModal && (
        <div className="modal-overlay" onClick={() => setShowTransferModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Transfer Token #{currentTicket?.tokenNumber}</h2>
              <button className="modal-close" onClick={() => setShowTransferModal(false)}>×</button>
            </div>
            <div className="modal-body" style={{padding: '20px'}}>
              <p>Select target service counter:</p>
              <select 
                className="input-field" 
                value={transferTarget} 
                onChange={e => setTransferTarget(e.target.value)}
                style={{width: '100%', padding: '10px', marginTop: '10px', borderRadius: '5px', border: '1px solid #ddd'}}
              >
                <option value="">Select Service</option>
                {myServices.map(s => (
                  <option key={s._id} value={s._id}>{s.serviceName}</option>
                ))}
              </select>
            </div>
            <div className="modal-actions" style={{padding: '20px', display: 'flex', gap: '10px'}}>
               <button className="btn-modal-cancel" onClick={() => setShowTransferModal(false)}>Cancel</button>
               <button className="btn-modal-submit" onClick={handleTransfer} disabled={!transferTarget}>Transfer User</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
