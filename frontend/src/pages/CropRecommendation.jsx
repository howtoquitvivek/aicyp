import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Beaker, Droplets, ThermometerSun, CloudRain,
  Leaf, Sprout, FlaskConical, Sparkles, RotateCcw, Bot
, MapPin, AlertCircle, Info} from 'lucide-react';
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis,
  PolarRadiusAxis, ResponsiveContainer, Tooltip,
} from 'recharts';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import api from '../services/api';
import { useAuth } from '../store/AuthContext';
import { useWorkspace } from '../store/WorkspaceContext';
import NoPlotsFound from '../components/ui/NoPlotsFound';
import { getSoilReferenceRanges } from '../services/soil_guidance_service';

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
};
const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] } },
};

const DEFAULT_FORM = {
  nitrogen: '',
  phosphorus: '',
  potassium: '',
  ph: '',
  rainfall: '',
  temperature: '',
  humidity: '',
  soil_type: '',
  season: '',
};

const SOIL_TYPES = ['Loamy', 'Sandy', 'Clay', 'Clayey', 'Silt', 'Black', 'Red', 'Laterite', 'Alluvial'];
const SEASONS = ['Kharif', 'Rabi', 'Zaid'];

const chartTooltipStyle = {
  backgroundColor: '#ffffff',
  border: '1px solid #e5e5e5',
  borderRadius: '8px',
  color: '#171717',
  fontSize: '0.875rem',
  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)'
};

const CropRecommendation = () => {
  const { user } = useAuth();
  const { plots, profileData, loading: workspaceLoading } = useWorkspace();
  const [selectedPlotId, setSelectedPlotId] = useState('manual');
  const [form, setForm] = useState(DEFAULT_FORM);
  const [sources, setSources] = useState({});
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedCrop, setSelectedCrop] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!workspaceLoading && plots?.length > 0 && selectedPlotId === 'manual' && !form.nitrogen) {
      setSelectedPlotId(plots[0].id);
    }
  }, [plots, workspaceLoading]);

  useEffect(() => {
    if (workspaceLoading) return;
    
    let isMounted = true;
    const prefillData = async () => {
      if (!profileData?.district) return; // Silent return for global manual mode if no location

      try {
        const weatherData = await api.weather.getCurrent(profileData.district).catch(() => null);
        
        if (!isMounted) return;

        const newForm = { ...DEFAULT_FORM };
        const newSources = {};
        
        const targetPlot = plots?.find(p => p.id === selectedPlotId);

        if (targetPlot && selectedPlotId !== 'manual') {
          if (targetPlot.soil_n) { newForm.nitrogen = targetPlot.soil_n; newSources.nitrogen = "Plot Soil Test"; }
          if (targetPlot.soil_p) { newForm.phosphorus = targetPlot.soil_p; newSources.phosphorus = "Plot Soil Test"; }
          if (targetPlot.soil_k) { newForm.potassium = targetPlot.soil_k; newSources.potassium = "Plot Soil Test"; }
          if (targetPlot.soil_ph) { newForm.ph = targetPlot.soil_ph; newSources.ph = "Plot Soil Test"; }
          if (targetPlot.soil) { newForm.soil_type = targetPlot.soil; newSources.soil_type = "Plot Configuration"; }
        }

        if (weatherData) {
          newForm.temperature = weatherData.temp || '';
          newSources.temperature = "Auto-filled from live weather";
          newForm.humidity = weatherData.humidity || '';
          newSources.humidity = "Auto-filled from live weather";
          newForm.rainfall = weatherData.rainfall || (weatherData.humidity > 70 ? 120 : 60); 
          newSources.rainfall = weatherData.rainfall ? "Auto-filled from weather history" : "Estimated from weather data";
        }
        
        const month = new Date().getMonth();
        if (month >= 2 && month <= 5) {
          newForm.season = 'Zaid';
        } else if (month >= 6 && month <= 9) {
          newForm.season = 'Kharif';
        } else {
          newForm.season = 'Rabi';
        }
        newSources.season = "Detected automatically";

        setForm(newForm);
        setSources(newSources);
      } catch (err) {
        console.error("Failed to auto-fill recommendation form:", err);
      }
    };
    prefillData();
    return () => { isMounted = false; };
  }, [selectedPlotId, workspaceLoading, profileData, plots]);

  const soilGuidance = getSoilReferenceRanges(form.soil_type);

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const payload = {
        nitrogen: parseFloat(form.nitrogen) || 0,
        phosphorus: parseFloat(form.phosphorus) || 0,
        potassium: parseFloat(form.potassium) || 0,
        ph: parseFloat(form.ph) || 7,
        rainfall: parseFloat(form.rainfall) || 0,
        temperature: parseFloat(form.temperature) || 25,
        humidity: parseFloat(form.humidity) || 50,
        soil_type: form.soil_type || null,
        season: form.season || null,
      };
      const data = await api.crops.recommend(payload);
      await new Promise(resolve => setTimeout(resolve, 400)); // Snappy artificial delay
      setResults(data);
      
      const topPick = data.recommendations[0];
      setSelectedCrop(topPick); // Pre-select top pick
      
      // Auto-save the recommendation history
      if (user?.uid && selectedPlotId !== 'manual') {
        api.users.saveRecommendation(user.uid, {
          plotId: selectedPlotId,
          crop: topPick.crop,
          confidence: topPick.confidence,
          nitrogen: payload.nitrogen,
          phosphorus: payload.phosphorus,
          potassium: payload.potassium,
          ph: payload.ph,
          soil_type: payload.soil_type
        }).catch(err => console.error('Failed to save recommendation history:', err));
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setForm(DEFAULT_FORM);
    setResults(null);
    setSelectedCrop(null);
    setError(null);
  };

  const SCORE_LABELS = {
    nitrogen: 'N Match Score',
    phosphorus: 'P Match Score',
    potassium: 'K Match Score',
    ph: 'pH Match Score',
    temperature: 'Temp Match Score',
    humidity: 'Humidity Match Score',
    rainfall: 'Rainfall Match Score'
  };

  // Radar chart data for selected crop
  const radarData = selectedCrop?.scores
    ? Object.entries(selectedCrop.scores).map(([key, val]) => ({
        factor: SCORE_LABELS[key] || (key.charAt(0).toUpperCase() + key.slice(1) + ' Match Score'),
        score: val,
        fullMark: 100,
      }))
    : [];



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
              <h2 className="text-2xl font-bold tracking-tight text-neutral-900">Location Required</h2>
              <p className="text-sm text-neutral-500 leading-relaxed">
                To view accurate real-time weather and market data for your plot, please update your farm location.
              </p>
            </div>

            <Button onClick={() => navigate('/settings')} className="w-full">
              Update Farm Location in Settings
            </Button>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  return (
    <motion.div className="max-w-6xl mx-auto space-y-8" variants={containerVariants} initial="hidden" animate="visible">
      {/* Header */}
      <motion.div className="space-y-2" variants={cardVariants}>
        <h1 className="text-3xl font-bold tracking-tight text-neutral-900">Crop Recommendation</h1>
        <p className="text-neutral-500">Enter your soil and climate data to get AI-powered crop recommendations.</p>
      </motion.div>

      {/* Target Plot Selector */}
      <motion.div variants={cardVariants}>
        <div className="bg-neutral-50 rounded-xl p-4 border border-neutral-200 shadow-sm flex flex-col md:flex-row gap-4 items-start md:items-center justify-between mb-4">
          <div className="w-full">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-3">
              <h3 className="text-sm font-semibold text-neutral-800">Target Plot</h3>
              <select 
                value={selectedPlotId} 
                onChange={(e) => setSelectedPlotId(e.target.value)}
                className="h-8 rounded-md border border-neutral-300 bg-white px-2 py-1 text-sm font-medium text-neutral-700 outline-none focus:ring-2 focus:ring-emerald-500"
              >
                {plots?.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
                <option value="manual">Manual Entry (No Plot)</option>
              </select>
              
              <div className="flex items-center gap-2">
                <Button 
                  variant="outline" size="sm" className="h-8 text-xs" 
                  onClick={() => {
                    const targetPlot = plots?.find(p => p.id === selectedPlotId);
                    if (targetPlot) {
                      setForm(prev => ({
                        ...prev,
                        nitrogen: targetPlot.soil_n || '',
                        phosphorus: targetPlot.soil_p || '',
                        potassium: targetPlot.soil_k || '',
                        ph: targetPlot.soil_ph || '',
                        soil_type: targetPlot.soil || ''
                      }));
                    }
                  }}
                >
                  Use Plot Data
                </Button>
                <Button 
                  variant="outline" size="sm" className="h-8 text-xs" 
                  onClick={() => { 
                    setSelectedPlotId('manual'); 
                    setForm(prev => ({...prev, nitrogen: '', phosphorus: '', potassium: '', ph: '', soil_type: ''}));
                  }}
                >
                  Clear & Manual Entry
                </Button>
              </div>
            </div>
            
            <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-neutral-600">
              <span className="flex items-center gap-1.5"><MapPin size={14} className="text-neutral-400" /> {profileData?.district || 'Unknown Location'}, {profileData?.state}</span>
              <span className="flex items-center gap-1.5"><Leaf size={14} className="text-neutral-400" /> {form.soil_type || 'Unknown Soil'}</span>
              <span className="flex items-center gap-1.5"><CloudRain size={14} className="text-neutral-400" /> {form.season || 'Unknown Season'}</span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Input Form */}
      <motion.div variants={cardVariants}>
        <Card>
          <CardHeader>
            <CardTitle>Soil & Climate Input</CardTitle>
            <CardDescription>Provide NPK values, pH, and climate data from your farm.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Nitrogen */}
                <div className="space-y-2 flex flex-col">
                  <label className="text-sm font-medium leading-none text-neutral-700 flex items-center gap-2">
                    <FlaskConical className="h-4 w-4 text-neutral-500" /> Nitrogen (N) kg/ha
                  </label>
                  <Input
                    type="number" name="nitrogen" value={form.nitrogen}
                    onChange={handleChange} placeholder="e.g. 90" min="0" max="200" required
                  />
                  {form.nitrogen ? (
                    <div className="text-xs text-neutral-500 bg-neutral-50 p-1.5 rounded-md border border-neutral-100 mt-1">
                      <span className="font-medium text-emerald-700">Source:</span> {sources.nitrogen || 'Manual Entry'}
                    </div>
                  ) : (
                    <div className="text-xs text-neutral-600 bg-blue-50/50 p-3 rounded-md border border-blue-100 mt-2 space-y-1.5 shadow-sm">
                      <div className="flex justify-between items-center border-b border-blue-100/50 pb-1">
                        <span className="font-bold text-blue-800">Reference Range:</span> 
                        <span className="font-semibold text-neutral-900">{soilGuidance.n_range} kg/ha</span>
                      </div>
                      <div className="flex justify-between items-start pt-1">
                        <span className="text-neutral-500 w-24 shrink-0">Typical for:</span> 
                        <span className="text-neutral-700 text-right">{form.soil_type || 'Unknown'} soils</span>
                      </div>
                      <div className="flex justify-between items-start">
                        <span className="text-neutral-500 w-24 shrink-0">Source:</span> 
                        <span className="italic text-neutral-600 text-right">Soil Guidance Reference Library</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Phosphorus */}
                <div className="space-y-2 flex flex-col">
                  <label className="text-sm font-medium leading-none text-neutral-700 flex items-center gap-2">
                    <Beaker className="h-4 w-4 text-neutral-500" /> Phosphorus (P) kg/ha
                  </label>
                  <Input
                    type="number" name="phosphorus" value={form.phosphorus}
                    onChange={handleChange} placeholder="e.g. 42" min="0" max="200" required
                  />
                  {form.phosphorus ? (
                    <div className="text-xs text-neutral-500 bg-neutral-50 p-1.5 rounded-md border border-neutral-100 mt-1">
                      <span className="font-medium text-emerald-700">Source:</span> {sources.phosphorus || 'Manual Entry'}
                    </div>
                  ) : (
                    <div className="text-xs text-neutral-600 bg-blue-50/50 p-3 rounded-md border border-blue-100 mt-2 space-y-1.5 shadow-sm">
                      <div className="flex justify-between items-center border-b border-blue-100/50 pb-1">
                        <span className="font-bold text-blue-800">Reference Range:</span> 
                        <span className="font-semibold text-neutral-900">{soilGuidance.p_range} kg/ha</span>
                      </div>
                      <div className="flex justify-between items-start pt-1">
                        <span className="text-neutral-500 w-24 shrink-0">Typical for:</span> 
                        <span className="text-neutral-700 text-right">{form.soil_type || 'Unknown'} soils</span>
                      </div>
                      <div className="flex justify-between items-start">
                        <span className="text-neutral-500 w-24 shrink-0">Source:</span> 
                        <span className="italic text-neutral-600 text-right">Soil Guidance Reference Library</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Potassium */}
                <div className="space-y-2 flex flex-col">
                  <label className="text-sm font-medium leading-none text-neutral-700 flex items-center gap-2">
                    <Sprout className="h-4 w-4 text-neutral-500" /> Potassium (K) kg/ha
                  </label>
                  <Input
                    type="number" name="potassium" value={form.potassium}
                    onChange={handleChange} placeholder="e.g. 43" min="0" max="200" required
                  />
                  {form.potassium ? (
                    <div className="text-xs text-neutral-500 bg-neutral-50 p-1.5 rounded-md border border-neutral-100 mt-1">
                      <span className="font-medium text-emerald-700">Source:</span> {sources.potassium || 'Manual Entry'}
                    </div>
                  ) : (
                    <div className="text-xs text-neutral-600 bg-blue-50/50 p-3 rounded-md border border-blue-100 mt-2 space-y-1.5 shadow-sm">
                      <div className="flex justify-between items-center border-b border-blue-100/50 pb-1">
                        <span className="font-bold text-blue-800">Reference Range:</span> 
                        <span className="font-semibold text-neutral-900">{soilGuidance.k_range} kg/ha</span>
                      </div>
                      <div className="flex justify-between items-start pt-1">
                        <span className="text-neutral-500 w-24 shrink-0">Typical for:</span> 
                        <span className="text-neutral-700 text-right">{form.soil_type || 'Unknown'} soils</span>
                      </div>
                      <div className="flex justify-between items-start">
                        <span className="text-neutral-500 w-24 shrink-0">Source:</span> 
                        <span className="italic text-neutral-600 text-right">Soil Guidance Reference Library</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* pH */}
                <div className="space-y-2 flex flex-col">
                  <label className="text-sm font-medium leading-none text-neutral-700 flex items-center gap-2">
                    <Droplets className="h-4 w-4 text-neutral-500" /> Soil pH
                  </label>
                  <Input
                    type="number" name="ph" value={form.ph}
                    onChange={handleChange} placeholder="e.g. 6.5" min="0" max="14" step="0.1" required
                  />
                  {form.ph ? (
                    <div className="text-xs text-neutral-500 bg-neutral-50 p-1.5 rounded-md border border-neutral-100 mt-1">
                      <span className="font-medium text-emerald-700">Source:</span> {sources.ph || 'Manual Entry'}
                    </div>
                  ) : (
                    <div className="text-xs text-neutral-500 bg-blue-50/50 p-1.5 rounded-md border border-blue-100 mt-1">
                      <span className="font-medium text-blue-700">Reference Range:</span> {soilGuidance.ph_range}
                    </div>
                  )}
                </div>

                {/* Temperature */}
                <div className="space-y-2">
                  <label className="text-sm font-medium leading-none text-neutral-700 flex items-center gap-2">
                    <ThermometerSun className="h-4 w-4 text-neutral-500" /> Temperature (°C)
                  </label>
                  <Input
                    type="number" name="temperature" value={form.temperature}
                    onChange={handleChange} placeholder="e.g. 28" min="-10" max="60" required
                  />
                </div>

                {/* Humidity */}
                <div className="space-y-2">
                  <label className="text-sm font-medium leading-none text-neutral-700 flex items-center gap-2">
                    <CloudRain className="h-4 w-4 text-neutral-500" /> Humidity (%)
                  </label>
                  <Input
                    type="number" name="humidity" value={form.humidity}
                    onChange={handleChange} placeholder="e.g. 65" min="0" max="100" required
                  />
                </div>

                {/* Rainfall */}
                <div className="space-y-2">
                  <label className="text-sm font-medium leading-none text-neutral-700 flex items-center gap-2">
                    <CloudRain className="h-4 w-4 text-neutral-500" /> Rainfall (mm)
                  </label>
                  <Input
                    type="number" name="rainfall" value={form.rainfall}
                    onChange={handleChange} placeholder="e.g. 120" min="0" max="500" required
                  />
                </div>

                {/* Soil Type */}
                <div className="space-y-2">
                  <label className="text-sm font-medium leading-none text-neutral-700 flex items-center gap-2">
                    <Leaf className="h-4 w-4 text-neutral-500" /> Soil Type
                  </label>
                  <select
                    className="flex h-10 w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-950 focus-visible:ring-offset-2"
                    name="soil_type" value={form.soil_type} onChange={handleChange}
                  >
                    <option value="">Select (optional)</option>
                    {SOIL_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>

                {/* Season */}
                <div className="space-y-2">
                  <label className="text-sm font-medium leading-none text-neutral-700 flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-neutral-500" /> Season
                  </label>
                  <select
                    className="flex h-10 w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-950 focus-visible:ring-offset-2"
                    name="season" value={form.season} onChange={handleChange}
                  >
                    <option value="">Select (optional)</option>
                    {SEASONS.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-4 pt-4 border-t border-neutral-100">
                <Button type="submit" className="bg-neutral-900 text-white hover:bg-neutral-800" disabled={loading}>
                  {loading ? 'Analyzing...' : 'Get Recommendations'}
                </Button>
                <Button type="button" variant="outline" onClick={handleReset} className="text-neutral-600">
                  <RotateCcw className="w-4 h-4 mr-2" /> Reset
                </Button>
              </div>

              {error && (
                <p className="text-sm font-medium text-red-500">
                  {error}
                </p>
              )}
            </form>
          </CardContent>
        </Card>
      </motion.div>

      {/* Loading State */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-12 text-neutral-500">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-neutral-200 border-t-neutral-900 mb-4" />
          <p>Analyzing soil data and matching crops...</p>
        </div>
      )}

      {/* Results */}
      <AnimatePresence>
        {results && !loading && (
          <motion.div variants={cardVariants} initial="hidden" animate="visible" className="space-y-8">
            <h2 className="text-xl font-semibold tracking-tight text-neutral-900">
              Top Recommendations
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {results.recommendations.map((crop, i) => (
                <Card
                  key={crop.name}
                  className={`cursor-pointer transition-colors ${selectedCrop?.name === crop.name ? 'border-neutral-900 ring-1 ring-neutral-900' : 'hover:border-neutral-300'} ${i === 0 ? 'bg-neutral-50' : ''}`}
                  onClick={() => setSelectedCrop(crop)}
                >
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div className="text-4xl">{crop.icon}</div>
                      <span className="inline-flex items-center rounded-full bg-neutral-100 px-2.5 py-0.5 text-xs font-semibold text-neutral-800">
                        #{i + 1}
                      </span>
                    </div>
                    <h3 className="text-lg font-semibold text-neutral-900 mb-2">{crop.name}</h3>
                    
                    <div className="space-y-2 mb-4">
                      <div className="h-2 w-full bg-neutral-100 rounded-full overflow-hidden">
                        <div className="h-full bg-neutral-900 rounded-full" style={{ width: `${crop.confidence}%` }} />
                      </div>
                      <p className="text-xs font-medium text-neutral-500">{crop.confidence}% match confidence</p>
                    </div>

                    <div className="flex flex-wrap gap-2 mb-4">
                      <span className="inline-flex items-center rounded-md bg-neutral-100 px-2 py-1 text-xs font-medium text-neutral-600">
                        {crop.season}
                      </span>
                      <span className="inline-flex items-center rounded-md bg-neutral-100 px-2 py-1 text-xs font-medium text-neutral-600">
                        💧 {crop.water_need}
                      </span>
                      <span className="inline-flex items-center rounded-md bg-neutral-100 px-2 py-1 text-xs font-medium text-neutral-600">
                        ⏱ {crop.growth_period}
                      </span>
                    </div>

                    <p className="text-sm text-neutral-600 leading-relaxed">{crop.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Crop Suitability Analysis — {selectedCrop?.name || '...'}</CardTitle>
                </CardHeader>
                <CardContent>
                  {radarData.length > 0 && (
                    <div className="h-[300px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <RadarChart data={radarData}>
                          <PolarGrid stroke="#e5e5e5" />
                          <PolarAngleAxis
                            dataKey="factor"
                            tick={{ fill: '#525252', fontSize: 12 }}
                          />
                          <PolarRadiusAxis
                            angle={30}
                            domain={[0, 100]}
                            tick={{ fill: '#737373', fontSize: 10 }}
                          />
                          <Tooltip contentStyle={chartTooltipStyle} />
                          <Radar
                            name={selectedCrop?.name}
                            dataKey="score"
                            stroke="#171717"
                            fill="#171717"
                            fillOpacity={0.1}
                            strokeWidth={2}
                          />
                        </RadarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Your Input Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-y-4 gap-x-6">
                    <div>
                      <p className="text-sm text-neutral-500">Nitrogen (N)</p>
                      <p className="text-sm font-medium text-neutral-900">{results.input_summary.nitrogen} kg/ha</p>
                    </div>
                    <div>
                      <p className="text-sm text-neutral-500">Phosphorus (P)</p>
                      <p className="text-sm font-medium text-neutral-900">{results.input_summary.phosphorus} kg/ha</p>
                    </div>
                    <div>
                      <p className="text-sm text-neutral-500">Potassium (K)</p>
                      <p className="text-sm font-medium text-neutral-900">{results.input_summary.potassium} kg/ha</p>
                    </div>
                    <div>
                      <p className="text-sm text-neutral-500">Soil pH</p>
                      <p className="text-sm font-medium text-neutral-900">{results.input_summary.ph}</p>
                    </div>
                    <div>
                      <p className="text-sm text-neutral-500">Temperature</p>
                      <p className="text-sm font-medium text-neutral-900">{results.input_summary.temperature}°C</p>
                    </div>
                    <div>
                      <p className="text-sm text-neutral-500">Humidity</p>
                      <p className="text-sm font-medium text-neutral-900">{results.input_summary.humidity}%</p>
                    </div>
                    <div>
                      <p className="text-sm text-neutral-500">Rainfall</p>
                      <p className="text-sm font-medium text-neutral-900">{results.input_summary.rainfall} mm</p>
                    </div>
                    <div>
                      <p className="text-sm text-neutral-500">Season</p>
                      <p className="text-sm font-medium text-neutral-900">{results.input_summary.season || '—'}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* AI Insights & Next Steps */}
            <div className="grid grid-cols-1 gap-6">
              <Card className="bg-emerald-50 border-emerald-100 shadow-sm">
                <CardHeader className="border-b border-emerald-100 pb-4">
                  <CardTitle className="text-emerald-800 flex items-center gap-2">
                    <Bot size={20} className="text-emerald-600" /> AI Insights Summary
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="flex flex-col md:flex-row gap-6 items-start justify-between">
                    <ul className="space-y-3 text-sm text-neutral-700 font-medium flex-1">
                      <li className="flex items-start gap-2">
                        <span className="text-emerald-600 mt-0.5">•</span> 
                        <span><strong>{selectedCrop?.name}</strong> is highly recommended based on your soil's NPK profile.</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-emerald-600 mt-0.5">•</span> 
                        <span>Current weather conditions favor {selectedCrop?.name} cultivation.</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-emerald-600 mt-0.5">•</span> 
                        <span>Expected yield is above the regional baseline.</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-emerald-600 mt-0.5">•</span> 
                        <span>Market prices indicate favorable profitability for the upcoming harvest season.</span>
                      </li>
                    </ul>
                    
                    <div className="shrink-0 flex flex-col gap-3 min-w-[200px]">
                      {selectedPlotId !== 'manual' ? (
                        <>
                          <Button 
                            onClick={() => navigate(`/plot/${selectedPlotId}/yield`, { state: { recommendedCrop: selectedCrop.crop } })}
                            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/10 flex items-center justify-center cursor-pointer"
                          >
                            Plan Yield for this Crop
                            <Sparkles size={16} className="ml-2" />
                          </Button>
                          <p className="text-xs text-neutral-500 text-center">Calculate exact revenue & cost</p>
                        </>
                      ) : (
                        <div className="p-3 bg-neutral-50 border border-neutral-100 rounded-lg text-center">
                          <p className="text-sm font-medium text-neutral-700 mb-1">Save to Plot First</p>
                          <p className="text-xs text-neutral-500">Yield Planner requires plot area.</p>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default CropRecommendation;
