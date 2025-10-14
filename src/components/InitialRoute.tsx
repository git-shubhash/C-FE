import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

export const InitialRoute: React.FC = () => {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated && user) {
      // Redirect to appropriate dashboard based on user's role
      if (user.role === 'pharmacy') {
        navigate('/pharma', { replace: true });
      } else if (user.role === 'laboratory') {
        navigate('/lab', { replace: true });
      } else {
        navigate('/', { replace: true });
      }
    } else {
      // If not authenticated, redirect to login
      navigate('/login', { replace: true });
    }
  }, [isAuthenticated, user, navigate]);

  // Show loading while determining route
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
    </div>
  );
};
