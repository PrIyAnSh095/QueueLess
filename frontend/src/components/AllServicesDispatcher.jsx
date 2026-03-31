import React from 'react';
import { useAuth } from '../utils/AuthContext';
import UserServiceList from './UserServiceList';
import AdminServiceList from './AdminServiceList';
import { Navigate } from 'react-router-dom';

const AllServicesDispatcher = () => {
  const { user } = useAuth();

  if (!user) return <Navigate to="/login" />;

  if (user.role === 'admin') {
    return <AdminServiceList />;
  }

  if (user.role === 'provider') {
    return <Navigate to="/service-provider" />;
  }

  return <UserServiceList />;
};

export default AllServicesDispatcher;
