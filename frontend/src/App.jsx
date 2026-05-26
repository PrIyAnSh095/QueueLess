import React from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './utils/AuthContext'
import ProtectedRoute from './utils/ProtectedRoute'
import HomePage from './components/HomePage'
import './App.css'
import LoginPage from './components/LoginPage'
import SubAdminPage from './components/SubAdminPage'
import AdminDashboard from './components/AdminDashboard'
import ServiceDetailsDispatcher from './components/ServiceDetailsDispatcher'
import RegisterPage from './components/RegisterPage'
import ServiceProviderPage from './components/ServiceProviderPage'
import CreateService from './components/CreateService'
import MyTicketsPage from './components/MyTicketsPage'
import Header from './layout/Header'
import Footer from './layout/Footer'
import ScrollToHash from './utils/ScrollToHash'
import ForgotPasswordPage from './components/ForgotPasswordPage'
import AllServicesDispatcher from './components/AllServicesDispatcher'
import AllOrganizationsDispatcher from './components/AllOrganizationsDispatcher'
import OrgDetailsDispatcher from './components/OrgDetailsDispatcher'
import UserDashboard from './components/UserDashboard'
import QueueManagementPage from './components/QueueManagementPage'
import QueueHistoryPage from './components/QueueHistoryPage'
import OrgStatusPage from './components/OrgStatusPage'
import CounterManagement from './components/CounterManagement'
import CounterDashboard from './components/CounterDashboard'
import ReceptionDashboard from './components/ReceptionDashboard'
import AdminUpdateRequestsPage from './components/AdminUpdateRequestsPage'
import OrgStatsPage from './components/OrgStatsPage'


function App() {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AuthProvider>
        <div className="App">
          <Header />
          <ScrollToHash />
          <main className="app-main">
            <Routes>
              {/* Public */}
              <Route path="/" element={<HomePage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              <Route path="/service-details/:id" element={<ServiceDetailsDispatcher />} />
              <Route path="/service-details" element={<ServiceDetailsDispatcher />} />

              {/* User Protected */}
              <Route path="/user-dashboard" element={<ProtectedRoute><UserDashboard /></ProtectedRoute>} />
              <Route path="/my-tickets" element={<ProtectedRoute><MyTicketsPage /></ProtectedRoute>} />
              <Route path="/services" element={<ProtectedRoute><AllServicesDispatcher /></ProtectedRoute>} />
              <Route path="/organizations" element={<ProtectedRoute><AllOrganizationsDispatcher /></ProtectedRoute>} />
              <Route path="/organizations/:id" element={<ProtectedRoute><OrgDetailsDispatcher /></ProtectedRoute>} />
              <Route path="/queue-history" element={<ProtectedRoute><QueueHistoryPage /></ProtectedRoute>} />

              {/* Provider/Staff Protected */}
              <Route path="/service-provider" element={<ProtectedRoute requiredRole="provider"><ServiceProviderPage /></ProtectedRoute>} />
              <Route path="/org-status" element={<ProtectedRoute requiredRole="provider"><OrgStatusPage /></ProtectedRoute>} />
              <Route path="/service-provider/create-service" element={<ProtectedRoute requiredRole="provider"><CreateService /></ProtectedRoute>} />
              <Route path="/service-provider/counters" element={<ProtectedRoute requiredRole="provider"><CounterManagement /></ProtectedRoute>} />
              <Route path="/service-provider/manage-queues" element={<ProtectedRoute requiredRole="provider"><QueueManagementPage /></ProtectedRoute>} />
              <Route path="/service-provider/stats" element={<ProtectedRoute requiredRole="provider"><OrgStatsPage /></ProtectedRoute>} />

              
              <Route path="/counter-dashboard" element={<ProtectedRoute requiredRole={['counter', 'provider', 'reception']}><CounterDashboard /></ProtectedRoute>} />
              <Route path="/reception-dashboard" element={<ProtectedRoute requiredRole={['reception', 'provider']}><ReceptionDashboard /></ProtectedRoute>} />

              {/* Admin Protected */}
              <Route path="/admin" element={<ProtectedRoute requiredRole="admin"><AdminDashboard /></ProtectedRoute>} />
              <Route path="/admin/update-requests" element={<ProtectedRoute requiredRole="admin"><AdminUpdateRequestsPage /></ProtectedRoute>} />
              <Route path="/admin/add-sub-admin" element={<ProtectedRoute requiredRole="admin"><SubAdminPage /></ProtectedRoute>} />
            </Routes>
          </main>
          <Footer />
        </div>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
