import React, { createContext, useContext, useState, useEffect } from 'react';
import authService from '../services/firebase';
import api from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [onboardingCompleted, setOnboardingCompleted] = useState(false);
  const [loading, setLoading] = useState(true); // true until Firebase resolves auth state

  useEffect(() => {
    // Subscribe to Firebase auth state changes — single source of truth
    const unsubscribe = authService.onAuthStateChanged(async (firebaseUser) => {
      if (firebaseUser) {
        try {
          // Fetch from MongoDB to check onboarding state
          const userDoc = await api.users.getMe(firebaseUser.uid);
          // Check if any actual data exists in profile, farm, or preferences
          const hasFarmData = Object.keys(userDoc?.farm || {}).length > 0;
          const hasProfileData = Object.keys(userDoc?.profile || {}).length > 0;
          
          if (hasFarmData || hasProfileData) {
            setOnboardingCompleted(true);
          } else {
            setOnboardingCompleted(false);
          }
        } catch (err) {
          console.error("Failed to fetch user doc for onboarding status", err);
          setOnboardingCompleted(false);
        }
      } else {
        setOnboardingCompleted(false);
      }
      
      setUser(firebaseUser);
      setLoading(false);
    });

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, []);

  const completeOnboarding = () => setOnboardingCompleted(true);

  const value = {
    user,
    loading,
    isAuthenticated: !!user,
    onboardingCompleted,
    completeOnboarding,
    signOut: authService.signOut,
  };

  return (
    <AuthContext.Provider value={value}>
      {/* Don't render children until auth state is known to prevent flash */}
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
