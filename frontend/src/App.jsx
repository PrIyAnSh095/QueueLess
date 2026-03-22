import React from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './utils/AuthContext'
import ProtectedRoute from './utils/ProtectedRoute'
import HomePage from './components/HomePage'
import './App.css'
import LoginPage from './components/LoginPage'
import SubAdminPage from './components/SubAdminPage'
import AdminDashboard from './components/AdminDashboard'
import ServiceDetailsPage from './components/ServiceDetailsPage'
import RegisterPage from './components/RegisterPage'
import ServiceProviderPage from './components/ServiceProviderPage'
import CreateService from './components/CreateService'
import MyTicketsPage from './components/MyTicketsPage'
import Header from './layout/Header'
import Footer from './layout/Footer'
import ScrollToHash from './utils/ScrollToHash'

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <div className="App">
          <Header />
          <ScrollToHash />
          <main className="app-main">
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/service-details/:id" element={<ServiceDetailsPage />} />
              <Route path="/service-details" element={<ServiceDetailsPage />} />

              <Route
                path="/my-tickets"
                element={
                  <ProtectedRoute>
                    <MyTicketsPage />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/service-provider"
                element={
                  <ProtectedRoute requiredRole="provider">
                    <ServiceProviderPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/service-provider/create-service"
                element={
                  <ProtectedRoute requiredRole="provider">
                    <CreateService />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/admin"
                element={
                  <ProtectedRoute requiredRole="admin">
                    <AdminDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/add-sub-admin"
                element={
                  <ProtectedRoute requiredRole="admin">
                    <SubAdminPage />
                  </ProtectedRoute>
                }
              />
            </Routes>
          </main>
          <Footer />
        </div>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
