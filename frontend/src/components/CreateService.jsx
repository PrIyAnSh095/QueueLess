import { useState, useRef, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { 
  createServiceAPI, 
  getServiceById, 
  requestServiceEditAPI, 
  getMyOrgProfileAPI 
} from "../services/api";
import TimePicker from "./common/TimePicker";
import LocationPicker from "./common/LocationPicker";
import {
  Briefcase,
  FileText,
  Clock,
  Cpu,
  Upload,
  ToggleLeft,
  ToggleRight,
  CheckCircle,
  X,
  Sparkles,
  ArrowLeft,
  FileBadge,
  AlertCircle,
  ClipboardList,
  Plus,
  Trash2,
  Layers,
  MapPin,
  Navigation,
  Globe,
  Camera
} from "lucide-react";
import "./CreateService.css";

/* ─── Toast ──────────────────────────────────────────────────────────────────── */
function Toast({ message, onClose }) {
  return (
    <div className="toast">
      <CheckCircle size={18} color="#86efac" />
      <span>{message}</span>
      <button className="toast-close" onClick={onClose} aria-label="Close">
        <X size={15} />
      </button>
    </div>
  );
}

/* ─── Field Error ────────────────────────────────────────────────────────────── */
function FieldError({ message }) {
  if (!message) return null;
  return (
    <p className="error-text">
      <AlertCircle size={12} />
      {message}
    </p>
  );
}

/* ─── Main Component ─────────────────────────────────────────────────────────── */
export default function CreateService() {
  const [searchParams] = useSearchParams();
  const editId = searchParams.get("edit");
  const navigate = useNavigate();

  const [form, setForm] = useState({
    serviceName: "",
    description: "",
    category: "",
    certificate: null,
    isActive: true,
    address: "",
    location: null,
    photoProof: null,
    requiredDocuments: ["Aadhar Card", "Address Proof", "Passport Photo"],
    queues: [
      {
        queueName: "Main Queue",
        capacity: 10,
        avgServiceTime: 15,
        slotIntervalMinutes: 30,
        openTime: "09:00",
        closeTime: "17:00",
        workingDays: [1, 2, 3, 4, 5],
        activeStatus: true
      }
    ]
  });

  const [orgData, setOrgData] = useState(null);
  const [locationMode, setLocationMode] = useState("default"); // default, current, map
  const [docNameInput, setDocNameInput] = useState("");
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState(false);
  const fileRef = useRef(null);
  const proofRef = useRef(null);

  useEffect(() => {
    const init = async () => {
      try {
        const orgRes = await getMyOrgProfileAPI();
        const orgData = orgRes.data?.data;
        if (orgData) setOrgData(orgData);
        
        if (editId) {
          const res = await getServiceById(editId);
          const s = res.data?.data;
          if (s) {
            setForm(prev => ({
              ...prev,
              serviceName: s.serviceName || "",
              description: s.description || "",
              category: s.category || "General",
              address: s.address || "",
              location: s.location?.coordinates ? { lat: s.location.coordinates[1], lng: s.location.coordinates[0] } : null,
              isActive: s.status !== false,
              queues: s.queues && Array.isArray(s.queues) ? s.queues : prev.queues
            }));
            // If it has location, set mode to map for visualization
            if (s.location?.coordinates) setLocationMode("map");
          }
        } else if (orgData) {
           setForm(prev => ({
             ...prev,
             address: orgData.address || "",
             location: orgData.location || null
           }));
        }
      } catch (err) {
        console.error("Initialization error:", err);
      }
    };
    init();
  }, [editId]);

  const update = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: "" }));
  };

  const updateQueue = (index, key, value) => {
    const newQueues = [...form.queues];
    newQueues[index] = { ...newQueues[index], [key]: value };
    setForm((prev) => ({ ...prev, queues: newQueues }));
  };

  const addQueue = () => {
    setForm((prev) => ({
      ...prev,
      queues: [
        ...prev.queues,
        {
          queueName: `Queue ${prev.queues.length + 1}`,
          capacity: 10,
          avgServiceTime: 15,
          slotIntervalMinutes: 30,
          openTime: "09:00",
          closeTime: "17:00",
          workingDays: [1, 2, 3, 4, 5],
          activeStatus: true
        }
      ]
    }));
  };

  const removeQueue = (index) => {
    if (form.queues.length <= 1) return;
    setForm((prev) => ({
      ...prev,
      queues: prev.queues.filter((_, i) => i !== index)
    }));
  };

  const addRequiredDocument = () => {
    if (docNameInput.trim() && !form.requiredDocuments.includes(docNameInput.trim())) {
      setForm(prev => ({
        ...prev,
        requiredDocuments: [...prev.requiredDocuments, docNameInput.trim()]
      }));
      setDocNameInput("");
    }
  };

  const removeRequiredDocument = (name) => {
    setForm(prev => ({
      ...prev,
      requiredDocuments: prev.requiredDocuments.filter(d => d !== name)
    }));
  };

  const setLocationToDefault = () => {
    if (orgData) {
      update("address", orgData.address || "");
      update("location", orgData.location || null);
      setLocationMode("default");
    }
  };

  const setLocationToCurrent = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(async (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        console.log(`%c[GPS_DEBUG] 🛰️ Create Service Scan: ${latitude}, ${longitude} (Acc: ${accuracy}m)`, "color: #8b5cf6; font-weight: bold; background: #2e1065; padding: 4px; border-radius: 4px;");
        update("location", { lat: latitude, lng: longitude });
        setLocationMode("current");
        // Optional: reverse geocode to set address
        try {
          const res = await fetch(`https://photon.komoot.io/reverse?lon=${longitude}&lat=${latitude}`);
          const data = await res.json();
          if (data.features?.length > 0) {
            const props = data.features[0].properties;
            const addr = [props.name, props.city, props.state, props.country].filter(Boolean).join(", ");
            update("address", addr);
          }
        } catch(e) {}
      });
    }
  };

  const validate = () => {
    const e = {};
    if (!form.serviceName.trim()) e.serviceName = "Service name is required";
    if (!form.description.trim()) e.description = "Description is required";
    if (!form.category.trim()) e.category = "Category is required";
    if (!form.address.trim()) e.address = "Address is required";
    
    if (editId && !form.photoProof) {
      e.photoProof = "Photo proof is required for editing a service";
    }

    form.queues.forEach((q, i) => {
      if (!q.queueName.trim()) e[`queueName_${i}`] = "Queue name is required";
    });

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
      const formData = new FormData();
      formData.append("serviceName", form.serviceName);
      formData.append("description", form.description);
      formData.append("category", form.category);
      formData.append("status", String(form.isActive));
      formData.append("address", form.address);
      if (form.location) formData.append("location", JSON.stringify(form.location));
      formData.append("requiredDocuments", JSON.stringify(form.requiredDocuments));
      
      if (!editId) {
        formData.append("queues", JSON.stringify(form.queues));
        if (form.certificate) formData.append("certificate", form.certificate);
        await createServiceAPI(formData);
      } else {
        if (form.photoProof) formData.append("certificate", form.photoProof); // Controller uses req.file
        await requestServiceEditAPI(editId, formData);
      }

      setToast(true);
      setTimeout(() => {
        setToast(false);
        navigate("/service-provider");
      }, 2000);
    } catch (err) {
      setErrors((prev) => ({
        ...prev,
        form: err?.response?.data?.message || "Something went wrong. Please try again."
      }));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="page-wrap">
      {toast && <Toast message={editId ? "Edit request submitted!" : "Service created successfully!"} onClose={() => setToast(false)} />}

      <div className="card">
        <div className="card-header">
          <button className="back-btn" onClick={() => navigate(-1)}><ArrowLeft size={13} /> Back</button>
          <div className="badge"><Sparkles size={11} /> {editId ? "Edit Request" : "Service Configuration"}</div>
          <h1 className="page-title">{editId ? "Update Service" : "Create New Service"}</h1>
          <p className="subtitle">{editId ? "Submit changes for admin approval. Old data remains active until approved." : "Configure a new service offering and its corresponding queues."}</p>
        </div>

        {errors.form && <div className="error-banner-cs">{errors.form}</div>}

        <div className="cs-sections-grid">
           <div className="cs-main-panel">
              <p className="section-label">Basic Information</p>
              <div className="field-group">
                <label className="field-label"><Briefcase size={14} className="field-icon" /> Service Name</label>
                <input
                  className={`input${errors.serviceName ? " error" : ""}`}
                  placeholder="e.g. Health Checkup"
                  value={form.serviceName}
                  onChange={(e) => update("serviceName", e.target.value)}
                />
                <FieldError message={errors.serviceName} />
              </div>

              <div className="grid-2">
                <div className="field-group">
                  <label className="field-label"><Layers size={14} className="field-icon" /> Category</label>
                  <input
                    className={`input${errors.category ? " error" : ""}`}
                    placeholder="e.g. Medical, Banking"
                    value={form.category}
                    onChange={(e) => update("category", e.target.value)}
                  />
                  <FieldError message={errors.category} />
                </div>
                <div className="field-group">
                   <label className="field-label">Visibility</label>
                   <div className="toggle-box" onClick={() => update("isActive", !form.isActive)}>
                      {form.isActive ? <ToggleRight size={28} color="#8b5cf6" /> : <ToggleLeft size={28} color="#94a3b8" />}
                      <span>{form.isActive ? "Live" : "Offline"}</span>
                   </div>
                </div>
              </div>

              <div className="field-group">
                <label className="field-label"><FileText size={14} className="field-icon" /> Description</label>
                <textarea
                  className={`textarea${errors.description ? " error" : ""}`}
                  placeholder="Describe what this service offers..."
                  value={form.description}
                  onChange={(e) => update("description", e.target.value)}
                />
                <FieldError message={errors.description} />
              </div>

              <div className="divider" />

              <p className="section-label">Service Location</p>
              <div className="location-selection-modes">
                 <button 
                   className={`mode-btn ${locationMode === 'default' ? 'active' : ''}`}
                   onClick={setLocationToDefault}
                 >
                   <Globe size={16} /> Default Address
                 </button>
                 <button 
                   className={`mode-btn ${locationMode === 'current' ? 'active' : ''}`}
                   onClick={setLocationToCurrent}
                 >
                   <Navigation size={16} /> Current GPS
                 </button>
                 <button 
                   className={`mode-btn ${locationMode === 'map' ? 'active' : ''}`}
                   onClick={() => setLocationMode("map")}
                 >
                   <MapPin size={16} /> Select on Map
                 </button>
              </div>

              <div className="field-group" style={{marginTop: '1rem'}}>
                <label className="field-label">Physical Address</label>
                <input
                  className={`input${errors.address ? " error" : ""}`}
                  placeholder="Enter the full address of the service place"
                  value={form.address}
                  onChange={(e) => update("address", e.target.value)}
                />
                <FieldError message={errors.address} />
              </div>

              {locationMode === 'map' && (
                <div className="field-group">
                   <LocationPicker 
                     onLocationSelect={(loc) => {
                       update("location", { lat: loc.lat, lng: loc.lng });
                     }} 
                     initialLocation={form.location}
                     initialAddress={form.address}
                   />
                </div>
              )}

              {form.location && (
                <p className="location-preview-text">
                  <strong>Saved address:</strong> {form.address || 'N/A'}<br />
                  <strong>Coordinates:</strong> {form.location.lat.toFixed(4)}, {form.location.lng.toFixed(4)}
                </p>
              )}

              {editId && (
                <>
                  <div className="divider" />
                  <p className="section-label required-mark">Approval Verification</p>
                  <div className="field-group">
                    <label className="field-label"><Camera size={14} className="field-icon" /> Photo Proof of Change</label>
                    <div className={`file-upload-zone ${errors.photoProof ? 'error' : ''}`} onClick={() => proofRef.current?.click()}>
                      <input
                        type="file"
                        ref={proofRef}
                        style={{ display: "none" }}
                        onChange={(e) => update("photoProof", e.target.files[0])}
                        accept="image/*"
                      />
                      {form.photoProof ? (
                        <div className="file-picked">
                          <CheckCircle size={20} color="#86efac" />
                          <span>{form.photoProof.name}</span>
                        </div>
                      ) : (
                        <div className="file-placeholder">
                          <Upload size={24} />
                          <p>Upload photo proof for admin approval</p>
                        </div>
                      )}
                    </div>
                    <FieldError message={errors.photoProof} />
                  </div>
                </>
              )}
           </div>

           <div className="cs-side-panel">
              {!editId && (
                <>
                  <div className="queues-header">
                    <p className="section-label">Queues</p>
                    <button className="btn-add-queue" onClick={addQueue}><Plus size={16} /></button>
                  </div>

                  <div className="queues-list">
                    {form.queues.map((q, index) => (
                      <div key={index} className="queue-item-card mini">
                        <div className="queue-item-header">
                          <input
                            className="mini-q-input"
                            value={q.queueName}
                            onChange={(e) => updateQueue(index, "queueName", e.target.value)}
                          />
                          {form.queues.length > 1 && (
                            <button className="btn-remove-queue" onClick={() => removeQueue(index)}>
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                        <div className="mini-q-grid">
                           <div className="mini-field">
                              <label>Max</label>
                              <input type="number" value={q.capacity} onChange={(e) => updateQueue(index, "capacity", Number(e.target.value))} />
                           </div>
                           <div className="mini-field">
                              <label>Time</label>
                              <input type="number" value={q.avgServiceTime} onChange={(e) => updateQueue(index, "avgServiceTime", Number(e.target.value))} />
                           </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="divider" />
                </>
              )}

              <p className="section-label">Required Docs</p>
              <div className="field-group">
                <div className="doc-add-row">
                  <input
                    className="input mini"
                    placeholder="Doc name..."
                    value={docNameInput}
                    onChange={(e) => setDocNameInput(e.target.value)}
                  />
                  <button type="button" className="btn-add-doc" onClick={addRequiredDocument}>+</button>
                </div>
                <ul className="doc-name-list mini">
                  {form.requiredDocuments.map((name) => (
                    <li key={name} className="doc-name-item">
                      <span>{name}</span>
                      <button type="button" onClick={() => removeRequiredDocument(name)}><X size={12} /></button>
                    </li>
                  ))}
                </ul>
              </div>

              {!editId && (
                <div className="field-group" style={{marginTop: '1.5rem'}}>
                  <label className="field-label"><FileBadge size={14} className="field-icon" /> Service Certificate</label>
                  <div className="file-upload-zone small" onClick={() => fileRef.current?.click()}>
                    <input
                      type="file"
                      ref={fileRef}
                      style={{ display: "none" }}
                      onChange={(e) => update("certificate", e.target.files[0])}
                      accept=".pdf,.jpg,.jpeg,.png"
                    />
                    {form.certificate ? <CheckCircle size={20} color="#86efac" /> : <Upload size={20} />}
                  </div>
                </div>
              )}
           </div>
        </div>

        <div className="actions">
          <button className="btn-secondary" onClick={() => navigate(-1)}><X size={15} /> Cancel</button>
          <button className="btn-primary" onClick={handleSubmit} disabled={submitting}>
            <Sparkles size={15} /> {submitting ? "Submitting..." : (editId ? "Submit Edit Request" : "Create Service")}
          </button>
        </div>
      </div>
    </div>
  );
}
