import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MapPin, Layers, Maximize2, Droplets, Thermometer,
  Sprout, Ruler, Navigation, Leaf, Plus, Trash2, X,
  Compass, Loader2, Save, Map as MapIcon, Info, Search
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap, useMapEvents, ScaleControl } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import Button from '../components/ui/Button';
import { useAuth } from '../store/AuthContext';
import api from '../services/api';

/* Fix Leaflet default marker icon path issue */
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

/* Custom colored marker factory */
const createIcon = (color) =>
  new L.DivIcon({
    className: '',
    html: `<div style="
      width:26px;height:26px;border-radius:50%;
      background:${color};border:3px solid #fff;
      box-shadow: 0 4px 10px rgba(0,0,0,0.3);
      display: flex; align-items: center; justify-content: center;
      transition: transform 0.2s ease;
    " onmouseover="this.style.transform='scale(1.25)'" onmouseout="this.style.transform='scale(1)'">
      <div style="width: 8px; height: 8px; border-radius: 50%; bg: #fff;"></div>
    </div>`,
    iconSize: [26, 26],
    iconAnchor: [13, 13],
    popupAnchor: [0, -13],
  });

const CROP_COLORS = {
  Rice: '#10b981', // emerald
  Wheat: '#f59e0b', // amber
  Maize: '#3b82f6', // blue
  Cotton: '#8b5cf6', // purple
  Sugarcane: '#06b6d4', // cyan
  Vegetables: '#ef4444', // red
  Soybean: '#84cc16', // lime
  Groundnut: '#f97316', // orange
  Other: '#6b7280', // gray
};

const SOIL_PRESETS = {
  Loamy: { moisture: 65, ph: 6.8, icon: '🌿' },
  Clayey: { moisture: 74, ph: 6.2, icon: '🌾' },
  Sandy: { moisture: 42, ph: 7.2, icon: '🌵' },
  'Black Cotton': { moisture: 68, ph: 7.0, icon: '☁️' }
};

const TILE_LAYERS = {
  satellite: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: '&copy; Esri',
  },
  terrain: {
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; OpenStreetMap',
  },
  topo: {
    url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
    attribution: '&copy; OpenTopoMap',
  },
};

/* Fly map to coordinates helper */
const FlyTo = ({ lat, lng, zoom = 16 }) => {
  const map = useMap();
  useEffect(() => {
    if (lat && lng) {
      map.flyTo([lat, lng], zoom, { duration: 1.2 });
    }
  }, [lat, lng, zoom, map]);
  return null;
};

/* Captures clicks on the map to trigger plot placement / re-centering */
const MapClickHandler = ({ onMapClick, isModalOpen, onReCenter }) => {
  useMapEvents({
    click(e) {
      if (isModalOpen) {
        onReCenter(e.latlng);
      } else {
        onMapClick(e.latlng);
      }
    },
  });
  return null;
};

/* Captures mouse movement coordinates over the map */
const MouseMoveCoordsHandler = ({ onMouseMove }) => {
  useMapEvents({
    mousemove(e) {
      onMouseMove(e.latlng);
    },
  });
  return null;
};

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
};
const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] } },
};

const SatelliteView = () => {
  const { user } = useAuth();
  const [plots, setPlots] = useState([]);
  const [farmData, setFarmData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeField, setActiveField] = useState(null);
  const [tileLayer, setTileLayer] = useState('satellite');
  const [flyTarget, setFlyTarget] = useState(null);

  // nominatim Location Search Overlay States
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hoverCoords, setHoverCoords] = useState(null);
  const [isLocating, setIsLocating] = useState(false);
  const [notification, setNotification] = useState(null);

  const showToast = (message, type = 'info') => {
    setNotification({ message, type });
    // auto dismiss after 6 seconds
    const timer = setTimeout(() => setNotification(null), 6000);
    return () => clearTimeout(timer);
  };

  const handleLocateMe = () => {
    if (!navigator.geolocation) {
      showToast("Geolocation is not supported by your browser.", "error");
      return;
    }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setFlyTarget({ lat: latitude, lng: longitude });
        setIsLocating(false);
        showToast("Centered map on your device coordinates!", "success");
      },
      (error) => {
        console.error("GPS retrieval failed:", error);
        setIsLocating(false);
        
        switch (error.code) {
          case error.PERMISSION_DENIED:
            showToast("Location access was blocked. Please enable GPS permissions in your browser or search manually by village/coordinates.", "warning");
            break;
          case error.POSITION_UNAVAILABLE:
            showToast("GPS signal unavailable or location services are disabled on your device. Please enter your coordinates manually in the search box.", "warning");
            break;
          case error.TIMEOUT:
            showToast("GPS request timed out. Please try again or type coordinates manually.", "warning");
            break;
          default:
            showToast("Unable to fetch device GPS. Please type your coordinates manually.", "warning");
        }
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  // Plot Creation & Dynamic Preview Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [clickCoords, setClickCoords] = useState(null);
  const [plotName, setPlotName] = useState('');
  const [plotArea, setPlotArea] = useState('2.5');
  const [plotSoil, setPlotSoil] = useState('Loamy');
  const [plotIrrigation, setPlotIrrigation] = useState('Drip');
  const [plotCrop, setPlotCrop] = useState('Rice');

  // Load user farm plots on mount
  useEffect(() => {
    if (!user?.uid) return;
    const loadFarmPlots = async () => {
      try {
        const doc = await api.users.getMe(user.uid);
        if (doc.farm) {
          setFarmData(doc.farm);
          if (doc.farm.plots && Array.isArray(doc.farm.plots)) {
            setPlots(doc.farm.plots);
            const firstMapped = doc.farm.plots.find(p => p.lat && p.lng);
            if (firstMapped) {
              setActiveField(firstMapped.id);
              setFlyTarget({ lat: firstMapped.lat, lng: firstMapped.lng });
            } else if (doc.farm.plots.length > 0) {
              setActiveField(doc.farm.plots[0].id);
            }
          }
        }
      } catch (err) {
        console.error('Failed to load farm plots:', err);
      } finally {
        setIsLoading(false);
      }
    };
    loadFarmPlots();
  }, [user?.uid]);

  const totalArea = useMemo(
    () => plots.reduce((sum, f) => sum + (parseFloat(f.area) || 0), 0).toFixed(1),
    [plots]
  );

  const avgMoisture = useMemo(
    () => plots.length > 0 
      ? Math.round(plots.reduce((sum, f) => sum + (f.moisture || 60), 0) / plots.length)
      : 0,
    [plots]
  );

  const handleFieldClick = (field) => {
    setActiveField(field.id);
    if (field.lat && field.lng) {
      setFlyTarget({ lat: field.lat, lng: field.lng });
    }
  };

  const handleMapClick = (latlng) => {
    setClickCoords(latlng);
    setPlotName(`Plot ${plots.length + 1}`);
    setIsModalOpen(true);
  };

  // Re-centering handler: drags or shifts golden preview circle to newly clicked spot!
  const handleMapReCenter = (latlng) => {
    setClickCoords(latlng);
  };

  // Geocoding handler
  const handleLocationSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    // Check if the query is a Lat/Lng pattern (e.g. "23.3643, 80.0827" or "23.3643 80.0827")
    const queryCleaned = searchQuery.trim().replace(/\s+/g, ' ');
    const parts = queryCleaned.split(/[\s,]+/);
    
    if (parts.length === 2) {
      const lat = parseFloat(parts[0]);
      const lng = parseFloat(parts[1]);
      if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
        setFlyTarget({ lat, lng });
        setSearchQuery(`${lat.toFixed(5)}, ${lng.toFixed(5)}`);
        setSearchResults([]);
        return;
      }
    }

    setIsSearching(true);
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=5`);
      const data = await res.json();
      setSearchResults(data);
    } catch (err) {
      console.error('Nominatim Geocoding API failed:', err);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectLocation = (loc) => {
    const lat = parseFloat(loc.lat);
    const lng = parseFloat(loc.lon);
    setFlyTarget({ lat, lng });
    setSearchResults([]);
    setSearchQuery(loc.display_name);
  };

  const handleAddPlot = async (e) => {
    e.preventDefault();
    if (!clickCoords) return;

    const preset = SOIL_PRESETS[plotSoil] || { moisture: 60, ph: 6.8, icon: '🌿' };
    
    // Calculates a realistic circle radius in meters based on the Acre area size (1 Acre = ~4046.86 sqm)
    const areaAcres = parseFloat(plotArea) || 1.0;
    const areaSqMeters = areaAcres * 4046.86;
    const computedRadius = Math.round(Math.sqrt(areaSqMeters / Math.PI));

    const newPlot = {
      id: `plot_${Date.now()}`,
      name: plotName || `Plot ${plots.length + 1}`,
      crop: plotCrop,
      icon: preset.icon,
      area: areaAcres,
      lat: clickCoords.lat,
      lng: clickCoords.lng,
      radius: computedRadius,
      soil: plotSoil,
      ph: preset.ph,
      moisture: preset.moisture,
      irrigation: plotIrrigation,
      lastIrrigation: 'Today',
      status: 'Growing',
    };

    const updatedPlots = [...plots, newPlot];
    setPlots(updatedPlots);

    // Save to Database
    try {
      const updatedFarm = {
        ...farmData,
        plots: updatedPlots,
      };
      await api.users.saveFarm(user.uid, updatedFarm);
      setFarmData(updatedFarm);
    } catch (err) {
      console.error('Failed to save plot to database:', err);
    }

    setIsModalOpen(false);
    setClickCoords(null);
    setActiveField(newPlot.id);
    setFlyTarget({ lat: newPlot.lat, lng: newPlot.lng });
  };

  const handleDeletePlot = async (plotId, e) => {
    e.stopPropagation();
    const updatedPlots = plots.filter((p) => p.id !== plotId);
    setPlots(updatedPlots);
    if (activeField === plotId) {
      setActiveField(updatedPlots.length > 0 ? updatedPlots[0].id : null);
    }

    try {
      const updatedFarm = {
        ...farmData,
        plots: updatedPlots,
      };
      await api.users.saveFarm(user.uid, updatedFarm);
      setFarmData(updatedFarm);
    } catch (err) {
      console.error('Failed to delete plot:', err);
    }
  };

  // Center around New Delhi or first user plot location
  const firstMappedPlot = plots.find(p => p.lat && p.lng);
  const mapCenter = firstMappedPlot ? [firstMappedPlot.lat, firstMappedPlot.lng] : [28.6139, 77.2090];
  const zoomLevel = firstMappedPlot ? 15 : 6;
  const tile = TILE_LAYERS[tileLayer];

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px] gap-4">
        <Loader2 className="animate-spin text-emerald-600" size={48} />
        <p className="text-neutral-500 font-medium">Loading high-resolution farm layers...</p>
      </div>
    );
  }

  return (
    <motion.div className="max-w-7xl mx-auto space-y-8 h-[calc(100vh-8rem)] flex flex-col text-left hover:none" variants={containerVariants} initial="hidden" animate="visible">
      
      {/* Dynamic toast notification */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className={`fixed top-4 left-1/2 -translate-x-1/2 z-[5000] px-4 py-3 rounded-xl border shadow-xl flex items-center gap-2.5 max-w-md w-full text-xs font-semibold ${
              notification.type === 'error' ? 'bg-red-50 border-red-200 text-red-800' :
              notification.type === 'warning' ? 'bg-amber-50 border-amber-200 text-amber-900' :
              notification.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' :
              'bg-white border-neutral-200 text-neutral-800'
            }`}
          >
            <div className="shrink-0">
              {notification.type === 'error' && <X className="text-red-500" size={15} />}
              {notification.type === 'warning' && <Info className="text-amber-500 animate-pulse" size={15} />}
              {notification.type === 'success' && <Leaf className="text-emerald-500 animate-bounce" size={15} />}
              {notification.type === 'info' && <Compass className="text-emerald-600 animate-spin" size={15} />}
            </div>
            <div className="flex-grow leading-relaxed pr-4">{notification.message}</div>
            <button
              onClick={() => setNotification(null)}
              className="text-neutral-400 hover:text-neutral-600 self-start"
            >
              <X size={14} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header Panel */}
      <motion.div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0" variants={cardVariants}>
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight text-neutral-900 flex items-center gap-2">
            <MapIcon className="text-emerald-600" size={28} /> Farm Layout Mapper
          </h1>
          <p className="text-neutral-500 text-sm flex items-center gap-1">
             Search your farmlands, click satellite tiles, and scale dynamic previews.
          </p>
        </div>
        
        {/* Toggle Layer */}
        <div className="flex items-center gap-2 bg-neutral-100 p-1 rounded-lg self-start sm:self-auto border border-neutral-200">
          {Object.keys(TILE_LAYERS).map((key) => (
            <button
              key={key}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${tileLayer === key ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-600 hover:text-neutral-900'}`}
              onClick={() => setTileLayer(key)}
            >
              {key.charAt(0).toUpperCase() + key.slice(1)}
            </button>
          ))}
        </div>
      </motion.div>

      {/* Map + Sidebar Segment */}
      <motion.div className="flex flex-col lg:flex-row gap-6 min-h-0 grow" variants={cardVariants}>
        
        {/* Leaflet Satellite Map Frame */}
        <div className="flex-grow rounded-xl border border-neutral-200 overflow-hidden relative min-h-[400px] lg:min-h-0 shadow-sm bg-neutral-50">
          
          {/* Status overlay info */}
          <div className="absolute top-4 left-4 z-[2000] flex flex-wrap gap-2 pointer-events-none">
            <div className="bg-white/90 backdrop-blur-sm border border-neutral-200 px-3 py-1.5 rounded-full shadow-sm flex items-center gap-1.5 text-xs font-semibold text-neutral-700">
              <MapPin size={13} className="text-emerald-600" /> {plots.length} Parcels placed
            </div>
            <div className="bg-white/90 backdrop-blur-sm border border-neutral-200 px-3 py-1.5 rounded-full shadow-sm flex items-center gap-1.5 text-xs font-semibold text-neutral-700">
              <Ruler size={13} className="text-emerald-600" /> {totalArea} total acres
            </div>
          </div>

          {/* Real-Time Geocoding Location Search Overlay */}
          <div className="absolute top-4 right-4 z-[2000] w-80 bg-white/95 backdrop-blur-sm border border-neutral-200 p-2.5 rounded-xl shadow-lg flex flex-col gap-2">
            <form onSubmit={handleLocationSearch} className="flex gap-2 relative">
              <div className="relative flex-grow">
                <input
                  type="text"
                  className="w-full pl-8 pr-8 py-2 border border-neutral-200 rounded-lg text-xs font-semibold text-neutral-800 bg-white focus:outline-none focus:border-emerald-600"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search address or enter coordinates (Lat, Lng)..."
                />
                <div className="absolute left-2.5 top-2.5 text-neutral-400">
                  {isSearching ? <Loader2 size={13} className="animate-spin text-emerald-600" /> : <Search size={13} />}
                </div>
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => { setSearchQuery(''); setSearchResults([]); }}
                    className="absolute right-2.5 top-2.5 text-neutral-400 hover:text-neutral-600"
                  >
                    <X size={13} />
                  </button>
                )}
              </div>

              {/* GPS Locate Me Button */}
              <button
                type="button"
                onClick={handleLocateMe}
                className={`p-2 border rounded-lg text-neutral-500 hover:bg-neutral-50 focus:outline-none shrink-0 ${isLocating ? 'animate-pulse text-emerald-600 border-emerald-300 bg-emerald-50' : 'border-neutral-200 bg-white'}`}
                title="Locate my current position"
              >
                {isLocating ? <Loader2 size={13} className="animate-spin" /> : <Navigation size={13} />}
              </button>

              <button
                type="submit"
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-md shadow-emerald-600/10 cursor-pointer"
              >
                Search
              </button>
            </form>

            {/* Dropdown Suggestions list */}
            {searchResults.length > 0 && (
              <div className="max-h-56 overflow-y-auto border border-neutral-100 rounded-lg divide-y divide-neutral-50 bg-white shadow-inner animate-in fade-in slide-in-from-top-2 duration-150">
                {searchResults.map((result, idx) => (
                  <button
                    key={idx}
                    type="button"
                    className="w-full text-left p-2.5 hover:bg-neutral-50 flex items-start gap-2 text-[11px] font-medium text-neutral-700 transition-colors cursor-pointer"
                    onClick={() => handleSelectLocation(result)}
                  >
                    <MapPin size={12} className="mt-0.5 text-emerald-600 shrink-0" />
                    <span>{result.display_name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="absolute bottom-4 left-4 z-[2000] flex flex-col gap-2 pointer-events-none">
            {hoverCoords && (
              <div className="bg-neutral-900/90 text-white px-3 py-1.5 rounded-lg text-[10px] font-mono tracking-wider shadow-sm flex items-center gap-1.5 self-start">
                <Compass size={11} className="text-emerald-400 animate-spin-slow" />
                <span>{hoverCoords.lat.toFixed(6)}°, {hoverCoords.lng.toFixed(6)}°</span>
              </div>
            )}
            <div className="bg-white/90 backdrop-blur-sm border border-neutral-200 p-3 rounded-xl shadow-md max-w-xs text-xs space-y-1.5">
              <p className="font-bold text-neutral-800 flex items-center gap-1">
                <Info size={12} className="text-emerald-600" /> Dynamic Map Calibration
              </p>
              <p className="text-neutral-600 leading-normal">
                Click satellite tiles to drop/re-center land preview circles. Drag the acreage slider in the modal to physically scale land sizes.
              </p>
            </div>
          </div>

          <MapContainer
            center={mapCenter}
            zoom={zoomLevel}
            className="w-full h-full animate-none"
            zoomControl={true}
            scrollWheelZoom={true}
          >
            <TileLayer url={tile.url} attribution={tile.attribution} />

            {flyTarget && <FlyTo lat={flyTarget.lat} lng={flyTarget.lng} />}

            <MapClickHandler
              onMapClick={handleMapClick}
              isModalOpen={isModalOpen}
              onReCenter={handleMapReCenter}
            />

            <MouseMoveCoordsHandler onMouseMove={setHoverCoords} />

            <ScaleControl position="bottomright" />

            {/* Active Live Dashed Preview Circle */}
            {isModalOpen && clickCoords && (
              <Circle
                center={[clickCoords.lat, clickCoords.lng]}
                radius={Math.round(Math.sqrt((parseFloat(plotArea) || 1.0) * 4046.86 / Math.PI))}
                pathOptions={{
                  color: '#fbbf24', // bright golden yellow
                  fillColor: '#fbbf24',
                  fillOpacity: 0.35,
                  dashArray: '8, 8', // elegant dashed vector line!
                  weight: 3,
                }}
              />
            )}

            {plots.map((field) => {
              if (!field.lat || !field.lng) return null;
              return (
              <React.Fragment key={field.id}>
                {/* Dynamically scaled Circle based on Acreage size! */}
                <Circle
                  center={[field.lat, field.lng]}
                  radius={field.radius || 100}
                  pathOptions={{
                    color: CROP_COLORS[field.crop] || '#10b981',
                    fillColor: CROP_COLORS[field.crop] || '#10b981',
                    fillOpacity: activeField === field.id ? 0.45 : 0.2,
                    weight: activeField === field.id ? 3 : 1.5,
                  }}
                />

                <Marker
                  position={[field.lat, field.lng]}
                  icon={createIcon(CROP_COLORS[field.crop] || '#10b981')}
                  eventHandlers={{ click: () => handleFieldClick(field) }}
                >
                  <Popup>
                    <div className="p-2 text-left min-w-[160px] space-y-2">
                      <h4 className="font-bold text-neutral-900 flex items-center gap-1.5 border-b border-neutral-100 pb-1.5">
                        <span className="text-lg">{field.icon || '📍'}</span> {field.name}
                      </h4>
                      <div className="space-y-1 text-xs text-neutral-600 font-medium">
                        <p><span className="text-neutral-400">Crop:</span> {field.crop}</p>
                        <p><span className="text-neutral-400">Area:</span> {field.area} Acres</p>
                        <p><span className="text-neutral-400">Soil:</span> {field.soil}</p>
                        <p><span className="text-neutral-400">Irrigation:</span> {field.irrigation}</p>
                        <p><span className="text-neutral-400">Moisture:</span> {field.moisture}%</p>
                      </div>
                    </div>
                  </Popup>
                </Marker>
              </React.Fragment>
              );
            })}
          </MapContainer>
        </div>

        {/* Sidebar Lands Control Panel */}
        <Card className="w-full lg:w-96 flex flex-col shrink-0 overflow-hidden shadow-sm border-neutral-200 bg-white">
          <CardHeader className="border-b border-neutral-100 bg-neutral-50/50 py-4 shrink-0">
            <CardTitle className="text-base flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Layers size={18} className="text-neutral-500" /> Land Parcels Overview
              </span>
              <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full uppercase">
                Active
              </span>
            </CardTitle>
          </CardHeader>

          {/* Plot List container */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {plots.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shadow-inner">
                  <Compass size={32} className="animate-pulse" />
                </div>
                <div className="space-y-1 px-4">
                  <p className="font-bold text-neutral-900 text-base">No Lands Mapped Yet</p>
                  <p className="text-xs text-neutral-500 max-w-[240px] leading-relaxed mx-auto">
                    Search your location, center the map, and drop coordinates directly to place and configure custom land parcels.
                  </p>
                </div>
              </div>
            ) : (
              plots.map((field) => (
                <div
                  key={field.id}
                  className={`p-4 rounded-xl border transition-all cursor-pointer relative group ${activeField === field.id ? 'border-emerald-600 bg-emerald-50/20 shadow-sm' : 'border-neutral-200 hover:border-neutral-300 bg-white'}`}
                  onClick={() => handleFieldClick(field)}
                >
                  <div className="flex justify-between items-start mb-3 pr-6">
                    <p className="font-bold text-neutral-900 flex items-center gap-1.5 text-sm">
                      <span className="text-base">{field.icon || '📍'}</span> {field.name}
                    </p>
                    <div className="flex flex-col items-end gap-1">
                      <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-md" style={{
                        backgroundColor: `${CROP_COLORS[field.crop] || '#10b981'}15`,
                        color: CROP_COLORS[field.crop] || '#10b981'
                      }}>
                        {field.crop}
                      </span>
                      {(!field.lat || !field.lng) && (
                        <span className="text-[9px] text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded border border-orange-100 font-semibold shadow-sm">Unmapped</span>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 mb-3">
                    <div className="flex flex-col">
                      <span className="text-[9px] text-neutral-400 font-bold uppercase tracking-wider mb-0.5">Area</span>
                      <span className="text-xs font-bold text-neutral-800 flex items-center gap-1"><Ruler size={11} className="text-neutral-400" /> {field.area} ac</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[9px] text-neutral-400 font-bold uppercase tracking-wider mb-0.5">Soil Moist</span>
                      <span className="text-xs font-bold text-neutral-800 flex items-center gap-1"><Droplets size={11} className="text-neutral-400" /> {field.moisture}%</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[9px] text-neutral-400 font-bold uppercase tracking-wider mb-0.5">Soil pH</span>
                      <span className="text-xs font-bold text-neutral-800 flex items-center gap-1"><Thermometer size={11} className="text-neutral-400" /> {field.ph}</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1.5 border-t border-neutral-100/60 pt-2.5">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-neutral-100 text-neutral-600">{field.soil}</span>
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-neutral-100 text-neutral-600">{field.irrigation}</span>
                  </div>

                  {/* Absolute positioning trash button */}
                  <button
                    className="absolute top-4 right-4 text-neutral-400 hover:text-red-600 p-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => handleDeletePlot(field.id, e)}
                    title="Delete Plot"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Bottom Summary Indicators */}
          {plots.length > 0 && (
            <div className="p-4 border-t border-neutral-100 bg-neutral-50 grid grid-cols-4 gap-2 text-center shrink-0">
              <div>
                <p className="text-base font-bold text-neutral-900">{totalArea}</p>
                <p className="text-[9px] text-neutral-400 uppercase font-bold tracking-wider">Total Ac</p>
              </div>
              <div className="border-l border-neutral-200">
                <p className="text-base font-bold text-neutral-900">{plots.length}</p>
                <p className="text-[9px] text-neutral-400 uppercase font-bold tracking-wider">Plots</p>
              </div>
              <div className="border-l border-neutral-200">
                <p className="text-base font-bold text-neutral-900">{avgMoisture}%</p>
                <p className="text-[9px] text-neutral-400 uppercase font-bold tracking-wider">Avg Moist</p>
              </div>
              <div className="border-l border-neutral-200">
                <p className="text-base font-bold text-neutral-900">{new Set(plots.map((f) => f.crop)).size}</p>
                <p className="text-[9px] text-neutral-400 uppercase font-bold tracking-wider">Crops</p>
              </div>
            </div>
          )}
        </Card>
      </motion.div>

      {/* Plot Configure & Dynamic Preview Placement Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
            <motion.div
              className="absolute inset-0 bg-neutral-950/60 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => { setIsModalOpen(false); setClickCoords(null); }}
            />

            <motion.div
              className="bg-white rounded-2xl border border-neutral-200 shadow-2xl p-6 max-w-md w-full relative z-10 space-y-4 text-left"
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className="flex justify-between items-center border-b border-neutral-100 pb-3">
                <div>
                  <h3 className="text-lg font-bold text-neutral-900 flex items-center gap-1.5">
                    <Plus className="text-emerald-600 animate-bounce" size={20} /> Place Land Plot
                  </h3>
                  <p className="text-xs text-neutral-400 mt-0.5">Scale the physical acreage live on the satellite tiles.</p>
                </div>
                <button
                  onClick={() => { setIsModalOpen(false); setClickCoords(null); }}
                  className="text-neutral-400 hover:text-neutral-700 p-1 rounded-full hover:bg-neutral-100"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleAddPlot} className="space-y-4 text-xs font-semibold text-neutral-700">
                
                {/* Real-time Dynamic Acreage Slider calibration */}
                <div className="space-y-1.5 border border-neutral-100 p-3 rounded-xl bg-neutral-50/50">
                  <div className="flex justify-between text-neutral-500 uppercase tracking-wider text-[10px] font-bold">
                    <span>Plot Area footprint</span>
                    <span className="text-emerald-600 font-bold">{plotArea} Acres</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <input
                      type="range"
                      min="0.5"
                      max="15.0"
                      step="0.1"
                      className="w-full h-1.5 bg-neutral-200 rounded-lg appearance-none cursor-pointer accent-emerald-600"
                      value={plotArea}
                      onChange={(e) => setPlotArea(e.target.value)}
                    />
                    <input
                      type="number"
                      step="0.1"
                      min="0.1"
                      required
                      className="w-20 border border-neutral-200 rounded-lg px-2 py-1 text-xs font-bold text-neutral-900 bg-white focus:outline-none focus:border-emerald-600"
                      value={plotArea}
                      onChange={(e) => setPlotArea(e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-neutral-500 uppercase tracking-wider text-[10px]">Plot Name</label>
                    <input
                      type="text"
                      required
                      className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-sm font-medium text-neutral-900 bg-white focus:outline-none focus:border-emerald-600"
                      value={plotName}
                      onChange={(e) => setPlotName(e.target.value)}
                      placeholder="e.g. South Ridge"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-neutral-500 uppercase tracking-wider text-[10px]">Active Crop</label>
                    <select
                      className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-sm font-medium text-neutral-900 bg-white focus:outline-none focus:border-emerald-600 cursor-pointer"
                      value={plotCrop}
                      onChange={(e) => setPlotCrop(e.target.value)}
                    >
                      {Object.keys(CROP_COLORS).map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-neutral-500 uppercase tracking-wider text-[10px]">Soil Composition</label>
                    <select
                      className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-sm font-medium text-neutral-900 bg-white focus:outline-none focus:border-emerald-600 cursor-pointer"
                      value={plotSoil}
                      onChange={(e) => setPlotSoil(e.target.value)}
                    >
                      <option value="Loamy">Loamy Soil</option>
                      <option value="Clayey">Clayey Soil</option>
                      <option value="Sandy">Sandy Soil</option>
                      <option value="Black Cotton">Black Cotton Soil</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-neutral-500 uppercase tracking-wider text-[10px]">Irrigation Type</label>
                    <select
                      className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-sm font-medium text-neutral-900 bg-white focus:outline-none focus:border-emerald-600 cursor-pointer"
                      value={plotIrrigation}
                      onChange={(e) => setPlotIrrigation(e.target.value)}
                    >
                      <option value="Drip">Drip Irrigation</option>
                      <option value="Sprinkler">Sprinkler Systems</option>
                      <option value="Flood">Flood Basins</option>
                      <option value="Rainfed">Rainfed Fields</option>
                    </select>
                  </div>
                </div>

                {/* Spatial Calibration Guide */}
                <div className="bg-amber-50/70 border border-amber-200/50 rounded-xl p-3 text-[11px] text-amber-800 font-medium space-y-1.5">
                  <p className="font-bold flex items-center gap-1 text-amber-900">
                    <Info size={12} className="text-amber-700 animate-pulse" /> Precision Mapping Anchored
                  </p>
                  <p>
                    Coordinates: <span className="font-bold">{clickCoords.lat.toFixed(5)}, {clickCoords.lng.toFixed(5)}</span>
                  </p>
                  <p className="text-[10px] text-amber-700 font-semibold leading-normal">
                    💡 Tip: Click anywhere directly on the satellite map behind this popup to instantly shift the golden preview circle to that exact spot.
                  </p>
                </div>

                <div className="flex gap-3 justify-end pt-2">
                  <button
                    type="button"
                    onClick={() => { setIsModalOpen(false); setClickCoords(null); }}
                    className="px-4 py-2 border border-neutral-200 rounded-lg font-bold text-neutral-500 hover:bg-neutral-50 hover:text-neutral-700 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-emerald-600 text-white rounded-lg font-bold hover:bg-emerald-700 shadow-md shadow-emerald-600/10 transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <Save size={14} /> Place Plot
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default SatelliteView;
