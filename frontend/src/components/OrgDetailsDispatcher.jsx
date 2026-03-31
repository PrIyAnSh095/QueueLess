import React from 'react';
import { useAuth } from '../utils/AuthContext';
import UserViewOrg from './UserViewOrg';
import AdminViewOrg from './AdminViewOrg';

const OrgDetailsDispatcher = () => {
  const { user } = useAuth();

  if (!user || user.role === 'admin') {
    return <AdminViewOrg />;
  }

  // Fallback to user view (guest or member)
  return <UserViewOrg />;
};

export default OrgDetailsDispatcher;
