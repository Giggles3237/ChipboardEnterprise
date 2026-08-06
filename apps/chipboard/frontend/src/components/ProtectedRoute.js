import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const ProtectedRoute = ({ children, requiredRole }) => {
  const { auth } = useAuth();

  if (!auth.user) {
    return <Navigate to="/login" />;
  }

  if (requiredRole && auth.user.role !== requiredRole) {
    return <Navigate to="/" />;
  }

  return children;
};

export default ProtectedRoute; 