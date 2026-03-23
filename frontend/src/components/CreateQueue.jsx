import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { createQueueAPI, getServiceById } from "../services/api";
import {
  Clock,
  Users,
  Coffee,
  Sparkles,
  ArrowLeft,
  CheckCircle,
  X,
  AlertCircle,
  Timer
} from "lucide-react";
import "./CreateService.css"; // Reuse same styling as CreateService

export default function CreateQueue() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const serviceId = searchParams.get("serviceId");

  const [service, setService] = useState(null);
  const [form, setForm] = useState({
    userLimit: 100,
    openingTime: "09:00",
    closingTime: "17:00",
    breakStartTime: "13:00",
    breakEndTime: "14:00",
    avgServiceTime: 15
  });

  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState(false);

  useEffect(() => {
    if (serviceId) {
      getServiceById(serviceId).then(res => {
        if (res.data.success) {
          setService(res.data.data);
          setForm(prev => ({ ...prev, avgServiceTime: res.data.data.avgServiceTime || 15 }));
        }
      });
    }
  }, [serviceId]);

  const update = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: "" }));
  };

  const validate = () => {
    const e = {};
    if (!form.userLimit || Number(form.userLimit) <= 0) e.userLimit = "Limit must be positive";
    if (!form.openingTime) e.openingTime = "Opening time is required";
    if (!form.closingTime) e.closingTime = "Closing time is required";
    if (!form.avgServiceTime || Number(form.avgServiceTime) <= 0) e.avgServiceTime = "Enter valid time";
    return e;
  };

  const handleSubmit = async () => {
    const e = validate();
    if (Object.keys(e).length) {
      setErrors(e);
      return;
    }

    try {
      setSubmitting(true);
      const { data } = await createQueueAPI({
        ...form,
        serviceId
      });

      if (data.success) {
        setToast(true);
        setTimeout(() => {
          setToast(false);
          navigate("/service-provider");
        }, 2000);
      }
    } catch (err) {
      setErrors({ form: err.response?.data?.message || "Failed to create queue" });
    } finally {
      setSubmitting(false);
    }
  };

  if (!serviceId) return <div className="page-wrap"><div className="card">Invalid Service ID</div></div>;

  return (
    <div className="page-wrap">
      {toast && (
        <div className="toast">
          <CheckCircle size={18} color="#86efac" />
          <span>Queue created successfully!</span>
        </div>
      )}

      <div className="card">
        <div className="card-header">
          <button className="back-btn" onClick={() => navigate(-1)}>
            <ArrowLeft size={13} />
            Back
          </button>
          <div className="badge">
            <Timer size={11} />
            Queue Configuration
          </div>
          <h1 className="page-title">Setup Queue for {service?.serviceName}</h1>
          <p className="subtitle">Configure operational rules for this service's queue.</p>
        </div>

        <div className="field-group">
          <label className="field-label">
            <Users size={14} className="field-icon" />
            User Limit (Capacity)
          </label>
          <input
            type="number"
            className="input"
            value={form.userLimit}
            onChange={(e) => update("userLimit", e.target.value)}
          />
          {errors.userLimit && <p className="error-text">{errors.userLimit}</p>}
        </div>

        <div className="grid-2">
          <div className="field-group">
            <label className="field-label">
              <Clock size={14} className="field-icon" />
              Opening Time
            </label>
            <input
              type="time"
              className="input"
              value={form.openingTime}
              onChange={(e) => update("openingTime", e.target.value)}
            />
          </div>
          <div className="field-group">
            <label className="field-label">
              <Clock size={14} className="field-icon" />
              Closing Time
            </label>
            <input
              type="time"
              className="input"
              value={form.closingTime}
              onChange={(e) => update("closingTime", e.target.value)}
            />
          </div>
        </div>

        <div className="divider" />
        <p className="section-label">Break Time (Optional)</p>
        <div className="grid-2">
          <div className="field-group">
            <label className="field-label">
              <Coffee size={14} className="field-icon" />
              Break Starts
            </label>
            <input
              type="time"
              className="input"
              value={form.breakStartTime}
              onChange={(e) => update("breakStartTime", e.target.value)}
            />
          </div>
          <div className="field-group">
            <label className="field-label">
              <Coffee size={14} className="field-icon" />
              Break Ends
            </label>
            <input
              type="time"
              className="input"
              value={form.breakEndTime}
              onChange={(e) => update("breakEndTime", e.target.value)}
            />
          </div>
        </div>

        <div className="field-group">
          <label className="field-label">
            <Timer size={14} className="field-icon" />
            Avg Service Time (mins)
          </label>
          <input
            type="number"
            className="input"
            value={form.avgServiceTime}
            onChange={(e) => update("avgServiceTime", e.target.value)}
          />
        </div>

        {errors.form && <p className="error-text" style={{margin: '10px 0'}}>{errors.form}</p>}

        <div className="actions">
          <button className="btn-secondary" onClick={() => navigate("/service-provider")}>Cancel</button>
          <button className="btn-primary" onClick={handleSubmit} disabled={submitting}>
            {submitting ? "Saving..." : "Finalize Queue"}
          </button>
        </div>
      </div>
    </div>
  );
}
