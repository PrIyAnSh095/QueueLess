import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  getMyOrgProfileAPI,
  getOrgStatsAPI,
  getOrgServicesAPI,
  getOrgQueueUsersAPI,
  getOrgHistoryAPI,
  serveNextAPI,
  updateServiceAPI,
  deleteServiceAPI,
  toggleQueueBreakAPI,
  uploadFileAPI,
  acceptAvgTimeAPI
} from '../services/api'
import { useAdminSocket } from '../utils/useSocket'
import LocationPicker from './LocationPicker'
import './ServiceProviderPage.css'

const ServiceProviderPage = () => {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('dashboard')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [orgInfo, setOrgInfo] = useState(null)
  const [stats, setStats] = useState(null)
  const [services, setServices] = useState([])
  const [bookings, setBookings] = useState([])
  const [historyData, setHistoryData] = useState({ history: [], stats: { usersServed: 0, avgWaitTime: 0 } })
  const [historyRange, setHistoryRange] = useState('today')
  const [settingsForm, setSettingsForm] = useState({ businessName: '', phone: '', address: '', description: '' })
  const [passwordForm, setPasswordForm] = useState({ oldPassword: '', newPassword: '', confirmPassword: '' })
  const [updating, setUpdating] = useState(false)
  const [selectedLocation, setSelectedLocation] = useState(null)
  const [addressPhoto, setAddressPhoto] = useState(null)
  const [isAddressChange, setIsAddressChange] = useState(false)

  const fetchData = useCallback(async (isPolling = false) => {
    try {
      if (!isPolling) setLoading(true)
      setError('')

      const [orgRes, statsRes, servicesRes, bookingsRes, historyRes] = await Promise.allSettled([
        getMyOrgProfileAPI(),
        getOrgStatsAPI(),
        getOrgServicesAPI(),
        getOrgQueueUsersAPI(),
        getOrgHistoryAPI({ range: historyRange })
      ])

      if (orgRes.status === 'fulfilled') {
        setOrgInfo(orgRes.value.data.data)
      } else {
        throw orgRes.reason
      }

      if (statsRes.status === 'fulfilled') setStats(statsRes.value.data.data)
      if (servicesRes.status === 'fulfilled') setServices(servicesRes.value.data.data)
      if (bookingsRes.status === 'fulfilled') setBookings(bookingsRes.value.data.data)
      if (historyRes.status === 'fulfilled') {
        setHistoryData(historyRes.value.data.data)
      } else {
        console.error('Failed to fetch history data:', historyRes.reason)
      }
    } catch (err) {
      console.error('Failed to fetch dashboard data:', err)
      setError(err.response?.data?.message || 'Failed to load provider dashboard')
    } finally {
      if (!isPolling) setLoading(false)
    }
  }, [historyRange])

  useEffect(() => {
    fetchData()
    const interval = setInterval(() => {
      fetchData(true)
    }, 30000)
    return () => clearInterval(interval)
  }, [fetchData])

  const handleAdminUpdate = useCallback(() => {
    fetchData(true)
  }, [fetchData])

  // Listen for admin/global updates that might affect this provider
  useAdminSocket(handleAdminUpdate)

  useEffect(() => {
    if (orgInfo) {
      setSettingsForm({
        businessName: orgInfo.businessName || '',
        phone: orgInfo.phone || '',
        address: orgInfo.address || '',
        description: orgInfo.description || ''
      })
      if (orgInfo.location?.lat != null && orgInfo.location?.lng != null) {
        setSelectedLocation({ lat: orgInfo.location.lat, lng: orgInfo.location.lng })
      } else {
        setSelectedLocation(null)
      }
      setIsAddressChange(false)
      setAddressPhoto(null)
    }
  }, [orgInfo])

  useEffect(() => {
    if (!loading && orgInfo && orgInfo.status !== 'approved') {
      navigate('/org-status', { replace: true })
    }
  }, [loading, navigate, orgInfo])

  const handleUpdateProfile = async (e) => {
    e.preventDefault()
    try {
      setUpdating(true)
      const { updateMyOrgProfileAPI } = await import('../services/api')

      const hasLocationChanged =
        (selectedLocation?.lat ?? null) !== (orgInfo?.location?.lat ?? null) ||
        (selectedLocation?.lng ?? null) !== (orgInfo?.location?.lng ?? null)

      const isAddressChanging =
        settingsForm.address.trim() !== (orgInfo?.address || '').trim() ||
        hasLocationChanged

      if (isAddressChanging && !addressPhoto) {
        alert('Please upload a photo proof when changing address or pin location')
        return
      }

      const updateData = {
        ...settingsForm,
        location: selectedLocation
      }

      if (isAddressChanging) {
        // Upload photo to backend
        const uploadRes = await uploadFileAPI(addressPhoto)
        updateData.photoProof = uploadRes.data.data.url
      }

      const result = await updateMyOrgProfileAPI(updateData)

      if (isAddressChanging) {
        alert('Address change request submitted for admin approval')
        setAddressPhoto(null)
        setIsAddressChange(false)
      } else {
        alert('Profile updated successfully')
      }

      fetchData(true)
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update profile')
    } finally {
      setUpdating(false)
    }
  }

  const handleChangePassword = async (e) => {
    e.preventDefault()
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      return alert('Passwords do not match')
    }
    try {
      setUpdating(true)
      const { changePasswordAPI } = await import('../services/api')
      await changePasswordAPI({
        oldPassword: passwordForm.oldPassword,
        newPassword: passwordForm.newPassword
      })
      alert('Password changed successfully')
      setPasswordForm({ oldPassword: '', newPassword: '', confirmPassword: '' })
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to change password')
    } finally {
      setUpdating(false)
    }
  }

  const handleAvgTimeSuggestion = async (accept) => {
    if (accept) {
      const confirmed = window.confirm(
        `QueueLess suggests updating your average service time to ${orgInfo?.suggestedAvgServiceTime || 0} minutes across your queues. Apply it now?`
      )
      if (!confirmed) return
    }

    try {
      setUpdating(true)
      await acceptAvgTimeAPI(accept)
      await fetchData(true)

      if (accept) {
        const wantsReview = window.confirm('Average time updated. Do you also want to review and adjust your service timings now?')
        if (wantsReview) {
          navigate('/service-provider/manage-queues')
        }
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to process average time suggestion')
    } finally {
      setUpdating(false)
    }
  }

  const handleServeNext = async (serviceId) => {
    try {
      await serveNextAPI(serviceId)
      fetchData(true)
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to serve next user')
    }
  }

  const handleToggleBreak = async (queueId) => {
    try {
      await toggleQueueBreakAPI(queueId)
      fetchData(true)
    } catch (err) {
      alert('Failed to toggle break status')
    }
  }

  const handleDeleteService = async (id) => {
    if (window.confirm('Are you sure you want to delete this service?')) {
      try {
        await deleteServiceAPI(id)
        setServices(services.filter(s => s._id !== id))
      } catch (err) {
        alert('Failed to delete service')
      }
    }
  }

  if (loading && !orgInfo) {
    return <div className="sp-loading">Loading Dashboard...</div>
  }

  if (!loading && error && !orgInfo) {
    return <div className="sp-loading">{error}</div>
  }

  if (!orgInfo) {
    return <div className="sp-loading">Loading Dashboard...</div>
  }

  if (orgInfo.status !== 'approved') {
    return null
  }

  const displayStats = {
    totalBookings: stats?.totalBookings || 0,
    todayBookings: (stats?.activeBookings || 0) + (stats?.completedBookings || 0),
    pendingBookings: stats?.activeBookings || 0,
    completedBookings: stats?.completedBookings || 0,
    activeServices: stats?.activeServices || 0,
    averageWaitTime: `${historyData?.stats?.avgWaitTime || 0} mins`
  }

  return (
    <div className="service-provider-page">
      <div className="sp-container">
        <div className="sp-header">
          <div>
            <h1 className="sp-title">Organization Dashboard</h1>
            <p className="sp-subtitle">Managing {orgInfo?.businessName}</p>
          </div>
          <div className="sp-org-info">
            <div className="sp-org-avatar">{orgInfo?.businessName?.charAt(0)}</div>
            <div>
              <div className="sp-org-name">{orgInfo?.businessName}</div>
              <div className="sp-org-status active">Approved</div>
            </div>
          </div>
        </div>

        {orgInfo?.avgTimeSuggestionPending && (
          <div className="avg-time-banner">
            <div>
              <div className="avg-time-banner-label">QueueLess suggestion</div>
              <h3>Average service time update available</h3>
              <p>
                Recent queue activity suggests changing your average service time to
                <strong> {orgInfo?.suggestedAvgServiceTime || 0} minutes</strong>.
              </p>
            </div>
            <div className="avg-time-banner-actions">
              <button className="btn-option highlight" onClick={() => handleAvgTimeSuggestion(true)} disabled={updating}>
                Accept update
              </button>
              <button className="btn-option" onClick={() => handleAvgTimeSuggestion(false)} disabled={updating}>
                Keep current time
              </button>
            </div>
          </div>
        )}

        <div className="sp-stats-grid">
          <div className="sp-stat-card">
            <div className="sp-stat-icon">📅</div>
            <div className="sp-stat-info">
              <div className="sp-stat-value">{displayStats.totalBookings}</div>
              <div className="sp-stat-label">Total Bookings</div>
            </div>
          </div>
          <div className="sp-stat-card">
            <div className="sp-stat-icon">⏳</div>
            <div className="sp-stat-info">
              <div className="sp-stat-value">{displayStats.pendingBookings}</div>
              <div className="sp-stat-label">In Queue</div>
            </div>
          </div>
          <div className="sp-stat-card">
            <div className="sp-stat-icon">✅</div>
            <div className="sp-stat-info">
              <div className="sp-stat-value">{displayStats.completedBookings}</div>
              <div className="sp-stat-label">Served</div>
            </div>
          </div>
          <div className="sp-stat-card">
            <div className="sp-stat-icon">⏱️</div>
            <div className="sp-stat-info">
              <div className="sp-stat-value">{displayStats.averageWaitTime}</div>
              <div className="sp-stat-label">Avg Wait</div>
            </div>
          </div>
        </div>

        <div className="sp-tabs">
          {['dashboard', 'services', 'bookings', 'history', 'settings'].map(tab => (
            <button
              key={tab}
              className={`sp-tab-button ${activeTab === tab ? 'active' : ''}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        <div className="sp-content">
          {activeTab === 'dashboard' && (
            <div className="sp-dashboard-section">
              <div className="sp-dashboard-grid">
                <div className="sp-dashboard-card">
                  <h3>Recently Joined</h3>
                  <div className="schedule-list">
                    {bookings.length === 0 ? <p>No one in queue.</p> : 
                      bookings.slice(0, 5).map(b => (
                        <div key={b._id} className="schedule-item">
                          <div className="schedule-time">#{b.tokenNumber}</div>
                          <div className="schedule-details">
                            <div className="schedule-service">{b.service?.serviceName}</div>
                            <div className="schedule-user">{b.user?.name}</div>
                          </div>
                        </div>
                      ))
                    }
                  </div>
                </div>
                <div className="sp-dashboard-card">
                  <h3>Quick Operations</h3>
                  <div className="quick-actions-list">
                    <button onClick={() => navigate('/service-provider/manage-queues')} className="btn-highlight-qm">Queue Control Center</button>
                    <button className="btn-option" onClick={() => navigate('/service-provider/create-service')}>Add Service</button>
                    <button className="btn-option" onClick={() => navigate('/service-provider/counters')}>Manage Counters</button>
                    <button className="btn-option" onClick={() => navigate('/reception-dashboard')}>Reception Desk</button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'services' && (
            <div className="sp-services-section">
              <div className="services-list">
                {services.map(s => (
                  <div key={s._id} className="service-item-card">
                    <div className="service-item-header">
                      <h3>{s.serviceName}</h3>
                      <button className="btn-edit" onClick={() => navigate(`/service-provider/create-service?edit=${s._id}`)}>Edit</button>
                    </div>
                    <div className="queue-list-mini">
                      <h4>Operational Queues</h4>
                      {s.queues?.map(q => (
                        <div key={q._id} className="q-mini-row">
                          <span>{q.queueName} {q.isOnBreak && <b style={{color:'#ef4444'}}>(ON BREAK)</b>}</span>
                          <button 
                            className={`btn-toggle-break ${q.isOnBreak ? 'resume' : 'break'}`}
                            onClick={() => handleToggleBreak(q._id)}
                          >
                            {q.isOnBreak ? "Resume" : "Go on Break"}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'bookings' && (
            <div className="sp-bookings-section">
              <table className="bookings-table">
                <thead>
                  <tr>
                    <th>Token</th>
                    <th>User</th>
                    <th>Service / Queue</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {bookings.map(b => (
                    <tr key={b._id}>
                      <td>#{b.tokenNumber}</td>
                      <td>{b.user?.name}</td>
                      <td>{b.service?.serviceName} / {b.queue?.queueName}</td>
                      <td>
                        <button className="btn-status start" onClick={() => handleServeNext(b.queue?._id)}>Serve</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'history' && (
             <div className="sp-history-section">
                <div className="history-stats-mini">
                  <div>Served: {historyData.stats.usersServed}</div>
                  <div>Avg Wait: {historyData.stats.avgWaitTime}m</div>
                </div>
                <table className="bookings-table">
                  <thead>
                    <tr><th>Token</th><th>User</th><th>Service</th><th>Served At</th><th>Wait</th></tr>
                  </thead>
                  <tbody>
                    {historyData.history.map(h => (
                      <tr key={h._id}>
                        <td>#{h.tokenNumber}</td>
                        <td>{h.user?.name}</td>
                        <td>{h.service?.serviceName}</td>
                        <td>{h.servedTime ? new Date(h.servedTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }) : 'N/A'}</td>
                        <td>{h.actualWaitDuration}m</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
             </div>
          )}

          {activeTab === 'settings' && (
            <div className="sp-settings-section">
              <div className="sp-settings-grid">
                <div className="settings-card">
                  <h3>Organization Profile</h3>
                  <form onSubmit={handleUpdateProfile} className="settings-form">
                    <div className="settings-form-group">
                      <label>Business Name</label>
                      <input 
                        type="text" 
                        value={settingsForm.businessName} 
                        onChange={e => setSettingsForm({...settingsForm, businessName: e.target.value})}
                        placeholder="Organization Name"
                      />
                    </div>
                    <div className="settings-form-group">
                      <label>Contact Phone</label>
                      <input 
                        type="text" 
                        value={settingsForm.phone} 
                        onChange={e => setSettingsForm({...settingsForm, phone: e.target.value})}
                        placeholder="Phone Number"
                      />
                    </div>
                    <div className="settings-form-group">
                      <label>Address</label>
                      <LocationPicker
                        onLocationSelect={(location) => {
                          const nextLocation = { lat: location.lat, lng: location.lng }
                          const hasAddressChanged = settingsForm.address.trim() !== (orgInfo?.address || '').trim()
                          const hasLocationChanged =
                            nextLocation.lat !== (orgInfo?.location?.lat ?? null) ||
                            nextLocation.lng !== (orgInfo?.location?.lng ?? null)

                          setSelectedLocation(nextLocation)
                          setIsAddressChange(hasAddressChanged || hasLocationChanged)
                        }}
                        initialLocation={selectedLocation}
                        initialAddress={settingsForm.address}
                      />
                      <input 
                        type="text" 
                        value={settingsForm.address} 
                        onChange={e => {
                          const nextAddress = e.target.value
                          const hasLocationChanged =
                            (selectedLocation?.lat ?? null) !== (orgInfo?.location?.lat ?? null) ||
                            (selectedLocation?.lng ?? null) !== (orgInfo?.location?.lng ?? null)

                          setSettingsForm({...settingsForm, address: nextAddress})
                          setIsAddressChange(nextAddress.trim() !== (orgInfo?.address || '').trim() || hasLocationChanged)
                        }}
                        placeholder="Full Address"
                        style={{ marginTop: '10px' }}
                      />
                      {isAddressChange && (
                        <div className="settings-form-group" style={{ marginTop: '10px' }}>
                          <label>Photo Proof (Required for address change)</label>
                          <input 
                            type="file" 
                            accept="image/*"
                            onChange={e => setAddressPhoto(e.target.files[0])}
                            required
                          />
                          {addressPhoto && <p>Selected: {addressPhoto.name}</p>}
                        </div>
                      )}
                    </div>
                    <div className="settings-form-group">
                      <label>Description</label>
                      <textarea 
                        value={settingsForm.description} 
                        onChange={e => setSettingsForm({...settingsForm, description: e.target.value})}
                        placeholder="Briefly describe your organization"
                      />
                    </div>
                    <button type="submit" className="btn-save-settings" disabled={updating}>
                      {updating ? 'Saving...' : 'Update Profile'}
                    </button>
                  </form>
                </div>

                <div className="settings-card">
                  <h3>Security & Access</h3>
                  <form onSubmit={handleChangePassword} className="settings-form">
                    <div className="settings-form-group">
                      <label>Current Password</label>
                      <input 
                        type="password" 
                        value={passwordForm.oldPassword} 
                        onChange={e => setPasswordForm({...passwordForm, oldPassword: e.target.value})}
                        required
                      />
                    </div>
                    <div className="settings-form-group">
                      <label>New Password</label>
                      <input 
                        type="password" 
                        value={passwordForm.newPassword} 
                        onChange={e => setPasswordForm({...passwordForm, newPassword: e.target.value})}
                        required
                      />
                    </div>
                    <div className="settings-form-group">
                      <label>Confirm New Password</label>
                      <input 
                        type="password" 
                        value={passwordForm.confirmPassword} 
                        onChange={e => setPasswordForm({...passwordForm, confirmPassword: e.target.value})}
                        required
                      />
                    </div>
                    <button type="submit" className="btn-save-settings" disabled={updating}>
                      {updating ? 'Updating Password...' : 'Change Password'}
                    </button>
                  </form>

                  <div className="settings-extra-actions" style={{marginTop: '2rem', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '1.5rem'}}>
                    <h4>Account Management</h4>
                    <div className="settings-option">
                      <div>
                        <div className="option-title">Queue Control Center</div>
                        <div className="option-description">Manage all tokens across all services in one place.</div>
                      </div>
                      <button className="btn-option highlight" onClick={() => navigate('/service-provider/manage-queues')}>Open Control</button>
                    </div>
                    <div className="settings-option">
                      <div>
                        <div className="option-title">Manage Staff</div>
                        <div className="option-description">Add or remove receptionists and counter staff.</div>
                      </div>
                      <button className="btn-option" onClick={() => navigate('/service-provider/counters')}>Manage</button>
                    </div>
                    <div className="settings-option">
                      <div>
                        <div className="option-title">Service Counters</div>
                        <div className="option-description">Configure your physical service points.</div>
                      </div>
                      <button className="btn-option" onClick={() => navigate('/service-provider/counters')}>Configure</button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default ServiceProviderPage

