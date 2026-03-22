import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getServices } from '../services/api'
import './HomePage.css'

const HomePage = () => {
  const [isVisible, setIsVisible] = useState(false)
  const [services, setServices] = useState([])
  const navigate = useNavigate()

  useEffect(() => {
    setIsVisible(true)
  }, [])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await getServices()
        if (!cancelled && res.data?.success) {
          setServices(res.data.data || [])
        }
      } catch {
        if (!cancelled) setServices([])
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const goToServiceDetails = (serviceId) => {
    navigate(`/service-details/${serviceId}`)
  }

  const goToFirstServiceOrBrowse = () => {
    if (services.length) goToServiceDetails(services[0]._id)
    else navigate('/#featured-services')
  }

  return (
    <div className="homepage">
      {/* Hero Section */}
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
                onClick={goToFirstServiceOrBrowse}
              >
                <span>Book a Service</span>
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
                      <div className="service-name">Aadhar Update</div>
                      <div className="service-time">Estimated: 2:30 PM</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Services (dummy showcase) */}
      <section id="featured-services" className="features">
        <div className="container">
          <div className="section-header">
            <h2 className="section-title">Explore Registered Services</h2>
            <p className="section-subtitle">
              A quick glimpse of the kind of services organizations can register on TokenFlow
            </p>
          </div>
          <div className="features-grid">
            {services.length === 0 ? (
              <p className="section-subtitle" style={{ gridColumn: '1 / -1' }}>
                No approved services yet. Organizations can register and list services here after admin approval.
              </p>
            ) : (
              services.map((item) => {
                const orgName = item.organizationName || 'Organization'
                const initials = orgName
                  .split(' ')
                  .filter(Boolean)
                  .slice(0, 2)
                  .map((part) => part[0]?.toUpperCase())
                  .join('')

                return (
                  <div key={item._id} className="feature-card service-showcase-card">
                    <div className="service-showcase-header">
                      <div className="service-avatar">{initials}</div>
                      <div className="service-header-text">
                        <div className="service-org-name">{orgName}</div>
                        <div className="service-service-name">{item.serviceName}</div>
                      </div>
                    </div>
                    <p className="feature-description">
                      {item.description || 'Book a slot for this service.'}
                    </p>
                    <div className="service-pill-row">
                      <span className="service-pill">Organization</span>
                      <span className="service-pill">Service</span>
                    </div>
                    <div className="service-meta">
                      {item.duration ? `${item.duration} min · ` : ''}
                      {item.maxTokens ? `Up to ${item.maxTokens} tokens` : ''}
                    </div>
                    <button
                      type="button"
                      className="btn-book-slot"
                      onClick={() => goToServiceDetails(item._id)}
                    >
                      Book Slot
                    </button>
                  </div>
                )
              })
            )}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="how-it-works">
        <div className="container">
          <div className="section-header">
            <h2 className="section-title">How It Works</h2>
            <p className="section-subtitle">
              Get started in three simple steps
            </p>
          </div>
          <div className="steps-container">
            <div className="step-item">
              <div className="step-number">1</div>
              <div className="step-content">
                <div className="step-icon">🔍</div>
                <h3 className="step-title">Browse Services</h3>
                <p className="step-description">
                  Explore available services from registered organizations. 
                  Find the service you need quickly.
                </p>
              </div>
            </div>
            <div className="step-connector"></div>
            <div className="step-item">
              <div className="step-number">2</div>
              <div className="step-content">
                <div className="step-icon">📅</div>
                <h3 className="step-title">Book Your Slot</h3>
                <p className="step-description">
                  Select your preferred time slot and confirm your booking. 
                  Get instant confirmation with your token number.
                </p>
              </div>
            </div>
            <div className="step-connector"></div>
            <div className="step-item">
              <div className="step-number">3</div>
              <div className="step-content">
                <div className="step-icon">✅</div>
                <h3 className="step-title">Get Served</h3>
                <p className="step-description">
                  Receive notifications about your predicted service time. 
                  Arrive on time and get served without waiting.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Services Preview Section */}
      <section id="services" className="services-preview">
        <div className="container">
          <div className="section-header">
            <h2 className="section-title">Popular Services</h2>
            <p className="section-subtitle">
              Book slots for these commonly used services
            </p>
          </div>
          <div className="services-grid">
            {services.length === 0 ? (
              <p className="section-subtitle" style={{ gridColumn: '1 / -1' }}>
                Popular services will appear here once organizations publish them.
              </p>
            ) : (
              services.slice(0, 4).map((item, index) => (
                <div
                  key={item._id}
                  role="button"
                  tabIndex={0}
                  className="service-preview-card"
                  onClick={() => goToServiceDetails(item._id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') goToServiceDetails(item._id)
                  }}
                  style={{ cursor: 'pointer' }}
                >
                  <div className="service-preview-icon">
                    {['🆔', '📄', '💳', '🏛️'][index % 4]}
                  </div>
                  <h3 className="service-preview-title">{item.serviceName}</h3>
                  <p className="service-preview-description">
                    {item.description || `Book with ${item.organizationName || 'this organization'}`}
                  </p>
                  {index === 0 ? <div className="service-preview-badge">Featured</div> : null}
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta-section">
        <div className="container">
          <div className="cta-content">
            <h2 className="cta-title">Ready to Get Started?</h2>
            <p className="cta-subtitle">
              Join thousands of users who are already enjoying seamless service booking
            </p>
            <div className="cta-buttons">
              <button 
                type="button"
                className="btn-cta-primary"
                onClick={goToFirstServiceOrBrowse}
              >
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

