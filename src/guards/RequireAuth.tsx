import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../app/AuthContext';

export const RequireAuth = () => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <div>Проверка сессии...</div>;
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <Outlet />;
};
