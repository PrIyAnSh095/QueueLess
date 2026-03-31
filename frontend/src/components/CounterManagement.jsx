import React, { useState, useEffect } from 'react';
import {
  getOrgStaffAPI,
  createOrgStaffAPI,
  getOrgCountersAPI,
  createOrgCounterAPI,
  getOrgServicesAPI,
  deleteOrgCounterAPI
} from '../services/api';
import './CounterManagement.css';

const CounterManagement = () => {
  const [staff, setStaff] = useState([]);
  const [counters, setCounters] = useState([]);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Combined "Add Staff + Assign Counter" form
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'counter',
    counterName: '',
    service: '',
    createCounter: false
  });

  // Standalone assign counter to existing staff
  const [assignForm, setAssignForm] = useState({ name: '', service: '', userId: '' });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [staffRes, countersRes, servicesRes] = await Promise.all([
        getOrgStaffAPI(),
        getOrgCountersAPI(),
        getOrgServicesAPI()
      ]);
      setStaff(staffRes.data.data || []);
      setCounters(countersRes.data.data || []);
      setServices(servicesRes.data.data || []);
    } catch {
      setError('Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const showMsg = (msg, isError = false) => {
    if (isError) { setError(msg); setSuccess(''); }
    else { setSuccess(msg); setError(''); }
    setTimeout(() => { setError(''); setSuccess(''); }, 4000);
  };

  const handleCreateStaff = async (e) => {
    e.preventDefault();
    try {
      const staffRes = await createOrgStaffAPI({
        name: form.name,
        email: form.email,
        password: form.password,
        role: form.role
      });
      const newStaffId = staffRes.data.data._id;

      if (form.createCounter && form.counterName) {
        await createOrgCounterAPI({
          name: form.counterName,
          service: form.service || undefined,
          userId: newStaffId
        });
      }

      setForm({ name: '', email: '', password: '', role: 'counter', counterName: '', service: '', createCounter: false });
      showMsg(form.createCounter ? 'Staff registered and counter created!' : 'Staff registered successfully!');
      fetchData();
    } catch (err) {
      showMsg(err.response?.data?.message || 'Failed to create staff', true);
    }
  };

  const handleAssignCounter = async (e) => {
    e.preventDefault();
    try {
      await createOrgCounterAPI({
        name: assignForm.name,
        service: assignForm.service || undefined,
        userId: assignForm.userId
      });
      setAssignForm({ name: '', service: '', userId: '' });
      showMsg('Counter created and assigned!');
      fetchData();
    } catch (err) {
      showMsg(err.response?.data?.message || 'Failed to create counter', true);
    }
  };

  const handleDeleteCounter = async (id) => {
    if (!window.confirm('Delete this counter?')) return;
    try {
      await deleteOrgCounterAPI(id);
      fetchData();
    } catch {
      showMsg('Failed to delete counter', true);
    }
  };

  if (loading) return <div className="cm-loading">Loading Counter Management...</div>;

  // Staff without an assigned counter
  const unassignedStaff = staff.filter(s =>
    s.role === 'counter' && !counters.some(c => String(c.user?._id || c.user) === String(s._id))
  );

  return (
    <div className="counter-management">
      <div className="cm-header">
        <h2>Counter & Staff Management</h2>
        <p>Register staff and configure service counters for your organization</p>
      </div>

      {error && <div className="cm-banner error">{error}</div>}
      {success && <div className="cm-banner success">{success}</div>}

      <div className="cm-grid">
        {/* === Add New Staff (+ optional counter) === */}
        <section className="cm-card">
          <h3>➕ Register New Staff</h3>
          <form className="cm-form" onSubmit={handleCreateStaff}>
            <input
              type="text" placeholder="Full Name" required
              value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
            />
            <input
              type="email" placeholder="Email Address" required
              value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
            />
            <input
              type="password" placeholder="Temporary Password" required
              value={form.password} onChange={e => setForm({ ...form, password: e.target.value })}
            />
            <select value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}>
              <option value="counter">Counter Staff</option>
              <option value="reception">Receptionist</option>
            </select>

            <label className="cm-checkbox-row">
              <input
                type="checkbox"
                checked={form.createCounter}
                onChange={e => setForm({ ...form, createCounter: e.target.checked })}
              />
              <span>Also create & assign a counter for this staff</span>
            </label>

            {form.createCounter && (
              <div className="cm-sub-fields">
                <input
                  type="text" placeholder="Counter Name (e.g. Counter 1)" required={form.createCounter}
                  value={form.counterName} onChange={e => setForm({ ...form, counterName: e.target.value })}
                />
                <select value={form.service} onChange={e => setForm({ ...form, service: e.target.value })}>
                  <option value="">Link to Service (optional)</option>
                  {services.map(s => (
                    <option key={s._id} value={s._id}>{s.serviceName}</option>
                  ))}
                </select>
              </div>
            )}

            <button type="submit" className="btn-primary">
              {form.createCounter ? 'Register Staff & Create Counter' : 'Register Staff'}
            </button>
          </form>

          {/* Existing Staff List */}
          <div className="staff-list">
            <h4>Existing Staff ({staff.length})</h4>
            {staff.length === 0
              ? <p className="cm-empty">No staff registered yet.</p>
              : staff.map(s => {
                const assignedCounter = counters.find(c => String(c.user?._id || c.user) === String(s._id));
                return (
                  <div key={s._id} className="staff-item">
                    <div className="staff-info">
                      <strong>{s.name}</strong>
                      <span>{s.role} · {s.email}</span>
                      {assignedCounter
                        ? <span className="counter-tag">📍 {assignedCounter.name}</span>
                        : <span className="unassigned-tag">No counter assigned</span>
                      }
                    </div>
                  </div>
                );
              })}
          </div>
        </section>

        {/* === Assign Counter to Existing Staff === */}
        <section className="cm-card">
          <h3>🔗 Assign Counter to Existing Staff</h3>
          {unassignedStaff.length === 0 ? (
            <p className="cm-empty">All counter staff already have counters assigned.</p>
          ) : (
            <form className="cm-form" onSubmit={handleAssignCounter}>
              <input
                type="text" placeholder="Counter Name (e.g. Counter 2)" required
                value={assignForm.name} onChange={e => setAssignForm({ ...assignForm, name: e.target.value })}
              />
              <select required value={assignForm.userId} onChange={e => setAssignForm({ ...assignForm, userId: e.target.value })}>
                <option value="">Select Unassigned Staff</option>
                {unassignedStaff.map(s => (
                  <option key={s._id} value={s._id}>{s.name} ({s.email})</option>
                ))}
              </select>
              <select value={assignForm.service} onChange={e => setAssignForm({ ...assignForm, service: e.target.value })}>
                <option value="">Link to Service (optional)</option>
                {services.map(s => (
                  <option key={s._id} value={s._id}>{s.serviceName}</option>
                ))}
              </select>
              <button type="submit" className="btn-primary">Create Counter</button>
            </form>
          )}

          {/* Live Counters */}
          <div className="counter-list">
            <h4>Live Counters ({counters.length})</h4>
            {counters.length === 0
              ? <p className="cm-empty">No counters configured yet.</p>
              : counters.map(c => (
                <div key={c._id} className="counter-item">
                  <div className="counter-info">
                    <strong>{c.name}</strong>
                    <span>{c.service?.serviceName || 'No service'} · {c.user?.name || 'Unassigned'}</span>
                    <span className="counter-email">{c.user?.email}</span>
                  </div>
                  <button className="btn-delete" onClick={() => handleDeleteCounter(c._id)} title="Delete counter">×</button>
                </div>
              ))
            }
          </div>
        </section>
      </div>
    </div>
  );
};

export default CounterManagement;
