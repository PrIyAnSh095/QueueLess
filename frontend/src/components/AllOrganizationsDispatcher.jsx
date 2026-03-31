import React from 'react';
import { useAuth } from '../utils/AuthContext';
import UserOrgList from './UserOrgList';
import AdminOrgList from './AdminOrgList';
import { Navigate } from 'react-router-dom';

const AllOrganizationsDispatcher = () => {
  const { user } = useAuth();

  if (!user) return <Navigate to="/login" />;

  if (user.role === 'admin') {
    return <AdminOrgList />;
  }

  if (user.role === 'provider') {
    return <Navigate to="/service-provider" />;
  }

  return <UserOrgList />;
};

export default AllOrganizationsDispatcher;
