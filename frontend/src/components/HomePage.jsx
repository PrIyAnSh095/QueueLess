import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import './HomePage.css'
import { getServices } from '../services/api'

const HomePage = () => {
  const [isVisible, setIsVisible] = useState(false)
  const [services, setServices] = useState([])
  const [loadingServices, setLoadingServices] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    setIsVisible(true)
    const fetchServices = async () => {
      try {
        const res = await getServices()
        setServices(res.data.data || [])
      } catch {
        setServices([])
      } finally {
        setLoadingServices(false)
      }
    }
    fetchServices()
  }, [])

  const serviceIcons = ['🆔', '📄', '💳', '🏛️', '🏥', '📋', '🔖', '🎫']

  return (
    <div className="homepage">
      <section id="home" className={`hero ${isVisible ? 'fade-in' : ''}`}>
        <div className="hero-background">
          <div className="gradient-orb orb-1"></div>
          <div className="gradient-orb orb-2"></div>
          <div className="gradient-orb orb-3"></div>
        </div>
        <div className="hero-content">
          <div className="hero-text">
            <h1 className="hero-title">
              <span className="title-line">Skip the Queue,</span>
              <span className="title-line highlight">Book Your Slot</span>
            </h1>
            <p className="hero-subtitle">
              Smart token registration system that predicts your service time. 
              No more waiting in long queues. Book your slot and get notified 
              when it's your turn.
            </p>
            <div className="hero-buttons">
              <button 
                className="btn-hero-primary"
                onClick={() => navigate('/#services')}
              >
                <span>Browse Services</span>
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M7.5 15L12.5 10L7.5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
              <button className="btn-hero-secondary" onClick={() => navigate('/register')}>
                Register Organization
              </button>
            </div>
            <div className="hero-stats">
              <div className="stat-item">
                <div className="stat-number">10K+</div>
                <div className="stat-label">Active Users</div>
              </div>
              <div className="stat-item">
                <div className="stat-number">500+</div>
                <div className="stat-label">Organizations</div>
              </div>
              <div className="stat-item">
                <div className="stat-number">50K+</div>
                <div className="stat-label">Bookings</div>
              </div>
            </div>
          </div>
          <div className="hero-visual">
            <div className="phone-mockup">
              <div className="phone-screen">
                <div className="screen-content">
                  <div className="notification-card">
                    <div className="notification-icon">🔔</div>
                    <div className="notification-text">
                      <div className="notification-title">Your turn in 5 min</div>
                      <div className="notification-subtitle">Token #42</div>
                    </div>
                  </div>
                  <div className="service-card">
                    <div className="service-icon">📋</div>
                    <div className="service-info">
                      <div className="service-name">Document Update</div>
                      <div className="service-time">Estimated: 2:30 PM</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="features">
        <div className="container">
          <div className="section-header">
            <h2 className="section-title">Why Choose QueueLess?</h2>
            <p className="section-subtitle">Experience seamless service booking with smart predictions</p>
          </div>
          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon-wrapper"><div className="feature-icon">⏱️</div></div>
              <h3 className="feature-title">Smart Time Prediction</h3>
              <p className="feature-description">Get accurate ETA predictions. No more guessing or waiting unnecessarily.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon-wrapper"><div className="feature-icon">📱</div></div>
              <h3 className="feature-title">Real-time Updates</h3>
              <p className="feature-description">Receive instant updates about your token status and estimated service time.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon-wrapper"><div className="feature-icon">🏢</div></div>
              <h3 className="feature-title">Multiple Services</h3>
              <p className="feature-description">Book across various services from multiple organizations.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon-wrapper"><div className="feature-icon">🎯</div></div>
              <h3 className="feature-title">Easy Booking</h3>
              <p className="feature-description">Simple joinin process. Select your service and you're in the queue in seconds.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon-wrapper"><div className="feature-icon">📊</div></div>
              <h3 className="feature-title">Queue Management</h3>
              <p className="feature-description">Advanced FIFO queue management ensures fair and efficient service delivery.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon-wrapper"><div className="feature-icon">🔒</div></div>
              <h3 className="feature-title">Secure & Reliable</h3>
              <p className="feature-description">JWT authentication and bcrypt encryption protect your data.</p>
            </div>
          </div>
        </div>
      </section>

      <section id="how-it-works" className="how-it-works">
        <div className="container">
          <div className="section-header">
            <h2 className="section-title">How It Works</h2>
            <p className="section-subtitle">Get started in three simple steps</p>
          </div>
          <div className="steps-container">
            <div className="step-item">
              <div className="step-number">1</div>
              <div className="step-content">
                <div className="step-icon">🔍</div>
                <h3 className="step-title">Browse Services</h3>
                <p className="step-description">Explore available services from registered organizations. Find the service you need quickly.</p>
              </div>
            </div>
            <div className="step-connector"></div>
            <div className="step-item">
              <div className="step-number">2</div>
              <div className="step-content">
                <div className="step-icon">📅</div>
                <h3 className="step-title">Join the Queue</h3>
                <p className="step-description">Click Join Queue and get instant confirmation with your token number and ETA.</p>
              </div>
            </div>
            <div className="step-connector"></div>
            <div className="step-item">
              <div className="step-number">3</div>
              <div className="step-content">
                <div className="step-icon">✅</div>
                <h3 className="step-title">Get Served</h3>
                <p className="step-description">Track your position in real-time. Arrive when it's your turn.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="services" className="services-preview">
        <div className="container">
          <div className="section-header">
            <h2 className="section-title">Available Services</h2>
            <p className="section-subtitle">Join the queue for these services right now</p>
          </div>
          {loadingServices ? (
            <div className="services-loading">
              {[1,2,3,4].map(i => (
                <div key={i} className="service-preview-card skeleton" />
              ))}
            </div>
          ) : services.length === 0 ? (
            <div className="services-empty">
              <div className="empty-icon">📋</div>
              <p>No services available yet. Be the first to register your organization!</p>
              <button className="btn-hero-secondary" onClick={() => navigate('/register')}>Register Organization</button>
            </div>
          ) : (
            <div className="services-grid">
              {services.map((service, index) => (
                <div
                  key={service._id}
                  className="service-preview-card"
                  onClick={() => navigate(`/service-details/${service._id}`)}
                  style={{ cursor: 'pointer' }}
                >
                  <div className="service-preview-icon">{serviceIcons[index % serviceIcons.length]}</div>
                  <h3 className="service-preview-title">{service.serviceName}</h3>
                  <p className="service-preview-description">{service.description || 'Click to view details and join queue'}</p>
                  <div className="service-preview-meta">
                    <span>⏱ {service.avgServiceTime || service.duration} min avg</span>
                    <span>📍 {service.organizationId?.businessName || 'Organization'}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="cta-section">
        <div className="container">
          <div className="cta-content">
            <h2 className="cta-title">Ready to Get Started?</h2>
            <p className="cta-subtitle">Join thousands of users enjoying seamless service booking</p>
            <div className="cta-buttons">
              <button className="btn-cta-primary" onClick={() => navigate('/login')}>
                Book a Service Now
              </button>
              <button className="btn-cta-secondary" onClick={() => navigate('/register')}>
                Register Your Organization
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

export default HomePage
