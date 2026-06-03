import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../store/AuthContext';

/**
 * Wraps protected routes. Redirects to /login if user is not authenticated.
 */
const ProtectedRoute = () => {
  const { isAuthenticated, onboardingCompleted } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // If user is authenticated but hasn't completed onboarding, force them to /onboarding
  // unless they are already on /onboarding
  if (!onboardingCompleted && location.pathname !== '/onboarding') {
    return <Navigate to="/onboarding" replace />;
  }
  
  // If user HAS completed onboarding but is trying to access /onboarding, redirect to /
  if (onboardingCompleted && location.pathname === '/onboarding') {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;
