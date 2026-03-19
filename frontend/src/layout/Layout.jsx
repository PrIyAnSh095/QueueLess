import React from 'react'
import Header from './Header'
import Footer from './Footer'
import './layout.css'

const Layout = ({ children }) => {
  return (
    <div className="app-root">
      <Header />
      <main className="page-content">
        {children}
      </main>
      <Footer />
    </div>
  )
}

export default Layout


