import React, { useState, useEffect, useRef } from 'react'
import './RegisterPage.css'
import { registerUser } from "../services/api";
import { useNavigate, Link } from 'react-router-dom';

const generatePassword = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
  const arr = new Uint8Array(14);
  window.crypto.getRandomValues(arr);
  return Array.from(arr, (b) => chars[b % chars.length]).join('');
};

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
    <div>
      <div ref={mapRef} style={{ height: '250px', borderRadius: '12px', border: '1px solid rgba(15,23,42,0.14)', marginTop: '0.5rem' }} />
      <p className="helper-text-reg">Click on the map to select your organization's location</p>
    </div>
  );
};

const RegisterPage = () => {
  const navigate = useNavigate();
  const [userType, setUserType] = useState('user');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    organizationName: ''
  });
  const [location, setLocation] = useState(null);
  const [showPassword, setShowPassword] = useState(false);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (error) setError('');
  };

  const handleGeneratePassword = () => {
    const pwd = generatePassword();
    setFormData(prev => ({ ...prev, password: pwd, confirmPassword: pwd }));
    setShowPassword(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    if (userType === 'serviceProvider' && !formData.organizationName) {
      setError('Organization name is required');
      return;
    }

    const payload = {
      name: formData.name,
      email: formData.email,
      password: formData.password,
      phone: formData.phone,
      role: userType === 'serviceProvider' ? 'provider' : 'user',
      organizationName: userType === 'serviceProvider' ? formData.organizationName : undefined,
      location: userType === 'serviceProvider' ? location : undefined
    };

    try {
      setLoading(true);
      await registerUser(payload);
      navigate('/login', { state: { message: 'Registration successful! Please sign in.' } });
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="register-page">
      <div className="register-background-orb orb-left" />
      <div className="register-background-orb orb-right" />

      <div className="register-container">
        <div className="register-card">
          <div className="register-header">
            <h1 className="register-title">Create Account</h1>
            <p className="register-subtitle">Please enter your details to sign up</p>
          </div>

          {error && <div className="error-banner-reg">{error}</div>}

          <form className="register-form" onSubmit={handleSubmit} autoComplete="on">
            <div className="form-group">
              <label className="form-label">I want to register as</label>
              <div className="radio-group">
                <label className="radio-option">
                  <input
                    type="radio"
                    name="userType"
                    value="user"
                    checked={userType === 'user'}
                    onChange={(e) => setUserType(e.target.value)}
                  />
                  <span className="radio-custom"></span>
                  <span className="radio-label">User</span>
                </label>
                <label className="radio-option">
                  <input
                    type="radio"
                    name="userType"
                    value="serviceProvider"
                    checked={userType === 'serviceProvider'}
                    onChange={(e) => setUserType(e.target.value)}
                  />
                  <span className="radio-custom"></span>
                  <span className="radio-label">Service Provider</span>
                </label>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="name" className="form-label">Full Name</label>
              <input
                id="name"
                name="name"
                type="text"
                className="form-input"
                placeholder={userType === 'user' ? 'Enter your full name' : 'Enter your name'}
                value={formData.name}
                onChange={handleInputChange}
                autoComplete="name"
                required
              />
            </div>

            {userType === 'serviceProvider' && (
              <div className="form-group">
                <label htmlFor="organizationName" className="form-label">Organization Name</label>
                <input
                  id="organizationName"
                  name="organizationName"
                  type="text"
                  className="form-input"
                  placeholder="Enter organization name"
                  value={formData.organizationName}
                  onChange={handleInputChange}
                  autoComplete="organization"
                  required
                />
              </div>
            )}

            <div className="form-group">
              <label htmlFor="email" className="form-label">Email</label>
              <input
                id="email"
                name="email"
                type="email"
                className="form-input"
                placeholder="Enter your email"
                value={formData.email}
                onChange={handleInputChange}
                autoComplete="email"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="phone" className="form-label">Phone Number</label>
              <input
                id="phone"
                name="phone"
                type="tel"
                className="form-input"
                placeholder="Enter your phone number"
                value={formData.phone}
                onChange={handleInputChange}
                autoComplete="tel"
                required
              />
            </div>

            <div className="form-group">
              <div className="pw-label-row">
                <label htmlFor="password" className="form-label">Password</label>
                <button
                  type="button"
                  className="btn-generate-pw"
                  onClick={handleGeneratePassword}
                >
                  ✨ Generate Strong Password
                </button>
              </div>
              <input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                className="form-input"
                placeholder="Enter your password"
                value={formData.password}
                onChange={handleInputChange}
                autoComplete="new-password"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="confirmPassword" className="form-label">Confirm Password</label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type={showPassword ? 'text' : 'password'}
                className="form-input"
                placeholder="Confirm your password"
                value={formData.confirmPassword}
                onChange={handleInputChange}
                autoComplete="new-password"
                required
              />
            </div>

            {userType === 'serviceProvider' && (
              <div className="form-group">
                <label className="form-label">Organization Location</label>
                <LocationPicker onLocationSelect={setLocation} />
                {location && (
                  <p className="location-selected">
                    📍 Location selected: {location.lat.toFixed(4)}, {location.lng.toFixed(4)}
                  </p>
                )}
              </div>
            )}

            <button type="submit" className="btn-signup" disabled={loading}>
              {loading ? 'Creating Account...' : 'Sign Up'}
            </button>

            <div className="divider">
              <span>OR</span>
            </div>
          </form>

          <p className="register-footer-text">
            Already have an account?{' '}
            <Link to="/login" className="link-button">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
