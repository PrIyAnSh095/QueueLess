import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Ticket, Bell, Menu, X } from 'lucide-react'
import { useAuth } from '../utils/AuthContext'
import { getNotificationsAPI } from '../services/api'
import NotificationPanel from '../components/NotificationPanel'
import './layout.css'

const Header = () => {
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const isProvider = user?.role === 'provider'
  const isAdmin = user?.role === 'admin'
  const [notifOpen, setNotifOpen] = useState(false)
  const [unread, setUnread] = useState(0)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    if (!user) return
    const fetchUnread = async () => {
      try {
        const res = await getNotificationsAPI()
        setUnread(res.data?.data?.unreadCount || 0)
      } catch {}
    }
    fetchUnread()
    const interval = setInterval(fetchUnread, 30000)
    return () => clearInterval(interval)
  }, [user])

  const handleLogout = async () => {
    await logout()
    setMenuOpen(false)
    navigate('/')
  }

  const closeMenu = () => setMenuOpen(false)

  return (
    <nav className="navbar">
      <div className="nav-container">
        <Link to="/" className="logo" style={{ textDecoration: 'none' }}>
          <span className="logo-mark" aria-hidden>
            <Ticket size={26} strokeWidth={2} className="logo-mark-icon" />
          </span>
          <span className="logo-text">QueueLess</span>
        </Link>

        <button className="hamburger-btn" onClick={() => setMenuOpen(!menuOpen)} aria-label="Toggle menu">
          {menuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>

        <div className={`nav-links ${menuOpen ? 'nav-open' : ''}`}>
          {isAdmin ? (
            <>
              <Link to="/admin" className="nav-link" onClick={closeMenu}>Dashboard</Link>
              <Link to="/services" className="nav-link" onClick={closeMenu}>Services</Link>
              <Link to="/organizations" className="nav-link" onClick={closeMenu}>Organizations</Link>
            </>
          ) : isProvider ? (
            <>
              <Link to="/service-provider" className="nav-link" onClick={closeMenu}>Dashboard</Link>
              <Link to="/service-provider/create-service" className="nav-link" onClick={closeMenu}>Add Service</Link>
              <Link to="/services" className="nav-link" onClick={closeMenu}>All Services</Link>
            </>
          ) : user ? (
            <>
              <Link to="/user-dashboard" className="nav-link" onClick={closeMenu}>Dashboard</Link>
              <Link to="/services" className="nav-link" onClick={closeMenu}>Services</Link>
              <Link to="/organizations" className="nav-link" onClick={closeMenu}>Organizations</Link>
              <Link to="/my-tickets" className="nav-link" onClick={closeMenu}>My Tickets</Link>
            </>
          ) : (
            <>
              <Link to="/#home" className="nav-link" onClick={closeMenu}>Home</Link>
              <Link to="/#features" className="nav-link" onClick={closeMenu}>Features</Link>
              <Link to="/#how-it-works" className="nav-link" onClick={closeMenu}>How It Works</Link>
              <Link to="/#services" className="nav-link" onClick={closeMenu}>Services</Link>
            </>
          )}

          {user && (
            <div className="nav-notif-wrap" style={{position:'relative'}}>
              <button className="nav-bell-btn" onClick={() => setNotifOpen(!notifOpen)} aria-label="Notifications">
                <Bell size={20} />
                {unread > 0 && <span className="nav-bell-badge">{unread > 9 ? '9+' : unread}</span>}
              </button>
              <NotificationPanel isOpen={notifOpen} onClose={() => { setNotifOpen(false); }} />
            </div>
          )}

          {user ? (
            <button className="btn-primary" onClick={handleLogout}>Logout</button>
          ) : (
            <button className="btn-primary" onClick={() => { navigate('/login'); closeMenu(); }}>Login</button>
          )}
        </div>
      </div>
    </nav>
  )
}

export default Header
