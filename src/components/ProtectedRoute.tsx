import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles: string[];
  fallbackPath?: string;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  allowedRoles, 
  fallbackPath = '/login' 
}) => {
  const { user, isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to={fallbackPath} replace />;
  }

  if (!user || !allowedRoles.includes(user.role)) {
    // Redirect to appropriate dashboard based on user's role
    if (user?.role === 'pharmacy') {
      return <Navigate to="/pharma" replace />;
    } else if (user?.role === 'laboratory') {
      return <Navigate to="/lab" replace />;
    } else if (user?.role === 'radiology') {
      return <Navigate to="/radiology" replace />;
    }
    return <Navigate to={fallbackPath} replace />;
  }

  return <>{children}</>;
};
