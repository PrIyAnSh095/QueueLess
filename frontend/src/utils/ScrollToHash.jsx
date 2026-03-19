import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

// Handles links like "/#features" even when navigating from other routes.
const ScrollToHash = () => {
  const location = useLocation()

  useEffect(() => {
    const { hash } = location

    if (!hash) {
      window.scrollTo({ top: 0, left: 0, behavior: 'smooth' })
      return
    }

    const id = hash.replace('#', '')
    const el = document.getElementById(id)
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [location])

  return null
}

export default ScrollToHash


