import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { createServiceAPI } from "../services/api";
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
  const navigate = useNavigate();
  const [form, setForm] = useState({
    serviceName: "",
    description: "",
    duration: "",
    maxTokens: "",
    certificate: null,
    isActive: true,
    requiredDocuments: ["Aadhar Card", "Address Proof", "Passport Photo"],
    features: [],
    additionalRequirements: "",
  });
  const [featureInput, setFeatureInput] = useState("");
  const [docNameInput, setDocNameInput] = useState("");
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState(false);
  const fileRef = useRef(null);

  const update = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: "" }));
  };

  const validate = () => {
    const e = {};
    if (!form.serviceName.trim()) e.serviceName = "Service name is required";
    if (!form.description.trim()) e.description = "Description is required";
    if (!form.duration || Number(form.duration) <= 0)
      e.duration = "Enter a valid duration in minutes";
    if (!form.maxTokens || Number(form.maxTokens) <= 0)
      e.maxTokens = "Enter a valid token count";
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
      formData.append("duration", String(form.duration));
      formData.append("maxTokens", String(form.maxTokens));
      formData.append("status", String(form.isActive));
      formData.append("requiredDocuments", JSON.stringify(form.requiredDocuments));
      formData.append("features", JSON.stringify(form.features));
      formData.append("additionalRequirements", form.additionalRequirements);
      if (form.certificate) {
        formData.append("certificate", form.certificate);
      }

      const { data } = await createServiceAPI(formData);

      if (!data?.success) {
        setErrors((prev) => ({
          ...prev,
          form: data.message || "Failed to create service",
        }));
        return;
      }

      setToast(true);
      setTimeout(() => {
        setToast(false);
        navigate(`/service-provider/create-queue?serviceId=${data.data._id}`);
      }, 2000);
    } catch (err) {
      setErrors((prev) => ({
        ...prev,
        form:
          err?.response?.data?.message ||
          err?.response?.data?.error ||
          "Something went wrong. Please try again.",
      }));
    } finally {
      setSubmitting(false);
    }
  };

  const handleFile = (e) => {
    const file = e.target.files[0];
    if (file) update("certificate", file);
  };

  const addRequiredDocument = () => {
    const name = docNameInput.trim();
    if (!name) return;
    setForm((prev) => {
      if (prev.requiredDocuments.includes(name)) return prev;
      return { ...prev, requiredDocuments: [...prev.requiredDocuments, name] };
    });
    setDocNameInput("");
  };

  const removeRequiredDocument = (name) => {
    setForm((prev) => ({
      ...prev,
      requiredDocuments: prev.requiredDocuments.filter((d) => d !== name),
    }));
  };

  return (
    <div className="page-wrap">
      {toast && (
        <Toast
          message="Service created successfully!"
          onClose={() => setToast(false)}
        />
      )}

      <div className="card">

        {/* ── Header ── */}
        <div className="card-header">
          <button className="back-btn">
            <ArrowLeft size={13} />
            Back to Services
          </button>

          <div className="badge">
            <Sparkles size={11} />
            Service Configuration
          </div>

          <h1 className="page-title">Create New Service</h1>
          <p className="subtitle">
            Configure a new service offering for your customers on the platform.
          </p>
        </div>

        {/* ── Section: Basic Information ── */}
        <p className="section-label">Basic Information</p>

        <div className="field-group">
          <label className="field-label">
            <Briefcase size={14} className="field-icon" />
            Service Name
          </label>
          <input
            className={`input${errors.serviceName ? " error" : ""}`}
            placeholder="e.g. Premium Consultation"
            value={form.serviceName}
            onChange={(e) => update("serviceName", e.target.value)}
          />
          <FieldError message={errors.serviceName} />
        </div>

        <div className="field-group">
          <label className="field-label">
            <FileText size={14} className="field-icon" />
            Description
          </label>
          <textarea
            className={`textarea${errors.description ? " error" : ""}`}
            placeholder="Describe what this service offers to your customers…"
            value={form.description}
            onChange={(e) => update("description", e.target.value)}
          />
          <FieldError message={errors.description} />
        </div>

        <div className="field-group">
          <label className="field-label">
            <Sparkles size={14} className="field-icon" />
            Additional Requirements
          </label>
          <textarea
            className="textarea"
            placeholder="Any specific instructions or requirements for the users…"
            value={form.additionalRequirements}
            onChange={(e) => update("additionalRequirements", e.target.value)}
          />
        </div>

        {errors.form && <FieldError message={errors.form} />}

        <div className="divider" />

        {/* ── Section: Service Settings ── */}
        <p className="section-label">Service Settings</p>

        <div className="grid-2">
          <div className="field-group">
            <label className="field-label">
              <Clock size={14} className="field-icon" />
              Duration (minutes)
            </label>
            <input
              type="number"
              className={`input${errors.duration ? " error" : ""}`}
              placeholder="e.g. 60"
              min="1"
              value={form.duration}
              onChange={(e) => update("duration", e.target.value)}
            />
            <FieldError message={errors.duration} />
          </div>

          <div className="field-group">
            <label className="field-label">
              <Cpu size={14} className="field-icon" />
              Max Tokens Per Slot
            </label>
            <input
              type="number"
              className={`input${errors.maxTokens ? " error" : ""}`}
              placeholder="e.g. 500"
              min="1"
              value={form.maxTokens}
              onChange={(e) => update("maxTokens", e.target.value)}
            />
            <FieldError message={errors.maxTokens} />
          </div>
        </div>

        <div className="field-group">
          <label className="field-label">
            <Sparkles size={14} className="field-icon" />
            Service Features
          </label>
          <div className="doc-add-row">
            <input
              className="input"
              placeholder="e.g. Free Wi-Fi, Express Lane"
              value={featureInput}
              onChange={(e) => setFeatureInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  const val = featureInput.trim();
                  if (val) {
                    setForm(prev => ({ ...prev, features: [...prev.features, val] }));
                    setFeatureInput("");
                  }
                }
              }}
            />
            <button
              type="button"
              className="btn-add-doc"
              onClick={() => {
                const val = featureInput.trim();
                if (val) {
                  setForm(prev => ({ ...prev, features: [...prev.features, val] }));
                  setFeatureInput("");
                }
              }}
            >
              + Add
            </button>
          </div>
          <ul className="doc-name-list">
            {form.features.map((f, i) => (
              <li key={i} className="doc-name-item">
                <span>{f}</span>
                <button
                  type="button"
                  className="doc-name-remove"
                  onClick={() => setForm(prev => ({ ...prev, features: prev.features.filter((_, idx) => idx !== i) }))}
                >
                  <X size={14} />
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div className="divider" />

        {/* ── Section: Required documents ── */}
        <p className="section-label">Required documents</p>

        <div className="field-group">
          <label className="field-label">
            <ClipboardList size={14} className="field-icon" />
            Documents customers must bring
          </label>
          <div className="doc-add-row">
            <input
              className="input"
              placeholder="Enter document name"
              value={docNameInput}
              onChange={(e) => setDocNameInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addRequiredDocument();
                }
              }}
            />
            <button
              type="button"
              className="btn-add-doc"
              onClick={addRequiredDocument}
            >
              + Add
            </button>
          </div>
          <ul className="doc-name-list">
            {form.requiredDocuments.map((name) => (
              <li key={name} className="doc-name-item">
                <span>{name}</span>
                <button
                  type="button"
                  className="doc-name-remove"
                  onClick={() => removeRequiredDocument(name)}
                  aria-label={`Remove ${name}`}
                >
                  <X size={14} />
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div className="divider" />

        {/* ── Section: Documentation ── */}
        <p className="section-label">Documentation</p>

        <div className="field-group">
          <label className="field-label">
            <FileBadge size={14} className="field-icon" />
            Service Certificate
          </label>

          <div
            className="upload-zone"
            onClick={() => fileRef.current.click()}
          >
            <div className="upload-icon-wrap">
              <Upload size={20} color="#7c3aed" />
            </div>
            <p className="upload-text">Click to upload or drag &amp; drop</p>
            <p className="upload-sub">PDF, PNG, JPG — up to 10 MB</p>
          </div>

          <input
            type="file"
            ref={fileRef}
            style={{ display: "none" }}
            accept=".pdf,.png,.jpg,.jpeg"
            onChange={handleFile}
          />

          {form.certificate && (
            <div className="file-pill">
              <CheckCircle size={13} />
              {form.certificate.name}
            </div>
          )}

          <p className="helper-text">
            Upload proof of certification or authorization for this service.
          </p>
        </div>

        <div className="divider" />

        {/* ── Section: Availability ── */}
        <p className="section-label">Availability</p>

        <div className="field-group">
          <div className="toggle-row">
            <div className="toggle-label-group">
              <span className="toggle-label">Active / visible</span>
              <span className="toggle-sub">
                {form.isActive
                  ? "Bookable by customers after admin approval"
                  : "Hidden from customer view"}
              </span>
            </div>
            <button
              className="toggle-btn"
              onClick={() => update("isActive", !form.isActive)}
              aria-label="Toggle service status"
            >
              {form.isActive ? (
                <ToggleRight size={44} color="#7c3aed" strokeWidth={1.6} />
              ) : (
                <ToggleLeft size={44} color="#334155" strokeWidth={1.6} />
              )}
            </button>
          </div>
        </div>

        {/* ── Actions ── */}
        <div className="actions">
          <button className="btn-secondary">
            <X size={15} />
            Cancel
          </button>
          <button
            className="btn-primary"
            onClick={handleSubmit}
            disabled={submitting}
          >
            <Sparkles size={15} />
            {submitting ? "Creating..." : "Create Service"}
          </button>
        </div>

      </div>
    </div>
  );
}
