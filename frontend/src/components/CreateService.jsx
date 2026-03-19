import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createServiceAPI } from '../services/api';
import './CreateService.css';

const LocationPicker = ({ onLocationSelect }) => {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerRef = useRef(null);

  useEffect(() => {
    if (mapInstanceRef.current) return;

    import('leaflet').then((L) => {
      const leaflet = L.default;
      import('leaflet/dist/leaflet.css').catch(() => {});

      delete leaflet.Icon.Default.prototype._getIconUrl;
      leaflet.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      });

      const map = leaflet.map(mapRef.current).setView([20.5937, 78.9629], 5);
      leaflet.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
      }).addTo(map);

      map.on('click', (e) => {
        const { lat, lng } = e.latlng;
        if (markerRef.current) markerRef.current.setLatLng([lat, lng]);
        else markerRef.current = leaflet.marker([lat, lng]).addTo(map);
        onLocationSelect({ lat, lng });
      });

      mapInstanceRef.current = map;
    });

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  return (
    <div className="map-picker-wrapper">
      <div ref={mapRef} className="map-container-cs" />
      <p className="helper-text-cs">Click on the map to set service location</p>
    </div>
  );
};

const CreateService = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    serviceName: '',
    description: '',
    duration: '',
    avgServiceTime: '15',
    maxTokens: '100',
    status: true
  });
  const [location, setLocation] = useState(null);
  const [file, setFile] = useState(null);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!location) {
      setError('Please select a location on the map');
      return;
    }

    try {
      setLoading(true);
      setError('');

      const data = new FormData();
      data.append('serviceName', formData.serviceName);
      data.append('description', formData.description);
      data.append('duration', formData.duration);
      data.append('avgServiceTime', formData.avgServiceTime);
      data.append('maxTokens', formData.maxTokens);
      data.append('status', formData.status);
      data.append('location', JSON.stringify(location));
      if (file) data.append('certificate', file);

      await createServiceAPI(data);
      alert('Service created successfully!');
      navigate('/service-provider');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create service');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="create-service-page">
      <div className="cs-container">
        <div className="cs-header-row">
          <button className="btn-back" onClick={() => navigate(-1)}>← Back</button>
          <h1 className="cs-title">Create New Service</h1>
        </div>

        <div className="cs-card">
          {error && <div className="error-banner-cs">{error}</div>}
          
          <form className="cs-form" onSubmit={handleSubmit}>
            <div className="form-grid-cs">
              <div className="form-left-cs">
                <div className="form-group-cs">
                  <label className="label-cs">Service Name</label>
                  <input
                    name="serviceName"
                    className="input-cs"
                    placeholder="e.g. Doctor Consultation"
                    value={formData.serviceName}
                    onChange={handleInputChange}
                    required
                  />
                </div>

                <div className="form-group-cs">
                  <label className="label-cs">Description</label>
                  <textarea
                    name="description"
                    className="textarea-cs"
                    placeholder="Tell customers about this service..."
                    value={formData.description}
                    onChange={handleInputChange}
                    rows="4"
                  />
                </div>

                <div className="form-row-cs">
                  <div className="form-group-cs">
                    <label className="label-cs">Avg Service Time (mins)</label>
                    <input
                      name="avgServiceTime"
                      type="number"
                      className="input-cs"
                      value={formData.avgServiceTime}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                  <div className="form-group-cs">
                    <label className="label-cs">Max Tokens/Day</label>
                    <input
                      name="maxTokens"
                      type="number"
                      className="input-cs"
                      value={formData.maxTokens}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                </div>

                <div className="form-group-cs">
                  <label className="label-cs">Business Certificate (Optional)</label>
                  <input
                    type="file"
                    className="file-input-cs"
                    onChange={handleFileChange}
                    accept=".pdf,.jpg,.jpeg,.png"
                  />
                </div>
              </div>

              <div className="form-right-cs">
                <div className="form-group-cs">
                  <label className="label-cs">Service Location</label>
                  <LocationPicker onLocationSelect={setLocation} />
                  {location && (
                    <p className="loc-display-cs">📍 Selected Lattitude: {location.lat.toFixed(6)}, Longitude: {location.lng.toFixed(6)}</p>
                  )}
                </div>

                <div className="form-group-cs status-toggle-cs">
                  <label className="checkbox-label-cs">
                    <input
                      type="checkbox"
                      name="status"
                      checked={formData.status}
                      onChange={handleInputChange}
                    />
                    <span className="checkbox-text">Make service active immediately</span>
                  </label>
                </div>

                <button type="submit" className="btn-submit-cs" disabled={loading}>
                  {loading ? 'Creating Service...' : 'Create Service Now'}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CreateService;
