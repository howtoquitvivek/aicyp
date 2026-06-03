import { useLocation } from 'react-router-dom';
import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sprout, Coins, TrendingUp, Sliders, DollarSign, ArrowUpRight, 
  ChevronRight, Sparkles, AlertTriangle, ShieldCheck, RefreshCw,
  Gauge, Info, Layers, Loader2, ArrowRight, Save
} from 'lucide-react';
import { useAuth } from '../store/AuthContext';
import api from '../services/api';
import { useWorkspace } from '../store/WorkspaceContext';
import { Card } from '../components/ui/Card';
import Button from '../components/ui/Button';
import NoPlotsFound from '../components/ui/NoPlotsFound';

// Crop baseline yields (kg per acre) & standard prices (INR per kg)
const CROP_COEFFICIENTS = {
  Rice: { baseYield: 2200, stdPrice: 22, stdCost: 14000 },
  Wheat: { baseYield: 1800, stdPrice: 24, stdCost: 12000 },
  Maize: { baseYield: 2500, stdPrice: 20, stdCost: 11000 },
  Cotton: { baseYield: 900, stdPrice: 72, stdCost: 24000 },
  Sugarcane: { baseYield: 34000, stdPrice: 3.5, stdCost: 35000 },
  Vegetables: { baseYield: 5800, stdPrice: 18, stdCost: 18000 },
  Soybean: { baseYield: 1200, stdPrice: 42, stdCost: 13000 },
  Groundnut: { baseYield: 1400, stdPrice: 58, stdCost: 16000 },
};

const SOIL_COEFFICIENTS = {
  Alluvial: 1.15,
  Black: 1.10,
  Red: 0.95,
  Laterite: 0.90,
  Desert: 0.70,
  Loamy: 1.05,
  Clayey: 0.98,
  Sandy: 0.80,
};

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.25, 1, 0.5, 1] } },
};

const YieldPlanner = () => {
  const location = useLocation();
  const recommendedCrop = location.state?.recommendedCrop;
  const { user } = useAuth();
  const { activePlot, profileData, loading: isLoading } = useWorkspace();
  const inferredCrop = activePlot ? (Object.keys(CROP_COEFFICIENTS).find(c => activePlot.name && activePlot.name.includes(c)) || activePlot.crop || 'Rice') : 'Rice';
  const targetCrop = recommendedCrop || inferredCrop;
  
  const [savingPlan, setSavingPlan] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [marketData, setMarketData] = useState(null);

  // Multipliers controlled by UI sliders
  const [seedQuality, setSeedQuality] = useState(1.0); // 0.8 (Basic) -> 1.25 (Elite HYV)
  const [waterEfficiency, setWaterEfficiency] = useState(1.0); // 0.8 -> 1.15
  const [fertilizerLevel, setFertilizerLevel] = useState(1.0); // 0.85 -> 1.20
  
  // Dynamic market price overwrite override
  const [priceOverride, setPriceOverride] = useState(0); 
  const [costOverride, setCostOverride] = useState(0);

  // Read coefficients for baseline computations
  const cropBaseline = useMemo(() => {
    if (!activePlot) return CROP_COEFFICIENTS.Rice;
    return CROP_COEFFICIENTS[targetCrop] || CROP_COEFFICIENTS.Rice;
  }, [activePlot, targetCrop]);

  // Fetch AGMARKNET Market Price
  useEffect(() => {
    if (!activePlot || !profileData) return;
    api.market.getCurrent(targetCrop || 'Rice', profileData?.district || '', profileData?.state || '')
      .then(res => {
        if (res.available) setMarketData(res);
      })
      .catch(() => {});
  }, [activePlot, profileData, targetCrop]);

  // Sync inputs when crop or marketData changes
  useEffect(() => {
    if (cropBaseline) {
      if (marketData && marketData.available) {
        // AGMARKNET returns price per quintal (100 kg), we need price per kg
        setPriceOverride(marketData.modal_price / 100);
      } else {
        setPriceOverride(cropBaseline.stdPrice);
      }
      setCostOverride(cropBaseline.stdCost);
    }
  }, [cropBaseline, marketData]);

  const [mlData, setMlData] = useState(null);
  const [isPredicting, setIsPredicting] = useState(false);

  // Crop-specific agronomic defaults (ICAR recommended dose of fertilizer)
  const CROP_NPK_DEFAULTS = {
    Wheat:      { N: 120, P: 60, K: 40, ph: 6.5 },
    Rice:       { N: 120, P: 60, K: 40, ph: 6.0 },
    Maize:      { N: 120, P: 60, K: 40, ph: 6.5 },
    Cotton:     { N: 120, P: 60, K: 60, ph: 7.0 },
    Soybean:    { N: 20,  P: 60, K: 40, ph: 6.5 },
    Sugarcane:  { N: 150, P: 60, K: 60, ph: 6.5 },
    Groundnut:  { N: 25,  P: 50, K: 40, ph: 6.5 },
    Vegetables: { N: 100, P: 50, K: 50, ph: 6.5 },
  };

  // Fetch ML Prediction
  useEffect(() => {
    if (!activePlot || !profileData) return;
    
    const fetchPrediction = async () => {
      setIsPredicting(true);
      try {
        // Fetch live weather for the user's city
        const city = profileData.city || profileData.district || 'Delhi';
        let weatherTemp = 25, weatherHumidity = 60, weatherRainfall = 100;
        try {
          const weatherRes = await api.weather.getCurrent(city);
          if (weatherRes) {
            weatherTemp = weatherRes.temperature ?? weatherRes.temp ?? 25;
            weatherHumidity = weatherRes.humidity ?? 60;
            weatherRainfall = weatherRes.rainfall ?? weatherRes.rain ?? 100;
          }
        } catch (e) {
          console.warn("Weather fetch failed for ML, using defaults", e);
        }

        const cropDefaults = CROP_NPK_DEFAULTS[targetCrop] || { N: 100, P: 50, K: 40, ph: 6.5 };

        const features = {
          crop: targetCrop,
          state: profileData.state || 'Unknown',
          area: activePlot.area,
          temperature: weatherTemp,
          humidity: weatherHumidity,
          rainfall: weatherRainfall,
          nitrogen: activePlot.nitrogen ?? cropDefaults.N,
          phosphorus: activePlot.phosphorus ?? cropDefaults.P,
          potassium: activePlot.potassium ?? cropDefaults.K,
          ph: activePlot.ph ?? cropDefaults.ph,
          soil: activePlot.soil,
          irrigation: activePlot.irrigation,
          season: activePlot.season || 'Kharif'
        };
        const res = await api.ml.predictYield(features);
        setMlData(res);
      } catch (err) {
        console.error("Failed to fetch ML prediction", err);
      } finally {
        setIsPredicting(false);
      }
    };
    
    const timer = setTimeout(fetchPrediction, 500); // Debounce
    return () => clearTimeout(timer);
  }, [activePlot, targetCrop, profileData]);

  // Financial Metrics (using ML Yield × Slider Modifiers)
  const financialMetrics = useMemo(() => {
    if (!activePlot || !cropBaseline || !mlData) return { yieldTotal: 0, revenue: 0, costTotal: 0, netProfit: 0, margin: 0, adjustedYieldRate: 0 };

    // mlData.predicted_yield is the baseline Rate (Tons/Hectare) from Random Forest.
    // Sliders represent farm management quality that the ML model cannot observe:
    //   seedQuality:     Seed genetics grade (0.8 Local → 1.25 Elite HYV)
    //   waterEfficiency: Water availability   (0.8 Deficit → 1.15 Optimal Drip)
    //   fertilizerLevel: Nutrient application  (0.85 Low → 1.20 Precision)
    // Actual Yield = ML Baseline × Seed × Water × Nutrients
    const managementMultiplier = seedQuality * waterEfficiency * fertilizerLevel;
    const adjustedYieldRate = mlData.predicted_yield * managementMultiplier;

    // activePlot.area is in Acres. 1 Hectare = 2.47105 Acres.
    const areaInHectares = activePlot.area / 2.47105;
    
    // Total Yield in kg = Adjusted Yield Rate (Tons/Hectare) × Area (Hectares) × 1000 kg/Ton
    const computedYield = adjustedYieldRate * areaInHectares * 1000; 
    
    // Financial Metrics
    const grossRevenue = computedYield * priceOverride;
    
    // Input Cost scales with selected Seed Quality, fertilizer levels, and water costs
    const baseCostPerAcre = costOverride;
    const qualityPremium = (seedQuality - 0.8) * 4500; 
    const inputPremium = (fertilizerLevel - 0.85) * 3200;
    const waterCost = (waterEfficiency - 0.8) * 2000;
    const computedCostPerAcre = baseCostPerAcre + qualityPremium + inputPremium + waterCost;
    const totalExpenses = computedCostPerAcre * activePlot.area;

    const netProfit = grossRevenue - totalExpenses;
    const profitMargin = grossRevenue > 0 ? (netProfit / grossRevenue) * 100 : 0;

    return {
      yieldTotal: Math.round(computedYield),
      adjustedYieldRate: Math.round(adjustedYieldRate * 100) / 100,
      revenue: Math.round(grossRevenue),
      costTotal: Math.round(totalExpenses),
      netProfit: Math.round(netProfit),
      margin: Math.round(profitMargin * 10) / 10
    };
  }, [activePlot, cropBaseline, seedQuality, waterEfficiency, fertilizerLevel, priceOverride, costOverride, mlData]);

  // Seed / fertilizer quality text helpers
  const getQualityLabel = (val) => {
    if (val < 0.9) return { label: 'Low Grade / Local', color: 'text-amber-500' };
    if (val < 1.1) return { label: 'Certified / Standard', color: 'text-emerald-500 font-semibold' };
    return { label: 'High Yield Hybrid (HYV)', color: 'text-purple-600 font-bold' };
  };

  const getWaterLabel = (val) => {
    if (val < 0.9) return { label: 'Deficient / Dry Feed', color: 'text-amber-600' };
    if (val < 1.05) return { label: 'Scheduled Drip / Optimal', color: 'text-emerald-600 font-semibold' };
    return { label: 'Heavy Canal Irrigation', color: 'text-cyan-600 font-bold' };
  };

  const getFertilizerLabel = (val) => {
    if (val < 0.95) return { label: 'Low Organic Input', color: 'text-neutral-500' };
    if (val < 1.1) return { label: 'Balanced NPK Feeding', color: 'text-emerald-600 font-semibold' };
    return { label: 'Intensive Chemical Feed', color: 'text-red-500' };
  };

  // Dynamic AI advisor logic
  const advisorTips = useMemo(() => {
    const tips = [];
    if (financialMetrics.margin < 15) {
      tips.push({
        type: 'danger',
        message: "Profit margins are critically thin. Consider upgrading to High Yielding Seeds (HYV) to unlock up to 25% higher harvest potential.",
      });
    } else if (financialMetrics.margin > 40) {
      tips.push({
        type: 'success',
        message: "Excellent yield optimization! Your profit margins exceed standard region benchmarks. Ensure to preserve soil health for subsequent sowing.",
      });
    }

    if (fertilizerLevel > 1.1) {
      tips.push({
        type: 'warning',
        message: "Chemical input usage is elevated. Transitioning 15% towards micro-nutrients or composting could cut costs by ₹1,500/acre without yield impact.",
      });
    }

    if (activePlot?.soil === 'Sandy' || activePlot?.soil === 'Desert') {
      tips.push({
        type: 'info',
        message: "For highly porous Sandy soil, avoid flood irrigation. Drip fertigation increases nutrient absorption rates by up to 30%.",
      });
    }

    // Default general advice
    if (tips.length === 0) {
      tips.push({
        type: 'info',
        message: "Balanced dynamic model. Crop rotation with legumes (like soybean or chickpeas) next season can restore organic nitrogen values naturally.",
      });
    }
    return tips;
  }, [financialMetrics.margin, fertilizerLevel, activePlot]);

  const handleSavePlan = async () => {
    if (!user?.uid || !activePlot) return;
    setSavingPlan(true);
    setSaveSuccess(false);
    try {
      await api.users.saveYieldPlan(user.uid, {
        plotId: activePlot.id,
        crop: targetCrop,
        area: activePlot.area,
        expected_yield: financialMetrics.yieldTotal,
        expected_revenue: financialMetrics.revenue,
        seed_quality: seedQuality,
        water_efficiency: waterEfficiency,
        fertilizer_level: fertilizerLevel,
        risk_score: financialMetrics.margin
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error('Failed to save plan:', err);
    } finally {
      setSavingPlan(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px] gap-4">
        <Loader2 className="animate-spin text-emerald-600" size={48} />
        <p className="text-neutral-500 font-medium">Bootstrapping algorithmic yield charts...</p>
      </div>
    );
  }

  if (!activePlot) {
    return <NoPlotsFound context="planner" />;
  }

  return (
    <motion.div 
      className="max-w-7xl mx-auto space-y-8 text-left" 
      variants={containerVariants} 
      initial="hidden" 
      animate="visible"
    >
      {/* Title Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight text-neutral-900 flex items-center gap-2">
            <Coins className="text-emerald-600" size={28} /> Predictive Yield & Financial Planner
          </h1>
          <p className="text-neutral-500 text-sm">
            Model dynamic soil parameters, scale variable farm inputs, and project revenue profiles.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="text-xs text-neutral-400 bg-neutral-100 border border-neutral-200 px-3 py-1.5 rounded-full font-medium flex items-center gap-1.5 shadow-sm">
            <ShieldCheck className="text-emerald-600" size={14} /> Algorithmic Predictive Engine Active
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Side Controls (Columns 5) */}
        <div className="lg:col-span-5 space-y-6">
          <Card className="border border-neutral-200 shadow-sm overflow-hidden">
            <div className="bg-neutral-50 px-4 py-3 border-b border-neutral-200 flex justify-between items-center">
              <h2 className="font-bold text-neutral-900 text-sm flex items-center gap-1.5">
                <Layers className="text-emerald-600" size={16} /> 1. Active Plot Context
              </h2>
            </div>
            <div className="p-4 space-y-4">
              
              {/* Crop Stats Readout */}
              {activePlot && (
                <div className="border border-neutral-100 rounded-lg p-3 bg-neutral-50/50 flex flex-wrap gap-4 text-xs">
                  <div className="flex-1 min-w-[80px]">
                    <div className="text-neutral-400 font-semibold">Active Area</div>
                    <div className="font-bold text-neutral-800 text-sm">{activePlot.area} Acres</div>
                  </div>
                  <div className="flex-1 min-w-[80px]">
                    <div className="text-neutral-400 font-semibold">Crop Sown</div>
                    <div className="font-bold text-emerald-700 text-sm flex items-center gap-1">
                      <Sprout size={14} /> {targetCrop}
                    </div>
                  </div>
                  <div className="flex-1 min-w-[80px]">
                    <div className="text-neutral-400 font-semibold">Soil Chemistry</div>
                    <div className="font-bold text-neutral-800 text-sm">{activePlot.soil}</div>
                  </div>
                </div>
              )}

            </div>
          </Card>

          {/* 2. Input Variable Sliders */}
          <Card className="border border-neutral-200 shadow-sm">
            <div className="bg-neutral-50 px-4 py-3 border-b border-neutral-200">
              <h2 className="font-bold text-neutral-900 text-sm flex items-center gap-1.5">
                <Sliders className="text-emerald-600" size={16} /> 2. Tweak Variable Modifiers
              </h2>
            </div>
            <div className="p-4 space-y-5 text-xs">
              
              {/* Seed Quality Slider */}
              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-neutral-700">Seed Genetics Grade</span>
                  <span className={getQualityLabel(seedQuality).color}>
                    {getQualityLabel(seedQuality).label}
                  </span>
                </div>
                <input
                  type="range"
                  min="0.8"
                  max="1.25"
                  step="0.05"
                  value={seedQuality}
                  onChange={(e) => setSeedQuality(parseFloat(e.target.value))}
                  className="w-full accent-emerald-600 cursor-pointer h-1.5 bg-neutral-200 rounded-lg"
                />
                <p className="text-[10px] text-neutral-400">Better seed genetics dramatically escalate crop robust values & weight profiles.</p>
              </div>

              {/* Water & Irrigation Efficiency Slider */}
              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-neutral-700">Water Supply & Feed</span>
                  <span className={getWaterLabel(waterEfficiency).color}>
                    {getWaterLabel(waterEfficiency).label}
                  </span>
                </div>
                <input
                  type="range"
                  min="0.8"
                  max="1.15"
                  step="0.05"
                  value={waterEfficiency}
                  onChange={(e) => setWaterEfficiency(parseFloat(e.target.value))}
                  className="w-full accent-emerald-600 cursor-pointer h-1.5 bg-neutral-200 rounded-lg"
                />
                <p className="text-[10px] text-neutral-400">Consistent moisture feed safeguards root health and minimizes dry kernel kernels.</p>
              </div>

              {/* Nutrient Feeding Level */}
              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-neutral-700">Nutrients & Fertilizer Input</span>
                  <span className={getFertilizerLabel(fertilizerLevel).color}>
                    {getFertilizerLabel(fertilizerLevel).label}
                  </span>
                </div>
                <input
                  type="range"
                  min="0.85"
                  max="1.20"
                  step="0.05"
                  value={fertilizerLevel}
                  onChange={(e) => setFertilizerLevel(parseFloat(e.target.value))}
                  className="w-full accent-emerald-600 cursor-pointer h-1.5 bg-neutral-200 rounded-lg"
                />
                <p className="text-[10px] text-neutral-400">Optimally balanced NPK compounds accelerate photosynthetic biomass creation.</p>
              </div>

              {/* Financial Constants Overrides */}
              <div className="border-t border-neutral-100 pt-4 grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] text-neutral-500 font-bold uppercase">Expected Sale Price (₹/kg)</label>
                  <div className="relative">
                    <span className="absolute left-2.5 top-2.5 text-neutral-400 font-bold">₹</span>
                    <input
                      type="number"
                      value={priceOverride}
                      onChange={(e) => setPriceOverride(Math.max(0, parseFloat(e.target.value) || 0))}
                      className="w-full pl-6 pr-2 py-1.5 border border-neutral-200 rounded text-neutral-800 font-semibold focus:outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] text-neutral-500 font-bold uppercase">Input Cost (₹/Acre)</label>
                  <div className="relative">
                    <span className="absolute left-2.5 top-2.5 text-neutral-400 font-bold">₹</span>
                    <input
                      type="number"
                      value={costOverride}
                      onChange={(e) => setCostOverride(Math.max(0, parseFloat(e.target.value) || 0))}
                      className="w-full pl-6 pr-2 py-1.5 border border-neutral-200 rounded text-neutral-800 font-semibold focus:outline-none"
                    />
                  </div>
                </div>
              </div>

            </div>
          </Card>
        </div>

        {/* Right Side Outcomes & KPI dashboard (Columns 7) */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Main Projections Box */}
          <Card className="border border-neutral-200 shadow-sm relative overflow-hidden">
            <div className="bg-neutral-900 text-white px-5 py-4 flex justify-between items-center">
              <div>
                <h3 className="font-extrabold text-sm tracking-wide uppercase text-emerald-400">Algorithmic Projection Outcomes</h3>
                <p className="text-neutral-400 text-xs mt-0.5">Physical scaling calculations mapped for {activePlot?.name}</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="bg-white/10 px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1 text-white">
                  <RefreshCw size={12} className="animate-spin-slow" /> Calibrating Live
                </div>
                <Button 
                  onClick={handleSavePlan} 
                  disabled={savingPlan}
                  className="bg-emerald-500 hover:bg-emerald-600 text-white text-xs h-7 py-0 px-3 rounded shadow-sm flex items-center"
                >
                  {savingPlan ? <Loader2 size={12} className="animate-spin mr-1" /> : <Save size={12} className="mr-1" />}
                  {saveSuccess ? 'Saved!' : 'Save Plan'}
                </Button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              
              {/* Financial Margins Graph Bar */}
              <div className="space-y-2">
                <div className="flex justify-between items-end">
                  <span className="text-xs font-bold text-neutral-600">PROJECTED NET PROFIT MARGIN</span>
                  <span className={`text-xl font-extrabold ${financialMetrics.netProfit >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                    {financialMetrics.margin}%
                  </span>
                </div>
                
                {/* Horizontal custom bar gauge */}
                <div className="w-full bg-neutral-100 rounded-full h-3.5 border border-neutral-200 overflow-hidden relative">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(100, Math.max(0, financialMetrics.margin))}%` }}
                    transition={{ duration: 0.5, ease: 'easeOut' }}
                    className={`h-full rounded-full ${
                      financialMetrics.margin < 15 ? 'bg-red-500' :
                      financialMetrics.margin < 30 ? 'bg-amber-400' :
                      'bg-emerald-500'
                    }`}
                  />
                </div>
                <div className="flex justify-between text-[9px] text-neutral-400 font-semibold px-0.5">
                  <span>0% (Loss Bound)</span>
                  <span>25% (Regional Average)</span>
                  <span>50%+ (High Yield Bound)</span>
                </div>
              </div>

              {/* ML Yield Output Panel */}
              <div className="bg-neutral-50 border border-neutral-200 rounded-xl overflow-hidden shadow-sm">
                <div className="bg-white px-5 py-4 border-b border-neutral-200 flex items-center justify-between">
                  <div>
                    <div className="text-xs text-neutral-500 font-bold uppercase tracking-wider">Machine Learning Forecast</div>
                    <div className="text-3xl font-extrabold text-neutral-900 mt-1 flex items-baseline gap-1">
                      {isPredicting ? (
                        <Loader2 className="animate-spin text-emerald-600" size={24} />
                      ) : (
                        <>
                          {financialMetrics.yieldTotal.toLocaleString()} <span className="text-sm font-semibold text-neutral-500">kg Total</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="bg-emerald-50 border border-emerald-200/50 p-3 rounded-full">
                    <Sprout className="text-emerald-600" size={28} />
                  </div>
                </div>
                
                {mlData && !isPredicting && (
                  <div className="p-4 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <span className="text-[10px] uppercase font-bold text-neutral-400">Adjusted Yield Rate</span>
                        <p className="text-sm font-bold text-neutral-800">{financialMetrics.adjustedYieldRate} Tons/Hectare</p>
                        <p className="text-[10px] text-neutral-400">ML Baseline: {mlData.predicted_yield} t/ha × {(seedQuality * waterEfficiency * fertilizerLevel).toFixed(2)} mgmt</p>
                      </div>
                      <div className="space-y-1">
                        <span className="text-[10px] uppercase font-bold text-neutral-400">Prediction Range</span>
                        <p className="text-sm font-bold text-neutral-600">{(mlData.prediction_range[0] * seedQuality * waterEfficiency * fertilizerLevel).toFixed(2)} - {(mlData.prediction_range[1] * seedQuality * waterEfficiency * fertilizerLevel).toFixed(2)} Tons/Ha</p>
                      </div>
                      <div className="space-y-1">
                        <span className="text-[10px] uppercase font-bold text-neutral-400">Model Confidence</span>
                        <p className={`text-sm font-bold ${
                          mlData.confidence_level === 'High' ? 'text-emerald-600' :
                          mlData.confidence_level === 'Medium' ? 'text-amber-500' : 'text-red-500'
                        }`}>
                          {mlData.confidence_level} ({mlData.confidence_score}%)
                        </p>
                        {mlData.confidence_reasons && mlData.confidence_reasons.length > 0 && (
                          <div className="pt-1">
                            <span className="text-[10px] font-semibold text-neutral-500 block mb-0.5">Reason:</span>
                            {mlData.confidence_reasons.map((reason, idx) => (
                              <p key={idx} className={`text-[10px] leading-tight flex items-start gap-1 ${reason.startsWith('⚠') ? 'text-amber-600 font-medium' : 'text-neutral-500'}`}>
                                {reason}
                              </p>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="space-y-1">
                        <span className="text-[10px] uppercase font-bold text-neutral-400">Prediction Method</span>
                        <p className="text-xs font-medium text-neutral-500">{mlData.method}</p>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-neutral-100">
                      <span className="text-[10px] uppercase font-bold text-neutral-400 block mb-2">Top Contributing Factors</span>
                      <ul className="space-y-1.5">
                        {mlData.top_factors.map((factor, idx) => (
                          <li key={idx} className="flex items-start gap-1.5 text-xs text-neutral-600">
                            <Info size={14} className="text-emerald-500 shrink-0 mt-0.5" />
                            {factor}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
              </div>

              {/* Financial KPI Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                
                {/* Gross Revenue */}
                <div className="border border-neutral-200 rounded-xl p-4 bg-white shadow-sm flex flex-col justify-between">
                  <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">Gross Revenue</span>
                  <span className="text-xl font-black text-neutral-800 mt-2">
                    ₹{financialMetrics.revenue.toLocaleString()}
                  </span>
                  <div className="text-[9px] text-emerald-600 font-bold flex items-center gap-0.5 mt-2">
                    <ArrowUpRight size={10} /> Market Sale Estimate
                  </div>
                </div>

                {/* Total Expenses */}
                <div className="border border-neutral-200 rounded-xl p-4 bg-white shadow-sm flex flex-col justify-between">
                  <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">Operational Costs</span>
                  <span className="text-xl font-black text-neutral-800 mt-2 text-neutral-700">
                    ₹{financialMetrics.costTotal.toLocaleString()}
                  </span>
                  <span className="text-[9px] text-neutral-400 font-semibold mt-2">
                    Seeds, Feed, Diesel
                  </span>
                </div>

                {/* Net Income */}
                <div className={`border rounded-xl p-4 shadow-sm flex flex-col justify-between ${
                  financialMetrics.netProfit >= 0 ? 'border-emerald-200 bg-emerald-50/20' : 'border-red-200 bg-red-50/20'
                }`}>
                  <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">Net Profit</span>
                  <span className={`text-xl font-black mt-2 ${
                    financialMetrics.netProfit >= 0 ? 'text-emerald-700' : 'text-red-600'
                  }`}>
                    ₹{financialMetrics.netProfit.toLocaleString()}
                  </span>
                  <span className={`text-[9px] font-bold mt-2 ${
                    financialMetrics.netProfit >= 0 ? 'text-emerald-600' : 'text-red-500'
                  }`}>
                    {financialMetrics.netProfit >= 0 ? '🟢 Profit Invoiced' : '🔴 Budget Deficit'}
                  </span>
                </div>

              </div>

            </div>
          </Card>

          {/* AI Advisory Panel */}
          <Card className="border border-neutral-200 shadow-sm overflow-hidden text-left">
            <div className="bg-neutral-50 px-4 py-3 border-b border-neutral-200 flex items-center gap-1.5">
              <Sparkles className="text-emerald-600 animate-pulse" size={16} />
              <h4 className="font-bold text-neutral-900 text-sm">Smart AI Agronomic Recommendations</h4>
            </div>
            
            <div className="p-4 space-y-3">
              {advisorTips.map((tip, idx) => (
                <div 
                  key={idx} 
                  className={`p-3 rounded-lg border flex gap-2.5 text-xs leading-relaxed ${
                    tip.type === 'danger' ? 'bg-red-50 border-red-200 text-red-800' :
                    tip.type === 'warning' ? 'bg-amber-50 border-amber-200 text-amber-900' :
                    tip.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' :
                    'bg-neutral-50 border-neutral-200 text-neutral-700'
                  }`}
                >
                  <div className="shrink-0 mt-0.5">
                    {tip.type === 'danger' && <AlertTriangle size={14} className="text-red-500" />}
                    {tip.type === 'warning' && <AlertTriangle size={14} className="text-amber-500" />}
                    {tip.type === 'success' && <ShieldCheck size={14} className="text-emerald-600 animate-bounce" />}
                    {tip.type === 'info' && <Info size={14} className="text-emerald-600" />}
                  </div>
                  <div>
                    {tip.message}
                  </div>
                </div>
              ))}
            </div>
          </Card>

        </div>

      </div>

    </motion.div>
  );
};

export default YieldPlanner;
