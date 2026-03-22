import React from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Ticket } from 'lucide-react'
import { useAuth } from '../utils/AuthContext'
import './layout.css'

const Header = () => {
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const isProvider = user?.role === 'provider'
  const isAdmin = user?.role === 'admin'

  const handleLogout = async () => {
    await logout()
    navigate('/')
  }

  return (
    <nav className="navbar">
      <div className="nav-container">
        <Link to="/" className="logo" style={{ textDecoration: 'none' }}>
          <span className="logo-mark" aria-hidden>
            <Ticket size={26} strokeWidth={2} className="logo-mark-icon" />
          </span>
          <span className="logo-text">QueueLess</span>
        </Link>
        <div className="nav-links">
          {isAdmin ? (
            <>
              <Link to="/admin" className="nav-link">Dashboard</Link>
              <button className="btn-primary" onClick={handleLogout}>Logout</button>
            </>
          ) : isProvider ? (
            <>
              <Link to="/service-provider" className="nav-link">Dashboard</Link>
              <Link to="/service-provider/create-service" className="nav-link">Add Service</Link>
              <button className="btn-primary" onClick={handleLogout}>Logout</button>
            </>
          ) : user ? (
            <>
              <Link to="/#home" className="nav-link">Home</Link>
              <Link to="/#features" className="nav-link">Features</Link>
              <Link to="/#services" className="nav-link">Services</Link>
              <Link to="/my-tickets" className="nav-link">My Tickets</Link>
              <button className="btn-primary" onClick={handleLogout}>Logout</button>
            </>
          ) : (
            <>
              <Link to="/#home" className="nav-link">Home</Link>
              <Link to="/#features" className="nav-link">Features</Link>
              <Link to="/#how-it-works" className="nav-link">How It Works</Link>
              <Link to="/#services" className="nav-link">Services</Link>
              <button className="btn-primary" onClick={() => navigate('/login')}>Login</button>
            </>
          )}
        </div>
      </div>
    </nav>
  )
}

export default Header
