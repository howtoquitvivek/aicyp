import React, { createContext, useContext, useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import api from '../services/api';

const WorkspaceContext = createContext();

export const useWorkspace = () => useContext(WorkspaceContext);

export const WorkspaceProvider = ({ children }) => {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [farmData, setFarmData] = useState(null);
  const [profileData, setProfileData] = useState(null);
  const [plots, setPlots] = useState([]);
  const [activePlot, setActivePlot] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.uid) {
      setLoading(false);
      return;
    }

    const fetchFarm = async () => {
      try {
        const userDoc = await api.users.getMe(user.uid);
        if (userDoc) {
          setProfileData(userDoc.profile || {});
          const farm = userDoc.farm || {};
          setFarmData(farm);
          const p = farm.plots || [];
          setPlots(p);
        }
      } catch (err) {
        console.error('Failed to load farm context:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchFarm();
  }, [user?.uid]);

  useEffect(() => {
    if (loading || !plots.length) return;

    // Check if URL matches /plot/:plotId/...
    const match = location.pathname.match(/^\/plot\/([^\/]+)/);
    
    if (match) {
      const plotId = match[1];
      const plot = plots.find(p => p.id === plotId);
      if (plot) {
        setActivePlot(plot);
      } else {
        // Invalid plot ID, redirect to first plot or dashboard
        if (plots.length > 0) {
          navigate(`/plot/${plots[0].id}/dashboard`, { replace: true });
        } else {
          navigate('/dashboard', { replace: true });
        }
      }
    } else {
      setActivePlot(null);
    }
  }, [location.pathname, plots, loading, navigate]);

  const switchPlot = (plotId, subRoute = 'dashboard') => {
    if (!plots.find(p => p.id === plotId)) return;
    navigate(`/plot/${plotId}/${subRoute}`);
  };

  const value = {
    profileData,
    farmData,
    plots,
    activePlot,
    switchPlot,
    loading
  };

  return (
    <WorkspaceContext.Provider value={value}>
      {children}
    </WorkspaceContext.Provider>
  );
};
