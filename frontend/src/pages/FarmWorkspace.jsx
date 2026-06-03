import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Map, Grid, Info } from 'lucide-react';
import { Card, CardContent } from '../components/ui/Card';
import SatelliteView from './SatelliteView';
import PlanningView from './PlanningView';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.4 } },
};

const FarmWorkspace = () => {
  const [activeMode, setActiveMode] = useState('satellite'); // 'satellite' | 'planning'

  return (
    <motion.div 
      className="max-w-[1600px] mx-auto space-y-6 h-[calc(100vh-6rem)] flex flex-col"
      variants={containerVariants} 
      initial="hidden" 
      animate="visible"
    >
      {/* Header and Toggle */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-neutral-900">Farm Workspace</h1>
          <p className="text-neutral-500">Design, map, and manage your operational layout.</p>
        </div>
        
        <div className="bg-neutral-100 p-1 rounded-lg flex items-center shadow-inner">
          <button
            onClick={() => setActiveMode('satellite')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
              activeMode === 'satellite' 
                ? 'bg-white text-emerald-700 shadow-sm' 
                : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            <Map size={18} />
            Satellite View
          </button>
          <button
            onClick={() => setActiveMode('planning')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
              activeMode === 'planning' 
                ? 'bg-white text-emerald-700 shadow-sm' 
                : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            <Grid size={18} />
            Planning View
          </button>
        </div>
      </div>

      {/* Explanation Card */}
      <Card className="bg-emerald-50 border-emerald-100 shrink-0">
        <CardContent className="p-4 flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="h-10 w-10 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center shrink-0">
            <Info size={20} />
          </div>
          <div>
            <p className="text-sm text-emerald-800 leading-relaxed">
              <strong>Satellite View</strong> shows the real geographic location and precise acreage of your farm using GPS mapping. 
              <strong> Planning View</strong> acts as a digital twin for operational farm design, drawing infrastructure like roads, irrigation networks, and structures. 
              Both views synchronize automatically to your farm's active plots.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Workspace Area */}
      <div className="flex-1 relative bg-white border border-neutral-200 rounded-xl overflow-hidden shadow-sm">
        <AnimatePresence mode="wait">
          {activeMode === 'satellite' ? (
            <motion.div
              key="satellite"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0"
            >
              <SatelliteView />
            </motion.div>
          ) : (
            <motion.div
              key="planning"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 overflow-y-auto"
            >
              <PlanningView />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

export default FarmWorkspace;
