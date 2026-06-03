import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './store/AuthContext';
import { WorkspaceProvider } from './store/WorkspaceContext';

// Layouts
import AppLayout from './components/layout/AppLayout';
import AuthLayout from './components/layout/AuthLayout';
import ProtectedRoute from './components/shared/ProtectedRoute';
import PublicRoute from './components/shared/PublicRoute';

// Public Pages
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import ResetPassword from './pages/ResetPassword';

// Protected Pages
import FarmOverview from './pages/FarmOverview';
import PlotDashboard from './pages/PlotDashboard';
import Weather from './pages/Weather';
import CropRecommendation from './pages/CropRecommendation';
import FarmWorkspace from './pages/FarmWorkspace';
import MarketPrices from './pages/MarketPrices';
import Settings from './pages/Settings';
import Onboarding from './pages/Onboarding';
import YieldPlanner from './pages/YieldPlanner';
import GlobalMarket from './pages/GlobalMarket';

const App = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public landing page and auth routes */}
          <Route element={<PublicRoute />}>
            <Route path="/" element={<Landing />} />
            <Route element={<AuthLayout />}>
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/reset-password" element={<ResetPassword />} />
            </Route>
          </Route>

          {/* Protected app — requires authentication */}
          <Route element={<ProtectedRoute />}>
            <Route path="/onboarding" element={<Onboarding />} />
            <Route
              element={
                <WorkspaceProvider>
                  <AppLayout />
                </WorkspaceProvider>
              }
            >
              {/* Global Routes */}
              <Route path="/dashboard" element={<FarmOverview />} />
              <Route path="/workspace" element={<FarmWorkspace />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/crops" element={<CropRecommendation />} />
              <Route path="/weather" element={<Weather />} />
              <Route path="/global-market" element={<GlobalMarket />} />

              {/* Plot Workspace Routes */}
              <Route path="/plot/:plotId">
                <Route index element={<Navigate to="dashboard" replace />} />
                <Route path="dashboard" element={<PlotDashboard />} />
                <Route path="market" element={<MarketPrices />} />
                <Route path="yield" element={<YieldPlanner />} />
              </Route>
            </Route>
          </Route>

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;
