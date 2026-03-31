import React from 'react';
import { useAuth } from '../utils/AuthContext';
import UserViewService from './UserViewService';
import AdminViewService from './AdminViewService';
import ProviderViewService from './ProviderViewService';

/**
 * Dispatches to the correct role-specific service detail component.
 */
const ServiceDetailsDispatcher = () => {
  const { user } = useAuth();

  if (!user || user.role === 'user') {
    return <UserViewService />;
  }

  if (user.role === 'admin') {
    return <AdminViewService />;
  }

  if (user.role === 'provider' || user.role === 'counter' || user.role === 'reception') {
    return <ProviderViewService />;
  }

  // Fallback to user view (read-only for guests)
  return <UserViewService />;
};

export default ServiceDetailsDispatcher;
