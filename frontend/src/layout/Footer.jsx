import React from 'react'
import { Link } from 'react-router-dom'
import './layout.css'

const Footer = () => {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-content">
          <div className="footer-section">
            <div className="footer-logo">
              <span className="logo-icon">🎫</span>
              <span className="logo-text">TokenFlow</span>
            </div>
            <p className="footer-description">
              Smart token registration system for seamless service booking
            </p>
          </div>
          <div className="footer-section">
            <h4 className="footer-title">Quick Links</h4>
            <ul className="footer-links">
              <li><Link to="/#home">Home</Link></li>
              <li><Link to="/#features">Features</Link></li>
              <li><Link to="/#how-it-works">How It Works</Link></li>
              <li><Link to="/#services">Services</Link></li>
            </ul>
          </div>
          <div className="footer-section">
            <h4 className="footer-title">For Organizations</h4>
            <ul className="footer-links">
              <li><Link to="/register">Register</Link></li>
              <li><Link to="/service-provider">Dashboard</Link></li>
              <li><Link to="/#home">Support</Link></li>
              <li><Link to="/#home">Documentation</Link></li>
            </ul>
          </div>
          <div className="footer-section">
            <h4 className="footer-title">Contact</h4>
            <ul className="footer-links">
              <li>Email: support@tokenflow.com</li>
              <li>Phone: +91 123 456 7890</li>
              <li>Address: 123 Service St, City</li>
            </ul>
          </div>
        </div>
        <div className="footer-bottom">
          <p>&copy; 2024 TokenFlow. All rights reserved.</p>
        </div>
      </div>
    </footer>
  )
}

export default Footer


