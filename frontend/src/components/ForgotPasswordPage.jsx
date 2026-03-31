import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { forgotPasswordAPI, resetPasswordAPI } from '../services/api';
import './LoginPage.css';

const ForgotPasswordPage = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1); // 1=email, 2=otp+new password
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSendOTP = async (e) => {
    e.preventDefault();
    if (!email) { setError('Email is required'); return; }
    try {
      setLoading(true); setError('');
      await forgotPasswordAPI(email);
      setSuccess('If this email is registered, you will receive an OTP.');
      setStep(2);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send OTP');
    } finally { setLoading(false); }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) { setError('Passwords do not match'); return; }
    if (newPassword.length < 8) { setError('Password must be at least 8 characters'); return; }
    try {
      setLoading(true); setError('');
      await resetPasswordAPI({ email, otp, newPassword });
      setSuccess('Password reset successfully! Redirecting to login...');
      setTimeout(() => navigate('/login'), 2000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to reset password');
    } finally { setLoading(false); }
  };

  return (
    <div className="login-page">
      <div className="login-background-orb orb-left" />
      <div className="login-background-orb orb-right" />
      <div className="login-container">
        <div className="login-card">
          <div className="login-header">
            <h1 className="login-title">{step === 1 ? 'Forgot Password' : 'Reset Password'}</h1>
            <p className="login-subtitle">
              {step === 1 ? 'Enter your email to receive a reset code' : 'Enter the verification code and your new password'}
            </p>
          </div>
          {error && <div className="error-banner">{error}</div>}
          {success && <div className="error-banner" style={{background:'rgba(34,197,94,0.1)',color:'#22c55e',borderColor:'rgba(34,197,94,0.2)'}}>{success}</div>}

          {step === 1 ? (
            <form className="login-form" onSubmit={handleSendOTP}>
              <div className="form-group">
                <label className="form-label">Email</label>
                <input type="email" className="form-input" placeholder="Enter your email" value={email} onChange={e => setEmail(e.target.value)} required />
              </div>
              <button type="submit" className="btn-signin" disabled={loading}>
                {loading ? 'Sending...' : 'Send Verification Code'}
              </button>
            </form>
          ) : (
            <form className="login-form" onSubmit={handleResetPassword}>
              <div className="form-group">
                <label className="form-label">Verification Code</label>
                <input type="text" className="form-input" placeholder="Enter 6-digit code" value={otp} onChange={e => setOtp(e.target.value)} maxLength={6} required />
              </div>
              <div className="form-group">
                <label className="form-label">New Password</label>
                <input type="password" className="form-input" placeholder="Enter new password" value={newPassword} onChange={e => setNewPassword(e.target.value)} required />
              </div>
              <div className="form-group">
                <label className="form-label">Confirm Password</label>
                <input type="password" className="form-input" placeholder="Confirm new password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required />
              </div>
              <button type="submit" className="btn-signin" disabled={loading}>
                {loading ? 'Resetting...' : 'Reset Password'}
              </button>
            </form>
          )}

          <p className="login-footer-text">
            Remember your password? <Link to="/login" className="link-button">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
