import React from 'react';
import { MapPin, X } from 'lucide-react';
import './LocationPermissionModal.css';

const LocationPermissionModal = ({ isOpen, onAllow, onCancel, message }) => {
  if (!isOpen) return null;

  return (
    <div className="location-modal-overlay">
      <div className="location-modal-box">
        <button className="location-modal-close" onClick={onCancel} aria-label="Close">
          <X size={20} />
        </button>
        <div className="location-modal-icon">
          <MapPin size={48} className="icon-pulse" />
        </div>
        <h2>Location Access Required</h2>
        <p>{message || "To provide an accurate ETA and 'Time to Leave' notifications, we need your current location."}</p>
        <div className="location-modal-actions">
          <button className="btn-secondary" onClick={onCancel}>Skip (Less Accurate)</button>
          <button className="btn-primary-location" onClick={onAllow}>Allow Access</button>
        </div>
      </div>
    </div>
  );
};

export default LocationPermissionModal;
