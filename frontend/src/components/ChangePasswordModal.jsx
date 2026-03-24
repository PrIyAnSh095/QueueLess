import React, { useState } from 'react';
import { changePasswordAPI } from '../services/api';
import './ChangePasswordModal.css';

const ChangePasswordModal = ({ isOpen, onClose }) => {
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setSuccess('');
    if (form.newPassword !== form.confirmPassword) { setError('Passwords do not match'); return; }
    if (form.newPassword.length < 8) { setError('Password must be at least 8 characters'); return; }
    try {
      setLoading(true);
      await changePasswordAPI({ currentPassword: form.currentPassword, newPassword: form.newPassword });
      setSuccess('Password changed successfully!');
      setForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setTimeout(() => { onClose(); setSuccess(''); }, 1500);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to change password');
    } finally { setLoading(false); }
  };

  if (!isOpen) return null;

  return (
    <div className="chpw-overlay" onClick={onClose}>
      <div className="chpw-modal" onClick={e => e.stopPropagation()}>
        <button className="chpw-close" onClick={onClose}>×</button>
        <h2>Change Password</h2>
        <p className="chpw-sub">Enter your current password and choose a new one</p>
        {error && <div className="chpw-error">{error}</div>}
        {success && <div className="chpw-success">{success}</div>}
        <form onSubmit={handleSubmit}>
          <div className="chpw-field">
            <label>Current Password</label>
            <input type="password" value={form.currentPassword} onChange={e => setForm(p => ({...p, currentPassword: e.target.value}))} required />
          </div>
          <div className="chpw-field">
            <label>New Password</label>
            <input type="password" value={form.newPassword} onChange={e => setForm(p => ({...p, newPassword: e.target.value}))} required />
          </div>
          <div className="chpw-field">
            <label>Confirm New Password</label>
            <input type="password" value={form.confirmPassword} onChange={e => setForm(p => ({...p, confirmPassword: e.target.value}))} required />
          </div>
          <button type="submit" className="chpw-btn" disabled={loading}>
            {loading ? 'Changing...' : 'Change Password'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ChangePasswordModal;
