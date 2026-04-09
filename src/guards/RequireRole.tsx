import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../app/AuthContext';
import type { UserRole } from '../types/auth';

type RequireRoleProps = {
  allowedRoles: UserRole[];
};

export const RequireRole = ({ allowedRoles }: RequireRoleProps) => {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!allowedRoles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
};
