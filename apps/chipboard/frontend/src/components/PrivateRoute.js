import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './PrivateRoute.css';

function PrivateRoute({ children, roles }) {
  const { auth } = useAuth();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate checking auth state
    const checkAuth = () => {
      setTimeout(() => {
        setLoading(false);
      }, 500); // Small delay to prevent flash
    };
    checkAuth();
  }, []);

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  if (!auth || !auth.user) {
    return <Navigate to="/login" />;
  }

  // Check role-based access if roles are specified
  if (roles && roles.length > 0) {
    const userRole = auth.user.role || auth.user.role_name;
    if (!roles.includes(userRole)) {
      return <Navigate to="/" />;
    }
  }

  return children;
}

export default PrivateRoute; 