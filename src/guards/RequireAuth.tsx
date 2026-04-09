import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../app/AuthContext';

export const RequireAuth = () => {
  const { user } = useAuth();
  const location = useLocation();

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <Outlet />;
};
