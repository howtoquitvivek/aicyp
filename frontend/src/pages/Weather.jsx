import React, { useState, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Droplets, Wind, Eye, Gauge, ThermometerSun,
  CloudRain, Search, RefreshCw, AlertTriangle, MapPin
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { useAuth } from '../store/AuthContext';
import api from '../services/api';
import { useWorkspace } from '../store/WorkspaceContext';

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
};

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] } },
};

const aqiLabels = ['', 'Good', 'Fair', 'Moderate', 'Poor', 'Very Poor'];
const aqiColors = ['', 'text-emerald-600', 'text-yellow-600', 'text-orange-600', 'text-red-600', 'text-purple-600'];
const aqiDescs = [
  '',
  'Air quality is satisfactory. Enjoy your day outside.',
  'Acceptable air quality. Sensitive groups may notice effects.',
  'Moderate pollution. Consider reducing prolonged outdoor exertion.',
  'Poor air quality. Limit time outdoors.',
  'Very poor. Avoid outdoor activities.',
];

const formatDate = (dateStr) => {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
};

const chartTooltipStyle = {
  backgroundColor: '#ffffff',
  border: '1px solid #f1f5f9',
  borderRadius: '8px',
  color: '#0f172a',
  fontSize: '0.875rem',
  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
};

const Weather = () => {
  const { user } = useAuth();
  const { profileData, loading: workspaceLoading } = useWorkspace();
  const navigate = useNavigate();
  
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastRefreshed, setLastRefreshed] = useState(null);

  const fetchWeather = useCallback(async (targetCity, forceRefresh = false) => {
    if (!targetCity) return;
    setLoading(true);
    setError(null);
    try {
      const cacheKey = `weather_cache_${user?.uid || 'guest'}_${targetCity.toLowerCase()}`;
      if (!forceRefresh) {
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
          try {
            const { timestamp, data: cachedData } = JSON.parse(cached);
            const CACHE_TTL = 1800000; // 30 minutes
            if (Date.now() - timestamp < CACHE_TTL) {
              console.log(`[Weather] Serving cached telemetry for ${targetCity}`);
              setData(cachedData);
              setLastRefreshed(new Date(timestamp));
              setLoading(false);
              return;
            }
          } catch (e) {
            console.error('[Weather] Failed to parse cache:', e);
          }
        }
      }

      console.log(`[Weather] Fetching fresh telemetry for ${targetCity}`);
      const result = await api.weather.getFull(targetCity);
      setData(result);
      
      const now = Date.now();
      setLastRefreshed(new Date(now));
      
      // Store in cache
      const cachePayload = {
        timestamp: now,
        data: result
      };
      localStorage.setItem(cacheKey, JSON.stringify(cachePayload));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [user?.uid]);

  useEffect(() => {
    if (workspaceLoading) return;
    // prioritize activePlot's location if we add one in the future, else fallback to profile district
    if (!profileData?.district) return;
    const cityLoc = profileData.district;
    fetchWeather(cityLoc);
  }, [workspaceLoading, profileData, fetchWeather]);

  // Log first view event if applicable
  useEffect(() => {
    if (data && user?.uid) {
      api.users.logFirstView(user.uid, 'global', 'weather').catch(() => {});
    }
  }, [data, user?.uid]);

  if (workspaceLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-neutral-500 space-y-4">
        <RefreshCw size={28} className="animate-spin text-emerald-600" />
        <p className="text-sm font-medium">Synchronizing location and telemetry data…</p>
      </div>
    );
  }

  if (!profileData || !profileData.district || !profileData.district.trim()) {
    return (
      <motion.div 
        className="max-w-xl mx-auto py-12 px-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Card className="border border-neutral-200 shadow-xl overflow-hidden bg-white/80 backdrop-blur-md">
          <div className="h-2 bg-gradient-to-r from-amber-500 to-orange-500"></div>
          <CardContent className="p-8 flex flex-col items-center text-center gap-6">
            <div className="h-16 w-16 rounded-full bg-amber-50 text-amber-500 flex items-center justify-center border border-amber-100">
              <AlertTriangle size={32} />
            </div>
            
            <div className="space-y-2">
              <h2 className="text-2xl font-bold tracking-tight text-neutral-900">Location Calibration Required</h2>
              <p className="text-sm text-neutral-500 leading-relaxed">
                To view accurate real-time weather and soil telemetry, please complete your profile details. You can update your location at any time.
              </p>
            </div>

            <div className="p-4 bg-amber-50/50 rounded-xl border border-amber-100/50 text-xs text-amber-700 font-medium max-w-sm">
              ℹ️ Near the skip onboarding button, you saw that location calibration can be later done from profile. You can do this now in settings.
            </div>

            <div className="flex gap-3 w-full mt-2">
              <Button 
                onClick={() => navigate('/settings')} 
                className="flex-1 bg-gradient-to-r from-neutral-900 to-neutral-800 hover:from-neutral-800 hover:to-neutral-700 text-white shadow-lg"
              >
                Go to Settings
              </Button>
              <Button 
                variant="outline" 
                onClick={() => navigate('/dashboard')} 
                className="flex-1 border-neutral-200 text-neutral-700 hover:bg-neutral-50"
              >
                Go to Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  if (error && !data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-neutral-500 space-y-4">
        <AlertTriangle size={40} className="text-red-500" />
        <h3 className="text-lg font-semibold text-neutral-900">Weather data unavailable</h3>
        <p className="text-sm">{error}</p>
        <div className="flex gap-3">
          <Button variant="secondary" onClick={() => fetchWeather(profileData?.district, true)}>
            <RefreshCw size={16} className="mr-2" /> Retry
          </Button>
          <Button variant="outline" onClick={() => navigate('/settings')}>
            Update Profile
          </Button>
        </div>
      </div>
    );
  }

  if (!data) return null;


  const { current, forecast, air_quality } = data;
  const targetCity = profileData?.district;
  const city = targetCity;

  // Agricultural Risk Logic
  const temp = current.temp;
  const humidity = current.humidity;
  
  let heatStress = { level: 'Low', color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100', desc: 'Temperatures are optimal for most crops.' };
  if (temp > 35) heatStress = { level: 'High', color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-100', desc: 'Critical heat stress risk. Canopy damage possible.' };
  else if (temp > 30) heatStress = { level: 'Medium', color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-100', desc: 'Elevated temperature may cause mild stress.' };

  let diseaseRisk = { level: 'Low', color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100', desc: 'Low humidity prevents fungal growth.' };
  if (humidity > 80) diseaseRisk = { level: 'High', color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-100', desc: 'High humidity strongly promotes fungal diseases and blight.' };
  else if (humidity >= 60) diseaseRisk = { level: 'Medium', color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-100', desc: 'Moderate humidity. Monitor for early blight signs.' };

  let irrigationNeed = { level: 'Low', color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100', desc: 'Current soil moisture evaporation is low.' };
  if (temp > 30 && humidity < 40) irrigationNeed = { level: 'Urgent', color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-100', desc: 'High temperature and low humidity indicate extreme evaporation. Immediate irrigation required.' };
  else if (temp > 25) irrigationNeed = { level: 'Moderate', color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-100', desc: 'Evapotranspiration is active. Monitor soil moisture.' };


  return (
    <motion.div className="max-w-6xl mx-auto pb-12 space-y-8" variants={containerVariants} initial="hidden" animate="visible">
      {/* Header + Locked Location Info */}
      <motion.div className="flex flex-col md:flex-row md:items-center justify-between gap-4" variants={cardVariants}>
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-neutral-900 mb-1">Weather</h1>
          <p className="text-neutral-500 text-lg">Real-time telemetry for your farm location.</p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 bg-white p-2 rounded-xl border border-neutral-100 shadow-sm">
          <div className="flex items-center gap-2 px-3 py-2 bg-neutral-50 rounded-lg border border-neutral-100 text-sm">
            <MapPin size={16} className="text-emerald-500" />
            <span className="font-semibold text-neutral-800">{targetCity}</span>
            {profileData?.state && <span className="text-neutral-400">, {profileData.state}</span>}
          </div>
          <Button
            onClick={() => fetchWeather(targetCity, true)}
            disabled={loading}
            variant="outline"
            className="flex items-center justify-center gap-2 text-neutral-700 hover:text-neutral-900 border-neutral-200"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            Force Refresh
          </Button>
        </div>
      </motion.div>

      
      {/* Agricultural Intelligence Risk Cards */}
      <motion.div className="grid grid-cols-1 md:grid-cols-3 gap-6" variants={cardVariants}>
        <Card className={`${heatStress.bg} ${heatStress.border} shadow-sm`}>
          <CardHeader className="pb-2">
            <CardTitle className={`flex items-center gap-2 text-base ${heatStress.color}`}>
              <ThermometerSun size={18} /> Heat Stress Risk
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-neutral-900 mb-1">{heatStress.level}</div>
            <p className={`text-sm ${heatStress.color} font-medium`}>{heatStress.desc}</p>
          </CardContent>
        </Card>

        <Card className={`${irrigationNeed.bg} ${irrigationNeed.border} shadow-sm`}>
          <CardHeader className="pb-2">
            <CardTitle className={`flex items-center gap-2 text-base ${irrigationNeed.color}`}>
              <Droplets size={18} /> Irrigation Need
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-neutral-900 mb-1">{irrigationNeed.level}</div>
            <p className={`text-sm ${irrigationNeed.color} font-medium`}>{irrigationNeed.desc}</p>
          </CardContent>
        </Card>

        <Card className={`${diseaseRisk.bg} ${diseaseRisk.border} shadow-sm`}>
          <CardHeader className="pb-2">
            <CardTitle className={`flex items-center gap-2 text-base ${diseaseRisk.color}`}>
              <AlertTriangle size={18} /> Crop Disease Risk
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-neutral-900 mb-1">{diseaseRisk.level}</div>
            <p className={`text-sm ${diseaseRisk.color} font-medium`}>{diseaseRisk.desc}</p>
          </CardContent>
        </Card>
      </motion.div>

      {/* Current Weather Grid */}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Current Weather */}
        <motion.div className="lg:col-span-1" variants={cardVariants}>
          <Card className="h-full bg-neutral-900 text-white border-neutral-800">
            <CardContent className="p-8 flex flex-col justify-between h-full">
              <div>
                <p className="text-sm font-medium text-neutral-400 uppercase tracking-wider mb-6">{current.city || city}</p>
                <div className="flex items-start gap-2">
                  <span className="text-7xl font-bold tracking-tighter leading-none">{Math.round(current.temp)}</span>
                  <span className="text-2xl font-medium text-neutral-400 mt-1">°C</span>
                </div>
              </div>
              <div className="mt-8 pt-6 border-t border-neutral-800">
                <p className="text-lg font-medium capitalize text-neutral-200">{current.description}</p>
                <p className="text-sm text-neutral-400 mt-1">Feels like {Math.round(current.feels_like)}°C</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Telemetry Details */}
        <motion.div className="lg:col-span-2 grid grid-cols-2 sm:grid-cols-4 gap-4" variants={cardVariants}>
          <Card>
            <CardContent className="p-6 flex flex-col items-center justify-center text-center h-full gap-2">
              <div className="h-10 w-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mb-2">
                <Droplets size={20} />
              </div>
              <p className="text-sm font-medium text-neutral-500 uppercase tracking-wider">Humidity</p>
              <p className="text-2xl font-bold text-neutral-900">{current.humidity}%</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6 flex flex-col items-center justify-center text-center h-full gap-2">
              <div className="h-10 w-10 rounded-full bg-slate-50 text-slate-600 flex items-center justify-center mb-2">
                <Wind size={20} />
              </div>
              <p className="text-sm font-medium text-neutral-500 uppercase tracking-wider">Wind</p>
              <p className="text-2xl font-bold text-neutral-900">{current.wind_speed} <span className="text-sm font-medium text-neutral-500">m/s</span></p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6 flex flex-col items-center justify-center text-center h-full gap-2">
              <div className="h-10 w-10 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center mb-2">
                <Eye size={20} />
              </div>
              <p className="text-sm font-medium text-neutral-500 uppercase tracking-wider">Visibility</p>
              <p className="text-2xl font-bold text-neutral-900">{(current.visibility / 1000).toFixed(1)} <span className="text-sm font-medium text-neutral-500">km</span></p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6 flex flex-col items-center justify-center text-center h-full gap-2">
              <div className="h-10 w-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mb-2">
                <Gauge size={20} />
              </div>
              <p className="text-sm font-medium text-neutral-500 uppercase tracking-wider">Pressure</p>
              <p className="text-2xl font-bold text-neutral-900">{current.pressure} <span className="text-sm font-medium text-neutral-500">hPa</span></p>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* 5-Day Forecast Strip */}
      <motion.div variants={cardVariants}>
        <Card>
          <CardHeader className="border-b border-neutral-100">
            <CardTitle>5-Day Forecast</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="grid grid-cols-2 sm:grid-cols-5 divide-x divide-y sm:divide-y-0 divide-neutral-100">
              {forecast.map((day) => (
                <div key={day.date} className="p-6 flex flex-col items-center text-center">
                  <p className="text-sm font-semibold text-neutral-900 mb-4">{formatDate(day.date)}</p>
                  <ThermometerSun size={28} className="text-neutral-400 mb-4" />
                  <div className="flex items-baseline gap-1.5 mb-2">
                    <span className="text-lg font-bold text-neutral-900">{Math.round(day.temp_max)}°</span>
                    <span className="text-sm font-medium text-neutral-400">/ {Math.round(day.temp_min)}°</span>
                  </div>
                  <p className="text-xs font-medium text-neutral-500 capitalize">{day.description}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div variants={cardVariants}>
          <Card className="h-full">
            <CardHeader className="border-b border-neutral-100">
              <CardTitle>Temperature Trend</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="h-[260px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={forecast} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="tempGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#0f172a" stopOpacity={0.1} />
                        <stop offset="95%" stopColor="#0f172a" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis
                      dataKey="date"
                      tickFormatter={(d) => new Date(d).toLocaleDateString('en-US', { weekday: 'short' })}
                      stroke="#cbd5e1"
                      tick={{ fill: '#64748b', fontSize: 12 }}
                      axisLine={false}
                      tickLine={false}
                      dy={10}
                    />
                    <YAxis stroke="#cbd5e1" tick={{ fill: '#64748b', fontSize: 12 }} unit="°" axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={chartTooltipStyle} cursor={{ stroke: '#e2e8f0', strokeWidth: 1, strokeDasharray: '4 4' }} />
                    <Area type="monotone" dataKey="temp_max" stroke="#0f172a" fill="url(#tempGradient)" strokeWidth={2} name="High" />
                    <Area type="monotone" dataKey="temp_min" stroke="#94a3b8" fill="transparent" strokeWidth={2} strokeDasharray="4 4" name="Low" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={cardVariants}>
          <Card className="h-full">
            <CardHeader className="border-b border-neutral-100">
              <CardTitle>Humidity Levels</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="h-[260px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={forecast} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis
                      dataKey="date"
                      tickFormatter={(d) => new Date(d).toLocaleDateString('en-US', { weekday: 'short' })}
                      stroke="#cbd5e1"
                      tick={{ fill: '#64748b', fontSize: 12 }}
                      axisLine={false}
                      tickLine={false}
                      dy={10}
                    />
                    <YAxis stroke="#cbd5e1" tick={{ fill: '#64748b', fontSize: 12 }} unit="%" axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={chartTooltipStyle} cursor={{ fill: '#f8fafc' }} />
                    <Bar dataKey="humidity_avg" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Humidity" maxBarSize={40} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Air Quality */}
      {air_quality && (
        <motion.div variants={cardVariants}>
          <Card>
            <CardHeader className="border-b border-neutral-100">
              <CardTitle>Air Quality Index</CardTitle>
            </CardHeader>
            <CardContent className="p-6 flex items-center gap-6">
              <div className="flex-shrink-0 h-20 w-20 rounded-full bg-neutral-50 border border-neutral-100 flex items-center justify-center">
                <span className={`text-3xl font-bold ${aqiColors[air_quality.aqi]}`}>
                  {air_quality.aqi}
                </span>
              </div>
              <div className="flex flex-col space-y-1">
                <h3 className={`text-lg font-bold ${aqiColors[air_quality.aqi]}`}>
                  {aqiLabels[air_quality.aqi]}
                </h3>
                <p className="text-neutral-500 text-sm">
                  {aqiDescs[air_quality.aqi]}
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </motion.div>
  );
};

export default Weather;
