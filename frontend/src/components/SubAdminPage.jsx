import React, { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { registerUser } from '../services/api'
import './SubAdminPage.css'

const SubAdminPage = () => {
  const navigate = useNavigate()

  const [form, setForm] = useState({
    fullName: '',
    email: '',
    password: '',
    canManageOrganizations: true,
    canManageBookings: true,
    canViewUsers: true,
  })

  const canSubmit = useMemo(() => {
    return (
      form.fullName.trim().length > 0 &&
      form.email.trim().length > 0 &&
      form.password.trim().length >= 6
    )
  }, [form])

  const onChange = (key) => (e) => {
    const value = e?.target?.type === 'checkbox' ? e.target.checked : e.target.value
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canSubmit) return;

    try {
      setLoading(true);
      setError('');
      await registerUser({
        name: form.fullName,
        email: form.email,
        password: form.password,
        role: 'admin'
      });
      alert('Sub admin created successfully!');
      navigate('/admin');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create sub admin');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="subadmin-page">
      <div className="subadmin-container">
        <div className="subadmin-header">
          <div>
            <h1 className="subadmin-title">Add Sub Admin</h1>
            <p className="subadmin-subtitle">Create a restricted admin account</p>
          </div>
          <button className="subadmin-btn-secondary" onClick={() => navigate('/admin')}>
            Back to Admin
          </button>
        </div>

        {error && <div className="subadmin-error-banner">{error}</div>}

        <form className="subadmin-form" onSubmit={handleSubmit}>
          <div className="subadmin-grid">
            <div className="subadmin-field">
              <label className="subadmin-label">Full Name</label>
              <input
                className="subadmin-input"
                value={form.fullName}
                onChange={onChange('fullName')}
                placeholder="e.g. Aryan Kumar"
              />
            </div>

            <div className="subadmin-field">
              <label className="subadmin-label">Email</label>
              <input
                className="subadmin-input"
                value={form.email}
                onChange={onChange('email')}
                type="email"
                placeholder="e.g. subadmin@domain.com"
              />
            </div>

            <div className="subadmin-field">
              <label className="subadmin-label">Password</label>
              <input
                className="subadmin-input"
                value={form.password}
                onChange={onChange('password')}
                type="password"
                placeholder="Minimum 6 characters"
              />
            </div>
          </div>

          <div className="subadmin-permissions">
            <h2 className="subadmin-section-title">Permissions</h2>

            <label className="subadmin-checkbox">
              <input
                type="checkbox"
                checked={form.canManageOrganizations}
                onChange={onChange('canManageOrganizations')}
              />
              <span>Manage organizations</span>
            </label>

            <label className="subadmin-checkbox">
              <input
                type="checkbox"
                checked={form.canManageBookings}
                onChange={onChange('canManageBookings')}
              />
              <span>Manage bookings</span>
            </label>

            <label className="subadmin-checkbox">
              <input
                type="checkbox"
                checked={form.canViewUsers}
                onChange={onChange('canViewUsers')}
              />
              <span>View users</span>
            </label>
          </div>

          <div className="subadmin-actions">
            <button
              type="button"
              className="subadmin-btn-secondary"
              onClick={() => navigate('/admin')}
            >
              Cancel
            </button>
            <button type="submit" className="subadmin-btn-primary" disabled={!canSubmit || loading}>
              {loading ? 'Creating...' : 'Create Sub Admin'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default SubAdminPage


