import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { API, getMeAPI } from '../services/api'
import LocationPicker from './LocationPicker'
import './ServiceProviderPage.css'

const ServiceProviderPage = () => {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('dashboard')
  const [showAddServiceModal, setShowAddServiceModal] = useState(false)
  const [showEditServiceModal, setShowEditServiceModal] = useState(false)
  const [selectedService, setSelectedService] = useState(null)

  const [profile, setProfile] = useState(null)
  const [services, setServices] = useState([])
  const [stats, setStats] = useState({ totalBookings: 0, todayBookings: 0, pendingBookings: 0, completedBookings: 0, activeServices: 0, averageWaitTime: '0 mins' })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [meRes, servRes] = await Promise.all([
        getMeAPI(),
        API.get('/services/admin')
      ])
      
      const p = meRes.data.providerProfile
      setProfile(p)
      
      if (servRes.data.success) {
        setServices(servRes.data.data)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateProfile = async (e) => {
    e.preventDefault()
    try {
       await API.put('/auth/me', {
         businessName: profile.businessName,
         phone: profile.phone,
         address: profile.address,
         location: profile.location
       })
       alert('Profile updated!')
    } catch (err) {
       alert('Update failed')
    }
  }

  if (loading) return <div className="loading">Loading Dashboard...</div>
  if (!profile) return <div className="error">Profile not found</div>


  const handleAddService = () => {
    navigate('/service-provider/create-service')
  }

  const handleEditService = (service) => {
    setSelectedService(service)
    setShowEditServiceModal(true)
  }

  const handleDeleteService = (id) => {
    if (window.confirm('Are you sure you want to delete this service?')) {
      console.log('Delete service:', id)
      // Add delete logic here
    }
  }

  const handleUpdateBookingStatus = (id, status) => {
    console.log('Update booking status:', id, status)
    // Add update logic here
  }

  return (
    <div className="service-provider-page">
      <div className="sp-container">
        {/* Header */}
        <div className="sp-header">
          <div>
            <h1 className="sp-title">Service Provider Dashboard</h1>
            <p className="sp-subtitle">Manage your services and bookings</p>
          </div>
          <div className="sp-org-info">
            <div className="sp-org-avatar">{profile.businessName.charAt(0)}</div>
            <div>
              <div className="sp-org-name">{profile.businessName}</div>
              <div className="sp-org-status active">{profile.status}</div>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="sp-stats-grid">
          <div className="sp-stat-card">
            <div className="sp-stat-icon">📅</div>
            <div className="sp-stat-info">
              <div className="sp-stat-value">{stats.totalBookings}</div>
              <div className="sp-stat-label">Total Bookings</div>
            </div>
          </div>
          <div className="sp-stat-card">
            <div className="sp-stat-icon">⏰</div>
            <div className="sp-stat-info">
              <div className="sp-stat-value">{stats.todayBookings}</div>
              <div className="sp-stat-label">Today's Bookings</div>
            </div>
          </div>
          <div className="sp-stat-card">
            <div className="sp-stat-icon">⏳</div>
            <div className="sp-stat-info">
              <div className="sp-stat-value">{stats.pendingBookings}</div>
              <div className="sp-stat-label">Pending</div>
            </div>
          </div>
          <div className="sp-stat-card">
            <div className="sp-stat-icon">✅</div>
            <div className="sp-stat-info">
              <div className="sp-stat-value">{stats.completedBookings}</div>
              <div className="sp-stat-label">Completed</div>
            </div>
          </div>
          <div className="sp-stat-card">
            <div className="sp-stat-icon">🎯</div>
            <div className="sp-stat-info">
              <div className="sp-stat-value">{stats.activeServices}</div>
              <div className="sp-stat-label">Active Services</div>
            </div>
          </div>
          <div className="sp-stat-card">
            <div className="sp-stat-icon">⏱️</div>
            <div className="sp-stat-info">
              <div className="sp-stat-value">{stats.averageWaitTime}</div>
              <div className="sp-stat-label">Avg Wait Time</div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="sp-tabs">
          <button
            className={`sp-tab-button ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => setActiveTab('dashboard')}
          >
            Dashboard
          </button>
          <button
            className={`sp-tab-button ${activeTab === 'services' ? 'active' : ''}`}
            onClick={() => setActiveTab('services')}
          >
            My Services
          </button>
          <button
            className={`sp-tab-button ${activeTab === 'bookings' ? 'active' : ''}`}
            onClick={() => setActiveTab('bookings')}
          >
            Bookings ({stats.pendingBookings})
          </button>
          <button
            className={`sp-tab-button ${activeTab === 'settings' ? 'active' : ''}`}
            onClick={() => setActiveTab('settings')}
          >
            Settings
          </button>
        </div>

        {/* Tab Content */}
        <div className="sp-content">
          {/* Dashboard Tab */}
          {activeTab === 'dashboard' && (
            <div className="sp-dashboard-section">
              <h2 className="sp-section-title">Overview</h2>
              <div className="sp-dashboard-grid">
                <div className="sp-dashboard-card">
                  <h3>Today's Schedule</h3>
                  <div className="schedule-list">
                    {bookings.slice(0, 5).map((booking) => (
                      <div key={booking.id} className="schedule-item">
                        <div className="schedule-time">{booking.bookingTime}</div>
                        <div className="schedule-details">
                          <div className="schedule-service">{booking.service}</div>
                          <div className="schedule-user">{booking.userName} - {booking.tokenNumber}</div>
                        </div>
                        <span className={`schedule-status ${booking.status}`}>
                          {booking.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="sp-dashboard-card">
                  <h3>Quick Actions</h3>
                  <div className="quick-actions-list">
                    <button className="sp-quick-action-btn" onClick={handleAddService}>
                      <span className="action-icon">➕</span>
                      Add New Service
                    </button>
                    <button className="sp-quick-action-btn" onClick={() => setActiveTab('bookings')}>
                      <span className="action-icon">📋</span>
                      View All Bookings
                    </button>
                    <button className="sp-quick-action-btn" onClick={() => setActiveTab('settings')}>
                      <span className="action-icon">⚙️</span>
                      Update Profile
                    </button>
                    <button className="sp-quick-action-btn" onClick={() => setActiveTab('services')}>
                      <span className="action-icon">⏱️</span>
                      Open Live Counter
                    </button>
                    <button className="sp-quick-action-btn">
                      <span className="action-icon">📊</span>
                      View Reports
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Services Tab */}
          {activeTab === 'services' && (
            <div className="sp-services-section">
              <div className="sp-section-header">
                <h2 className="sp-section-title">My Services</h2>
                <button className="btn-add-service" onClick={handleAddService}>
                  <span>➕</span>
                  Add New Service
                </button>
              </div>
              <div className="services-list">
                {services.map((service) => (
                  <div key={service._id} className="service-item-card">
                    <div className="service-item-header">
                      <div>
                        <h3 className="service-item-name">{service.serviceName}</h3>
                        <p className="service-item-description">{service.description}</p>
                      </div>
                      <span className={`service-item-status ${service.approvalStatus}`}>
                        {service.approvalStatus}
                      </span>
                    </div>
                    <div className="service-item-details">
                      <div className="service-item-detail">
                        <span className="detail-label">Duration:</span>
                        <span className="detail-value">{service.duration}</span>
                      </div>
                      <div className="service-item-detail">
                        <span className="detail-label">Price:</span>
                        <span className="detail-value">{service.price}</span>
                      </div>
                      <div className="service-item-detail">
                        <span className="detail-label">Total Bookings:</span>
                        <span className="detail-value">{service.totalBookings}</span>
                      </div>
                    </div>
                    <div className="service-item-actions">
                      {service.approvalStatus === "approved" && (
                        <div style={{ display: "flex", gap: "8px", marginBottom: "8px" }}>
                          <button
                            className="btn-counter"
                            style={{ backgroundColor: "#7c3aed", color: "white", padding: "6px 12px", borderRadius: "6px", border: "none", cursor: "pointer" }}
                            onClick={() => navigate(`/counter/${service._id}`)}
                          >
                            Manage Counter
                          </button>
                          <button
                            className="btn-setup"
                            style={{ backgroundColor: "#f3f4f6", color: "#374151", padding: "6px 12px", borderRadius: "6px", border: "1px solid #d1d5db", cursor: "pointer" }}
                            onClick={() => navigate(`/service-provider/create-queue?serviceId=${service._id}`)}
                          >
                            Setup Queue
                          </button>
                        </div>
                      )}
                      <div className="action-buttons-row" style={{ display: "flex", gap: "8px" }}>
                        <button className="btn-edit" onClick={() => handleEditService(service)}>
                          Edit
                        </button>
                        <button className="btn-delete" onClick={() => handleDeleteService(service._id)}>
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Bookings Tab */}
          {activeTab === 'bookings' && (
            <div className="sp-bookings-section">
              <h2 className="sp-section-title">Today's Bookings</h2>
              <div className="bookings-table-container">
                <table className="bookings-table">
                  <thead>
                    <tr>
                      <th>Token Number</th>
                      <th>Customer Name</th>
                      <th>Service</th>
                      <th>Time</th>
                      <th>Estimated Time</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bookings.map((booking) => (
                      <tr key={booking.id}>
                        <td className="token-cell">{booking.tokenNumber}</td>
                        <td>
                          <div className="user-info">
                            <div className="user-name">{booking.userName}</div>
                            <div className="user-email">{booking.userEmail}</div>
                          </div>
                        </td>
                        <td>{booking.service}</td>
                        <td>{booking.bookingTime}</td>
                        <td>{booking.estimatedTime}</td>
                        <td>
                          <span className={`booking-status-badge ${booking.status}`}>
                            {booking.status}
                          </span>
                        </td>
                        <td>
                          <div className="booking-actions">
                            {booking.status === 'pending' && (
                              <>
                                <button
                                  className="btn-status start"
                                  onClick={() => handleUpdateBookingStatus(booking.id, 'in-progress')}
                                >
                                  Start
                                </button>
                                <button
                                  className="btn-status complete"
                                  onClick={() => handleUpdateBookingStatus(booking.id, 'completed')}
                                >
                                  Complete
                                </button>
                              </>
                            )}
                            {booking.status === 'in-progress' && (
                              <button
                                className="btn-status complete"
                                onClick={() => handleUpdateBookingStatus(booking.id, 'completed')}
                              >
                                Complete
                              </button>
                            )}
                            {booking.status === 'completed' && (
                              <span className="completed-text">Done</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Settings Tab */}
          {activeTab === 'settings' && (
            <div className="sp-settings-section">
              <h2 className="sp-section-title">Organization Settings</h2>
                <h3>Organization Information</h3>
                <form className="settings-form" onSubmit={handleUpdateProfile}>
                  <div className="settings-form-group">
                    <label>Organization Name</label>
                    <input type="text" value={profile.businessName} onChange={e => setProfile({...profile, businessName: e.target.value})} />
                  </div>
                  <div className="settings-form-group">
                    <label>Phone Number</label>
                    <input type="tel" value={profile.phone} onChange={e => setProfile({...profile, phone: e.target.value})} />
                  </div>
                  <div className="settings-form-group">
                    <label>Address</label>
                    <textarea rows="3" value={profile.address} onChange={e => setProfile({...profile, address: e.target.value})}></textarea>
                  </div>
                  <div className="settings-form-group">
                    <label>Location on Map</label>
                    <LocationPicker 
                      value={profile.location} 
                      onChange={loc => setProfile({...profile, location: loc})} 
                    />
                  </div>
                  <button type="submit" className="btn-save-settings">Save Changes</button>
                </form>
              <div className="settings-card">
                <h3>Account Settings</h3>
                <div className="settings-options">
                  <div className="settings-option">
                    <div>
                      <div className="option-title">Change Password</div>
                      <div className="option-description">Update your account password</div>
                    </div>
                    <button className="btn-option">Change</button>
                  </div>
                  <div className="settings-option">
                    <div>
                      <div className="option-title">Notification Preferences</div>
                      <div className="option-description">Manage email and SMS notifications</div>
                    </div>
                    <button className="btn-option">Manage</button>
                  </div>
                  <div className="settings-option">
                    <div>
                      <div className="option-title">Business Hours</div>
                      <div className="option-description">Set your operating hours</div>
                    </div>
                    <button className="btn-option">Configure</button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Add Service Modal */}
      {showAddServiceModal && (
        <div className="modal-overlay" onClick={() => setShowAddServiceModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Add New Service</h2>
              <button className="modal-close" onClick={() => setShowAddServiceModal(false)}>×</button>
            </div>
            <form className="modal-form">
              <div className="modal-form-group">
                <label>Service Name</label>
                <input type="text" placeholder="e.g., Aadhar Update" />
              </div>
              <div className="modal-form-group">
                <label>Description</label>
                <textarea rows="3" placeholder="Describe your service"></textarea>
              </div>
              <div className="modal-form-row">
                <div className="modal-form-group">
                  <label>Duration (minutes)</label>
                  <input type="number" placeholder="30" />
                </div>
                <div className="modal-form-group">
                  <label>Price</label>
                  <input type="text" placeholder="Free or amount" />
                </div>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-modal-cancel" onClick={() => setShowAddServiceModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-modal-submit">Add Service</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default ServiceProviderPage

