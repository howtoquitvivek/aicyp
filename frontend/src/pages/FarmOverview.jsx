import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Map, Layers, PieChart as PieChartIcon, ChevronRight, Activity, CloudRain, TrendingUp } from 'lucide-react';
import { useWorkspace } from '../store/WorkspaceContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/Card';
import { Button } from '../components/ui/Button';

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
};

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] } },
};

const FarmOverview = () => {
  const { farmData, profileData, plots, loading } = useWorkspace();
  const navigate = useNavigate();

  const totalArea = useMemo(() => plots.reduce((sum, p) => sum + (parseFloat(p.area) || 0), 0), [plots]);
  const uniqueCrops = useMemo(() => [...new Set(plots.map(p => p.crop).filter(Boolean))], [plots]);

  // Phase 3: Farm Health Score deterministic logic
  const healthScore = useMemo(() => {
    if (plots.length === 0) return 0;
    
    // Simplistic weighted deterministic logic
    const weatherScore = 22; // Assume profile is complete 
    const soilScore = plots.every(p => p.soil && p.soil_n && p.soil_p) ? 25 : 15;
    const marketScore = 18; 
    const yieldScore = plots.some(p => p.yieldPlans && p.yieldPlans.length > 0) ? 20 : 10;
    const opScore = 15;

    return weatherScore + soilScore + marketScore + yieldScore + opScore;
  }, [plots]);

  const getHealthLevel = (score) => {
    if (score >= 90) return { label: 'Excellent', color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200' };
    if (score >= 75) return { label: 'Good', color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200' };
    if (score >= 60) return { label: 'Average', color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200' };
    return { label: 'At Risk', color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200' };
  };

  const healthData = getHealthLevel(healthScore);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px] text-neutral-500">
        <span className="animate-spin text-emerald-600 mr-3">⟳</span>
        Bootstrapping Farm Overview...
      </div>
    );
  }

  return (
    <motion.div
      className="max-w-6xl mx-auto pb-12 space-y-8 text-left"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <motion.div className="flex flex-col space-y-2" variants={cardVariants}>
        <h1 className="text-3xl font-bold tracking-tight text-neutral-900">
          Farm Status
        </h1>
        <p className="text-lg text-neutral-500">
          {profileData?.district || 'Your Region'} · {totalArea.toFixed(1)} Acres Total
        </p>
      </motion.div>

      {/* 1. Farm Health Score */}
      <motion.div variants={cardVariants}>
        <Card className={`border-2 ${healthData.border} overflow-hidden shadow-md`}>
          <div className="flex flex-col md:flex-row">
            <div className={`p-8 flex flex-col justify-center items-center md:w-1/3 ${healthData.bg} border-b md:border-b-0 md:border-r ${healthData.border}`}>
              <Activity size={40} className={`${healthData.color} mb-3`} />
              <p className="text-sm font-semibold text-neutral-600 uppercase tracking-widest mb-1">Farm Health Score</p>
              <div className="flex items-baseline gap-2">
                <span className={`text-6xl font-bold tracking-tighter ${healthData.color}`}>{healthScore}</span>
                <span className="text-2xl font-medium text-neutral-400">/ 100</span>
              </div>
              <div className={`mt-3 px-4 py-1 rounded-full text-sm font-bold border ${healthData.border} ${healthData.color} bg-white`}>
                {healthData.label}
              </div>
            </div>
            <div className="p-8 md:w-2/3 bg-white flex flex-col justify-center">
              <h3 className="text-lg font-bold text-neutral-900 mb-4">Score Breakdown</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-8 text-sm font-medium">
                <div className="flex justify-between items-center">
                  <span className="text-neutral-500">Weather Suitability</span>
                  <span className="text-emerald-600 font-bold">22%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-neutral-500">Soil Suitability</span>
                  <span className="text-emerald-600 font-bold">{plots.every(p => p.soil_n) ? '25%' : '15%'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-neutral-500">Market Conditions</span>
                  <span className="text-emerald-600 font-bold">18%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-neutral-500">Yield Potential</span>
                  <span className="text-emerald-600 font-bold">{plots.some(p => p.yieldPlans && p.yieldPlans.length > 0) ? '20%' : '10%'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-neutral-500">Operational Readiness</span>
                  <span className="text-emerald-600 font-bold">15%</span>
                </div>
              </div>
            </div>
          </div>
        </Card>
      </motion.div>

      {/* 2, 3, 4. KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <motion.div variants={cardVariants}>
          <Card className="h-full shadow-sm border-neutral-200">
            <CardContent className="p-6 flex flex-col justify-center items-center text-center gap-2">
              <Map size={32} className="text-emerald-600 mb-2" />
              <p className="text-sm font-semibold text-neutral-500 uppercase tracking-widest">Total Area</p>
              <h3 className="text-4xl font-bold text-neutral-900">{totalArea.toFixed(1)} <span className="text-xl">Ac</span></h3>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={cardVariants}>
          <Card className="h-full shadow-sm border-neutral-200">
            <CardContent className="p-6 flex flex-col justify-center items-center text-center gap-2">
              <Layers size={32} className="text-blue-600 mb-2" />
              <p className="text-sm font-semibold text-neutral-500 uppercase tracking-widest">Active Plots</p>
              <h3 className="text-4xl font-bold text-neutral-900">{plots.length}</h3>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={cardVariants}>
          <Card className="h-full shadow-sm border-neutral-200">
            <CardContent className="p-6 flex flex-col justify-center items-center text-center gap-2">
              <PieChartIcon size={32} className="text-purple-600 mb-2" />
              <p className="text-sm font-semibold text-neutral-500 uppercase tracking-widest">Crops Cultivated</p>
              <h3 className="text-4xl font-bold text-neutral-900">{uniqueCrops.length}</h3>
              <p className="text-xs text-neutral-400 mt-1">{uniqueCrops.join(', ') || 'None'}</p>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* 5, 6. Weather & Market Snapshots */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <motion.div variants={cardVariants}>
          <Card className="h-full shadow-sm border-neutral-200 hover:border-emerald-300 transition-colors cursor-pointer group" onClick={() => navigate('/weather')}>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center justify-between text-lg">
                <div className="flex items-center gap-2"><CloudRain size={20} className="text-blue-500" /> Weather Snapshot</div>
                <ChevronRight size={18} className="text-neutral-300 group-hover:text-emerald-500 transition-colors" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-neutral-500 text-sm leading-relaxed mb-4">
                Real-time atmospheric telemetry and agricultural risk intelligence for {profileData?.district || 'your region'}.
              </p>
              <Button variant="secondary" className="w-full text-blue-700 bg-blue-50 hover:bg-blue-100">View Weather</Button>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={cardVariants}>
          <Card className="h-full shadow-sm border-neutral-200 hover:border-emerald-300 transition-colors cursor-pointer group" onClick={() => navigate('/global-market')}>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center justify-between text-lg">
                <div className="flex items-center gap-2"><TrendingUp size={20} className="text-amber-500" /> Market Snapshot</div>
                <ChevronRight size={18} className="text-neutral-300 group-hover:text-emerald-500 transition-colors" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-neutral-500 text-sm leading-relaxed mb-4">
                Live AGMARKNET prices, trends, and market intelligence for your cultivated crops.
              </p>
              <Button variant="secondary" className="w-full text-amber-700 bg-amber-50 hover:bg-amber-100">View Market Intel</Button>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* 7. Plots Directory */}
      <motion.div variants={cardVariants}>
        <Card className="shadow-sm border-neutral-200">
          <CardHeader>
            <CardTitle>Plot Workspaces</CardTitle>
            <CardDescription>Select a plot to view specific yields, recommendations, and localized weather.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-neutral-100">
              {plots.map(plot => (
                <div 
                  key={plot.id} 
                  onClick={() => navigate(`/plot/${plot.id}/dashboard`)}
                  className="p-6 flex items-center justify-between hover:bg-neutral-50 cursor-pointer transition-colors group"
                >
                  <div className="flex flex-col">
                    <h3 className="text-lg font-bold text-neutral-900 group-hover:text-emerald-700 transition-colors">
                      {plot.name}
                    </h3>
                    <div className="flex items-center gap-3 mt-1 text-sm text-neutral-500 font-medium">
                      <span>{parseFloat(plot.area).toFixed(1)} Acres</span>
                      <span className="w-1 h-1 rounded-full bg-neutral-300"></span>
                      <span>{plot.crop || 'Unassigned'}</span>
                      <span className="w-1 h-1 rounded-full bg-neutral-300"></span>
                      <span>{plot.soil || 'Unknown Soil'}</span>
                    </div>
                  </div>
                  <div className="h-10 w-10 rounded-full bg-white border border-neutral-200 flex items-center justify-center text-neutral-400 group-hover:border-emerald-200 group-hover:text-emerald-600 group-hover:bg-emerald-50 transition-all shadow-sm">
                    <ChevronRight size={20} />
                  </div>
                </div>
              ))}
              {plots.length === 0 && (
                <div className="p-8 text-center text-neutral-500">
                  <p>No plots defined yet.</p>
                  <Button variant="outline" onClick={() => navigate('/workspace')} className="mt-4">
                    Go to Farm Workspace
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>

    </motion.div>
  );
};

export default FarmOverview;
