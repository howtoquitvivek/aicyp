import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Sprout, CloudRain, TrendingUp, BarChart3,
  AlertTriangle, CheckCircle2, ChevronRight, Lock, Tractor, ArrowRight, Loader2,
  Droplets, Thermometer, Wind
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { useAuth } from '../store/AuthContext';
import { useWorkspace } from '../store/WorkspaceContext';
import api from '../services/api';
import SmartPlotInsights from '../components/SmartPlotInsights';
import NoPlotsFound from '../components/ui/NoPlotsFound';
import PlotActivityTimeline from '../components/PlotActivityTimeline';

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
};

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] } },
};

const YIELD_BASELINE_BY_CROP = {
  Rice: 2.2, // tons per acre
  Wheat: 1.8,
  Maize: 2.5,
  Cotton: 1.2,
  Sugarcane: 30.0,
  Other: 2.0,
};

const CHART_COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6'];

const PlotDashboard = () => {
  const { user } = useAuth();
  const { activePlot, profileData, farmData, loading: workspaceLoading } = useWorkspace();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [weather, setWeather] = useState(null);
  const [plans, setPlans] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [marketData, setMarketData] = useState(null);
  const [userData, setUserData] = useState(null);

  useEffect(() => {
    if (workspaceLoading || !activePlot) return;
    
    let isMounted = true;
    const fetchPlotData = async () => {
      setLoading(true);
      try {
        const [weatherData, marketResponse, userDoc] = await Promise.all([
          profileData?.district ? api.weather.getCurrent(profileData.district).catch(() => null) : Promise.resolve(null),
          profileData?.district ? api.market.getCurrent(activePlot.crop || 'Rice', profileData.district, profileData.state || '').catch(() => ({ available: false })) : Promise.resolve({ available: false }),
          api.users.getMe(user.uid) // We only fetch to get plans, soon plans will be plot-specific
        ]);
        
        if (!isMounted) return;

        if (userDoc) setUserData(userDoc);
        if (weatherData) setWeather(weatherData);

        // Filter plans to only those belonging to this plot (or keep all for demo if plotId isn't on all of them yet)
        if (userDoc?.plans) {
          const plotPlans = userDoc.plans.filter(p => p.plotId === activePlot.id || !p.plotId);
          setPlans(plotPlans);
        }
        
        if (userDoc?.recommendations) {
          const plotRecs = userDoc.recommendations.filter(r => r.plotId === activePlot.id || !r.plotId);
          setRecommendations(plotRecs);
        }

        const crop = activePlot.crop || 'Rice';
        
        if (marketResponse?.available) {
          setMarketData(marketResponse);
        } else {
          setMarketData({
            modal_price: 0,
            available: false,
            message: "No recent market data"
          });
        }
      } catch (err) {
        console.error('Failed to load plot data', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    
    fetchPlotData();
    return () => { isMounted = false; };
  }, [activePlot, workspaceLoading, profileData, user?.uid]);

  const displayName = profileData?.display_name || user?.displayName || user?.email?.split('@')[0] || 'Farmer';

  if (workspaceLoading || loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px] text-neutral-500">
        <Loader2 size={32} className="animate-spin text-emerald-600" />
      </div>
    );
  }

  if (!activePlot) {
    return <NoPlotsFound context="dashboard" />;
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

  // Derive plot-specific KPIs
  const primaryCrop = activePlot.crop || 'Unassigned';
  const plotArea = parseFloat(activePlot.area) || 0;
  const baseYield = YIELD_BASELINE_BY_CROP[primaryCrop] || 2.0;
  
  const expectedYieldTons = (plotArea * baseYield).toFixed(1);
  const expectedRevenueRs = (expectedYieldTons * 10 * (marketData?.modal_price || 0)); // 1 ton = 10 quintals
  const expectedRevenueLakh = (expectedRevenueRs / 100000).toFixed(2);

  // Weather Risk Logic
  const humidity = weather?.humidity || 65;
  let weatherRisk = 'Low';
  let weatherRiskColor = 'text-emerald-600';
  if (humidity > 85) {
    weatherRisk = 'High';
    weatherRiskColor = 'text-red-600';
  } else if (humidity >= 70) {
    weatherRisk = 'Medium';
    weatherRiskColor = 'text-amber-500';
  }

  const stats = [
    {
      icon: Sprout,
      label: 'Cultivated Crop',
      value: primaryCrop,
      change: `${activePlot.soil} Soil`,
      positive: true
    },
    {
      icon: TrendingUp,
      label: 'Expected Yield',
      value: `${expectedYieldTons} Tons`,
      change: `Area: ${plotArea.toFixed(1)} Acres`,
      positive: true
    },
    {
      icon: BarChart3,
      label: 'Expected Revenue',
      value: `₹${expectedRevenueLakh} L`,
      change: marketData?.available ? `₹${marketData.modal_price.toLocaleString('en-IN')} / qtl` : 'N/A',
      positive: true
    },
    {
      icon: CloudRain,
      label: 'Weather Risk',
      value: weatherRisk,
      change: `${weather?.temp || 28}°C · ${weather?.description || 'Sunny'}`,
      positive: weatherRisk === 'Low' ? true : (weatherRisk === 'High' ? false : null),
      customColor: weatherRiskColor
    },
  ];

  // Chart Data from Saved Plans
  const hasPlans = plans.length > 0;
  
  const yieldTrendData = hasPlans 
    ? plans.map((p, idx) => ({ name: `Plan ${idx+1}`, yield: p.expected_yield / 1000 }))
    : [];

  const revenueTrendData = hasPlans
    ? plans.map((p, idx) => ({ name: `Plan ${idx+1}`, revenue: p.expected_revenue / 100000 }))
    : [];
  
  // Plot Contribution Calculations
  const totalFarmArea = farmData?.plots?.reduce((sum, p) => sum + parseFloat(p.area || 0), 0) || plotArea;
  const remainingFarmArea = Math.max(0, totalFarmArea - plotArea);
  const areaSharePercent = totalFarmArea > 0 ? Math.round((plotArea / totalFarmArea) * 100) : 100;
  
  const pieData = [
    { name: 'This Plot', value: plotArea },
    { name: 'Other Plots', value: remainingFarmArea }
  ];

  const plotInsightData = {
    plotName: activePlot.name,
    crop: primaryCrop,
    area: plotArea,
    soilType: activePlot.soil,
    soilN: activePlot.nitrogen,
    soilP: activePlot.phosphorus,
    soilK: activePlot.potassium,
    soilPH: activePlot.ph,
    irrigation: activePlot.irrigation,
    temperature: weather?.temp,
    humidity: weather?.humidity,
    weatherRisk: weatherRisk,
    marketPrice: marketData?.modal_price || 0,
    expectedYield: expectedYieldTons,
    expectedRevenue: expectedRevenueLakh,
    areaSharePercent: areaSharePercent
  };

  return (
    <motion.div
      className="max-w-6xl mx-auto pb-12 space-y-8 text-left"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Page Header */}
      <motion.div className="flex flex-col space-y-2" variants={cardVariants}>
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight text-neutral-900">
            Good morning, {displayName}
          </h1>
          <PlotActivityTimeline userDoc={userData} />
        </div>
        <p className="text-lg text-neutral-500">
          Here's an overview of your {plotArea.toFixed(1)} Acre plot in {profileData?.district || 'your region'}.
        </p>
      </motion.div>

      {/* KPI Stat Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, idx) => (
          <motion.div key={stat.label} variants={cardVariants}>
            <Card className="relative overflow-hidden group h-full">
              <CardContent className="p-6 flex flex-col gap-4 h-full">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-neutral-500 uppercase tracking-wider">{stat.label}</span>
                  <div className="h-8 w-8 rounded-full bg-neutral-100 flex items-center justify-center text-neutral-600 shrink-0">
                    <stat.icon size={16} />
                  </div>
                </div>
                <div>
                  <h3 className={`text-3xl font-bold mb-1 ${stat.customColor ? stat.customColor : 'text-neutral-900'}`}>
                    {stat.value}
                  </h3>
                  <p className={`text-sm font-medium ${
                    stat.positive === true ? 'text-emerald-600' :
                    stat.positive === false ? 'text-red-600' :
                    stat.positive === null && stat.label === 'Weather Risk' ? 'text-amber-500' :
                    'text-neutral-400'
                  }`}>
                    {stat.change}
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content Area (2/3 width) */}
        <div className="lg:col-span-2 space-y-6">
          
          <motion.div variants={cardVariants}>
            <Card className="h-full min-h-[300px] flex flex-col">
              <CardHeader className="border-b border-neutral-100 pb-4">
                <CardTitle>Yield Trend (Tons)</CardTitle>
                <CardDescription>Historical and projected yields for {primaryCrop}</CardDescription>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col justify-center p-6">
                {!hasPlans ? (
                  <div className="flex flex-col items-center justify-center text-neutral-400 h-64">
                    <BarChart3 size={32} className="mb-2 opacity-30" />
                    <p className="text-sm font-medium">No yield projections have been created for this plot yet.</p>
                    <Link to={`/plot/${activePlot.id}/yield`} className="text-emerald-600 text-xs font-semibold mt-2 hover:underline">
                      Run Yield Planner
                    </Link>
                  </div>
                ) : plans.length === 1 ? (
                  <div className="flex flex-col items-center justify-center h-64 text-center">
                    <div className="p-4 bg-emerald-50 rounded-full mb-4">
                      <Sprout className="h-8 w-8 text-emerald-600" />
                    </div>
                    <p className="text-sm text-neutral-500 uppercase tracking-widest font-semibold mb-1">Projected Yield</p>
                    <h3 className="text-5xl font-bold text-neutral-900">{plans[0].metrics?.estimatedYield?.toFixed(2) || '0.00'} <span className="text-2xl text-neutral-400">Qtl</span></h3>
                    <p className="text-sm text-neutral-500 mt-4">Add another plan to unlock comparative trend charts.</p>
                  </div>
                ) : (
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={yieldTrendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f5f5f5" />
                        <XAxis dataKey="name" stroke="#e5e5e5" tick={{ fill: '#737373', fontSize: 12 }} axisLine={false} tickLine={false} dy={10} />
                        <YAxis stroke="#e5e5e5" tick={{ fill: '#737373', fontSize: 12 }} axisLine={false} tickLine={false} dx={-10} />
                        <RechartsTooltip cursor={{fill: '#f5f5f5'}} contentStyle={{borderRadius: '8px', border: '1px solid #e5e5e5', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                        <Bar dataKey="yield" fill="#10b981" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={cardVariants}>
            <Card className="h-full min-h-[300px] flex flex-col">
              <CardHeader className="border-b border-neutral-100 pb-4">
                <CardTitle>Revenue Forecast (Lakh ₹)</CardTitle>
                <CardDescription>Projected cumulative revenue over the growing season</CardDescription>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col justify-center p-6">
                {!hasPlans ? (
                  <div className="flex flex-col items-center justify-center text-neutral-400 h-64">
                    <TrendingUp size={32} className="mb-2 opacity-30" />
                    <p className="text-sm font-medium">No yield projections have been created for this plot yet.</p>
                    <Link to={`/plot/${activePlot.id}/yield`} className="text-emerald-600 text-xs font-semibold mt-2 hover:underline">
                      Run Yield Planner
                    </Link>
                  </div>
                ) : plans.length === 1 ? (
                  <div className="flex flex-col justify-center h-64 w-full gap-4">
                    <div className="grid grid-cols-2 gap-4 w-full">
                      <div className="p-4 bg-neutral-50 rounded-lg border border-neutral-100 flex flex-col items-center text-center">
                        <span className="text-xs font-semibold text-neutral-500 uppercase tracking-widest">Projected Cost</span>
                        <span className="text-2xl font-bold text-neutral-800 mt-1">₹{((plans[0].metrics?.estimatedCost || 0)/100000).toFixed(2)} L</span>
                      </div>
                      <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-100 flex flex-col items-center text-center">
                        <span className="text-xs font-semibold text-emerald-700 uppercase tracking-widest">Projected Revenue</span>
                        <span className="text-2xl font-bold text-emerald-800 mt-1">₹{((plans[0].metrics?.estimatedRevenue || 0)/100000).toFixed(2)} L</span>
                      </div>
                    </div>
                    <div className="p-4 bg-blue-50 rounded-lg border border-blue-100 flex flex-col items-center text-center w-full">
                        <span className="text-xs font-semibold text-blue-700 uppercase tracking-widest">Projected Profit</span>
                        <span className="text-3xl font-bold text-blue-800 mt-1">₹{((plans[0].metrics?.estimatedProfit || 0)/100000).toFixed(2)} L</span>
                    </div>
                  </div>
                ) : (
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={revenueTrendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <defs>
                          <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2}/>
                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f5f5f5" />
                        <XAxis dataKey="name" stroke="#e5e5e5" tick={{ fill: '#737373', fontSize: 12 }} axisLine={false} tickLine={false} dy={10} />
                        <YAxis stroke="#e5e5e5" tick={{ fill: '#737373', fontSize: 12 }} axisLine={false} tickLine={false} dx={-10} />
                        <RechartsTooltip contentStyle={{borderRadius: '8px', border: '1px solid #e5e5e5', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                        <Area type="monotone" dataKey="revenue" stroke="#3b82f6" fillOpacity={1} fill="url(#colorRevenue)" strokeWidth={3} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

        </div>

        {/* Sidebar Area (1/3 width) */}
        <div className="space-y-6 lg:sticky lg:top-6 lg:h-fit lg:max-h-[calc(100vh-3rem)] lg:overflow-y-auto custom-scrollbar pb-6">
          
          <motion.div variants={cardVariants} className="h-auto">
            <SmartPlotInsights plotData={plotInsightData} />
          </motion.div>

          <motion.div variants={cardVariants}>
            <Card>
              <CardHeader className="border-b border-neutral-100 pb-4">
                <CardTitle>Plot Contribution</CardTitle>
                <CardDescription>Share of total farm</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col items-center justify-center p-6">
                <div className="h-48 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={70}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <RechartsTooltip contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex flex-wrap justify-center gap-3 mt-2">
                  {pieData.map((entry, index) => (
                    <div key={index} className="flex items-center gap-1.5 text-xs font-medium text-neutral-600">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}></div>
                      {entry.name}
                    </div>
                  ))}
                </div>
                <div className="mt-4 pt-4 border-t border-neutral-100 w-full text-center space-y-1">
                  <div className="text-sm font-semibold text-neutral-800">{areaSharePercent}% of Farm Area</div>
                  <div className="text-xs text-neutral-500">100% of {primaryCrop} acreage</div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={cardVariants}>
            <Card className="bg-emerald-600 text-white border-transparent shadow-lg overflow-hidden relative">
              <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 rounded-full bg-white opacity-10"></div>
              <div className="absolute bottom-0 left-0 -ml-10 -mb-10 w-40 h-40 rounded-full bg-white opacity-[0.07]"></div>
              <CardContent className="p-6 relative z-10 flex flex-col items-center text-center space-y-4">
                <div className="bg-white/20 p-3 rounded-full backdrop-blur-sm">
                  <Sprout size={32} className="text-white" />
                </div>
                <div className="space-y-1">
                  <h3 className="font-bold text-lg tracking-tight">Maximize Your Yield</h3>
                  <p className="text-emerald-50 text-xs leading-relaxed max-w-[200px]">Run our AI Predictive Engine to simulate harvest scenarios and optimize your profit margin.</p>
                </div>
                <Button 
                  onClick={() => navigate(`/plot/${activePlot.id}/yield`)}
                  className="w-full bg-white text-emerald-700 hover:bg-emerald-50 border-none font-bold shadow-sm mt-2 transition-transform hover:scale-[1.02]"
                >
                  Launch Yield Planner <ArrowRight size={16} className="ml-2" />
                </Button>
              </CardContent>
            </Card>
          </motion.div>

        </div>
      </div>
    </motion.div>
  );
};

export default PlotDashboard;
