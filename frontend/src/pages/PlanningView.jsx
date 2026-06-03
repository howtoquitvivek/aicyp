import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Grid, Plus, Trash2, Sprout, Milestone, Droplets, Info, Sparkles, 
  Layers, Save, Settings, ChevronRight, Calendar, ClipboardList, CheckCircle2, 
  Map, Compass, HelpCircle, Loader2, ArrowRight
} from 'lucide-react';
import { useAuth } from '../store/AuthContext';
import api from '../services/api';
import { Card } from '../components/ui/Card';
import Button from '../components/ui/Button';

const GRID_SNAP_SIZE = 15; // snapping grid steps in px
const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 500;

const PlanningView = () => {
  const { user } = useAuth();
  const canvasRef = useRef(null);
  
  const [layoutBlocks, setLayoutBlocks] = useState([]);
  const [farmData, setFarmData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedBlockId, setSelectedBlockId] = useState(null);
  const [activeTab, setActiveTab] = useState('info'); // info, procedures, fertilizers
  const [cropOptions, setCropOptions] = useState([
    'Rice', 'Wheat', 'Maize', 'Cotton', 'Sugarcane', 'Vegetables', 'Soybean', 'Groundnut'
  ]);

  // Load crops dynamically on mount
  useEffect(() => {
    const fetchCrops = async () => {
      try {
        const data = await api.datasets.getCrops();
        if (data && data.length > 0) {
          setCropOptions(data.map(c => c.name));
        }
      } catch (err) {
        console.error('Failed to load crop choices for RelativeMap dropdowns:', err);
      }
    };
    fetchCrops();
  }, []);

  // Spawning Form States
  const [spawnType, setSpawnType] = useState('field'); // field, road, water
  const [newPlotName, setNewPlotName] = useState('');
  const [newPlotArea, setNewPlotArea] = useState('3.5');
  const [newPlotCrop, setNewPlotCrop] = useState('Wheat');
  const [newPlotSoil, setNewPlotSoil] = useState('Loamy');
  const [newPlotIrrigation, setNewPlotIrrigation] = useState('Drip');

  // Dragging and positioning states
  const [draggedBlockId, setDraggedBlockId] = useState(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  // Custom notification toast
  const [notification, setNotification] = useState(null);
  const showToast = (message, type = 'info') => {
    setNotification({ message, type });
    const timer = setTimeout(() => setNotification(null), 5000);
    return () => clearTimeout(timer);
  };

  // Load user canvas blocks layout from database
  useEffect(() => {
    const fetchLayout = async () => {
      try {
        const userDoc = await api.users.getMe(user.uid);
        if (userDoc && userDoc.farm) {
          setFarmData(userDoc.farm);
          
          const plots = userDoc.farm.plots || [];
          const canvasLayout = userDoc.farm.canvasLayout || [];

          // Merge: Map plots to field blocks, providing default positions if unmapped
          const fieldBlocks = plots.map((p, i) => {
            if (p.x !== undefined && p.y !== undefined) {
              return { ...p, type: 'field' };
            }
            // If the plot was created in FarmMap and has no x/y, assign a cascading layout position
            return {
              ...p,
              type: 'field',
              x: 50 + (i * 30),
              y: 50 + (i * 30),
              w: 180,
              h: 120,
            };
          });

          // Non-field items (roads, ponds) remain in canvasLayout
          const otherBlocks = canvasLayout.filter(b => b.type !== 'field');
          const mergedBlocks = [...fieldBlocks, ...otherBlocks];

          setLayoutBlocks(mergedBlocks);
        }
      } catch (err) {
        console.error('Failed to load canvas layout:', err);
        showToast("Error retrieving farm layouts.", "error");
      } finally {
        setIsLoading(false);
      }
    };
    fetchLayout();
  }, [user.uid]);

  // Handle saving layout to DB
  const handleSaveLayout = async () => {
    setIsSaving(true);
    try {
      // Separate the canvas layout blocks into plots (fields) and others
      const newPlots = layoutBlocks.filter(b => b.type === 'field').map(b => {
        // Find existing plot to preserve lat/lng if mapped on FarmMap
        const existingPlot = (farmData.plots || []).find(p => p.id === b.id);
        const { type, ...plotData } = b; // Remove UI type flag
        return existingPlot ? { ...existingPlot, ...plotData } : plotData;
      });

      const newCanvasLayout = layoutBlocks.filter(b => b.type !== 'field');

      const { total_area, crops, soil_type, ...cleanFarmData } = farmData;

      const updatedFarm = {
        ...cleanFarmData,
        plots: newPlots,
        canvasLayout: newCanvasLayout
      };
      
      await api.users.saveFarm(user.uid, updatedFarm);
      setFarmData(updatedFarm);
      showToast("Relative farm layouts saved to database!", "success");
    } catch (err) {
      console.error('Save failed:', err);
      showToast("Unable to save layouts. Try again.", "error");
    } finally {
      setIsSaving(false);
    }
  };

  // Proportional box-dimension mapping calculator:
  // Base scaling factor: visual area in sq px = Acreage * 4000.
  // To keep shape nice, we use 1.4 Aspect Ratio.
  const calculateProportionalDimensions = (acres) => {
    const areaVal = parseFloat(acres || 2.5) * 4000;
    const w = Math.round(Math.sqrt(areaVal * 1.4) / GRID_SNAP_SIZE) * GRID_SNAP_SIZE;
    const h = Math.round(Math.sqrt(areaVal / 1.4) / GRID_SNAP_SIZE) * GRID_SNAP_SIZE;
    return { w, h };
  };

  // Add block helper
  const handleSpawnBlock = (e) => {
    e.preventDefault();
    
    let blockWidth = 120;
    let blockHeight = 90;
    let blockName = newPlotName.trim();

    if (spawnType === 'field') {
      const { w, h } = calculateProportionalDimensions(parseFloat(newPlotArea));
      blockWidth = w;
      blockHeight = h;
      if (!blockName) blockName = `Plot ${layoutBlocks.filter(b => b.type === 'field').length + 1}`;
    } else if (spawnType === 'road') {
      blockWidth = 400;
      blockHeight = 45;
      if (!blockName) blockName = 'Dirt Road';
    } else if (spawnType === 'water') {
      blockWidth = 80;
      blockHeight = 80;
      if (!blockName) blockName = 'Borewell Pond';
    }

    const newBlock = {
      id: `block-${Date.now()}`,
      type: spawnType,
      name: blockName,
      x: 60,
      y: 60,
      w: blockWidth,
      h: blockHeight,
      ...(spawnType === 'field' && {
        area: parseFloat(newPlotArea || 2.5),
        crop: newPlotCrop,
        soil: newPlotSoil,
        irrigation: newPlotIrrigation,
        procedures: { ploughing: false, sowing: false, weeding: false, harvesting: false },
        fertilizers: []
      })
    };

    setLayoutBlocks([...layoutBlocks, newBlock]);
    setSelectedBlockId(newBlock.id);
    setNewPlotName('');
    showToast(`Spawned "${blockName}" onto relative grid!`, "success");
  };

  // Delete active block
  const handleDeleteBlock = (blockId) => {
    const nextBlocks = layoutBlocks.filter(b => b.id !== blockId);
    setLayoutBlocks(nextBlocks);
    if (selectedBlockId === blockId) setSelectedBlockId(null);
    showToast("Removed element from layout.", "info");
  };

  // Drag and Snap coordinate logic
  const handleMouseDown = (blockId, e) => {
    e.preventDefault();
    if (e.target.closest('.delete-btn')) return; // ignore delete clicks

    const rect = canvasRef.current.getBoundingClientRect();
    const block = layoutBlocks.find(b => b.id === blockId);
    if (!block) return;

    setSelectedBlockId(blockId);
    setDraggedBlockId(blockId);
    
    // Track cursor offset relative to the block top-left
    setDragOffset({
      x: (e.clientX - rect.left) - block.x,
      y: (e.clientY - rect.top) - block.y
    });
  };

  const handleMouseMove = (e) => {
    if (!draggedBlockId) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const curX = e.clientX - rect.left - dragOffset.x;
    const curY = e.clientY - rect.top - dragOffset.y;

    // Apply snap-to-grid limits
    let snapX = Math.round(curX / GRID_SNAP_SIZE) * GRID_SNAP_SIZE;
    let snapY = Math.round(curY / GRID_SNAP_SIZE) * GRID_SNAP_SIZE;

    // Boundary constraints
    const block = layoutBlocks.find(b => b.id === draggedBlockId);
    if (!block) return;

    snapX = Math.max(0, Math.min(CANVAS_WIDTH - block.w, snapX));
    snapY = Math.max(0, Math.min(CANVAS_HEIGHT - block.h, snapY));

    setLayoutBlocks(layoutBlocks.map(b => 
      b.id === draggedBlockId ? { ...b, x: snapX, y: snapY } : b
    ));
  };

  const handleMouseUp = () => {
    setDraggedBlockId(null);
  };

  // Identify active selected block properties
  const activeBlock = layoutBlocks.find(b => b.id === selectedBlockId);

  // Deep update attributes inside selected plot
  const handleUpdateBlockField = (fieldKey, value) => {
    if (!activeBlock) return;
    setLayoutBlocks(layoutBlocks.map(b => 
      b.id === activeBlock.id ? { ...b, [fieldKey]: value } : b
    ));
  };

  // Sowing checklists toggle
  const handleToggleProcedure = (key) => {
    if (!activeBlock || activeBlock.type !== 'field') return;
    const updatedProcedures = {
      ...activeBlock.procedures,
      [key]: !activeBlock.procedures[key]
    };
    setLayoutBlocks(layoutBlocks.map(b => 
      b.id === activeBlock.id ? { ...b, procedures: updatedProcedures } : b
    ));
  };

  // Add Fertilizer log card
  const [fertName, setFertName] = useState('');
  const [fertAmount, setFertAmount] = useState('');
  const handleAddFertilizer = (e) => {
    e.preventDefault();
    if (!activeBlock || activeBlock.type !== 'field' || !fertName.trim()) return;

    const newLog = {
      id: `fert-${Date.now()}`,
      date: new Date().toISOString().split('T')[0],
      name: fertName.trim(),
      amount: fertAmount.trim() || 'Variable rate'
    };

    const nextFertilizers = [...(activeBlock.fertilizers || []), newLog];
    setLayoutBlocks(layoutBlocks.map(b => 
      b.id === activeBlock.id ? { ...b, fertilizers: nextFertilizers } : b
    ));
    setFertName('');
    setFertAmount('');
  };

  // Delete fertilizer log card
  const handleDeleteFertilizer = (logId) => {
    if (!activeBlock || activeBlock.type !== 'field') return;
    const nextFertilizers = activeBlock.fertilizers.filter(f => f.id !== logId);
    setLayoutBlocks(layoutBlocks.map(b => 
      b.id === activeBlock.id ? { ...b, fertilizers: nextFertilizers } : b
    ));
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px] gap-4">
        <Loader2 className="animate-spin text-emerald-600" size={48} />
        <p className="text-neutral-500 font-medium">Bootstrapping agricultural grid designer...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8 text-left relative p-6">
      
      {/* Dynamic Alert Banner */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className={`fixed top-4 left-1/2 -translate-x-1/2 z-[5000] px-4 py-3 rounded-xl border shadow-xl flex items-center gap-2.5 max-w-sm w-full text-xs font-semibold ${
              notification.type === 'error' ? 'bg-red-50 border-red-200 text-red-800' :
              notification.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' :
              'bg-white border-neutral-200 text-neutral-800'
            }`}
          >
            <Compass size={14} className="text-emerald-600 animate-spin" />
            <div className="flex-grow">{notification.message}</div>
            <button onClick={() => setNotification(null)} className="text-neutral-400 hover:text-neutral-600">
              <CheckCircle2 size={12} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header Panel */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight text-neutral-900 flex items-center gap-2">
            <Map className="text-emerald-600" size={28} /> Relative Canvas Layout
          </h1>
          <p className="text-neutral-500 text-sm">
            Arrange your fields relatively side-by-side, map road dividers, water borewells, and track custom schedules.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            onClick={handleSaveLayout}
            className="bg-emerald-600 text-white hover:bg-emerald-700 font-bold text-xs py-2 px-4 rounded-lg flex items-center gap-1.5 shadow-sm transition-all"
            disabled={isSaving}
          >
            {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            {isSaving ? 'Saving...' : 'Save Arrangements'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Spawner Control Pane (Columns 4) */}
        <div className="lg:col-span-4 space-y-6">
          <Card className="border border-neutral-200 shadow-sm">
            <div className="bg-neutral-50 px-4 py-3 border-b border-neutral-200">
              <h2 className="font-bold text-neutral-900 text-sm flex items-center gap-1.5">
                <Plus className="text-emerald-600" size={16} /> Spawn Grid Elements
              </h2>
            </div>
            
            <form onSubmit={handleSpawnBlock} className="p-4 space-y-4 text-xs">
              
              {/* Spawn Type Toggle */}
              <div className="space-y-1.5">
                <label className="block font-bold text-neutral-600 tracking-wide uppercase">Element Type</label>
                <div className="grid grid-cols-3 gap-2 bg-neutral-100 p-1 rounded-lg border border-neutral-200">
                  {[
                    { type: 'field', label: 'Field Plot', icon: Sprout },
                    { type: 'road', label: 'Dirt Road', icon: Milestone },
                    { type: 'water', label: 'Pond/Well', icon: Droplets }
                  ].map(opt => (
                    <button
                      key={opt.type}
                      type="button"
                      onClick={() => setSpawnType(opt.type)}
                      className={`py-1.5 rounded font-bold text-[10px] flex flex-col items-center justify-center gap-1 transition-all ${
                        spawnType === opt.type ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500 hover:text-neutral-900'
                      }`}
                    >
                      <opt.icon size={13} />
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Input for name */}
              <div className="space-y-1">
                <label className="block font-bold text-neutral-600 uppercase">Label / Title</label>
                <input
                  type="text"
                  required
                  placeholder={
                    spawnType === 'field' ? 'e.g. West Wheat Field' :
                    spawnType === 'road' ? 'e.g. Canal Link Road' : 'e.g. High Yield Borewell'
                  }
                  value={newPlotName}
                  onChange={(e) => setNewPlotName(e.target.value)}
                  className="w-full border border-neutral-200 rounded-lg p-2.5 bg-white text-neutral-800 font-semibold focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              {/* Crop & soil details if spawning field */}
              <AnimatePresence mode="wait">
                {spawnType === 'field' && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-4 overflow-hidden"
                  >
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block font-bold text-neutral-500 uppercase mb-1">Acreage</label>
                        <input
                          type="number"
                          step="0.1"
                          min="0.5"
                          max="20"
                          value={newPlotArea}
                          onChange={(e) => setNewPlotArea(e.target.value)}
                          className="w-full border border-neutral-200 rounded-lg p-2 bg-white text-neutral-800 font-semibold"
                        />
                      </div>
                      <div>
                        <label className="block font-bold text-neutral-500 uppercase mb-1">Crop sown</label>
                        <select
                          value={newPlotCrop}
                          onChange={(e) => setNewPlotCrop(e.target.value)}
                          className="w-full border border-neutral-200 rounded-lg p-2 bg-white text-neutral-800 font-semibold focus:outline-none"
                        >
                          {cropOptions.map(c => (
                            <option key={c} value={c}>{c}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block font-bold text-neutral-500 uppercase mb-1">Soil Profile</label>
                        <select
                          value={newPlotSoil}
                          onChange={(e) => setNewPlotSoil(e.target.value)}
                          className="w-full border border-neutral-200 rounded-lg p-2 bg-white text-neutral-800 font-semibold focus:outline-none"
                        >
                          {['Loamy', 'Clayey', 'Sandy', 'Alluvial', 'Black', 'Red', 'Laterite', 'Desert'].map(s => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block font-bold text-neutral-500 uppercase mb-1">Irrigation Feed</label>
                        <select
                          value={newPlotIrrigation}
                          onChange={(e) => setNewPlotIrrigation(e.target.value)}
                          className="w-full border border-neutral-200 rounded-lg p-2 bg-white text-neutral-800 font-semibold focus:outline-none"
                        >
                          {['Drip', 'Sprinkler', 'Canal Flood', 'Manual Rainfed'].map(i => (
                            <option key={i} value={i}>{i}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <Button
                type="submit"
                className="w-full bg-neutral-900 text-white hover:bg-neutral-800 text-xs py-2.5 rounded-lg font-bold flex items-center justify-center gap-1.5 transition-all mt-2"
              >
                <Plus size={14} /> Spawn to Grid
              </Button>

            </form>
          </Card>

          {/* Quick drafting instructions */}
          <Card className="border border-neutral-200 shadow-sm p-4 text-xs text-neutral-500 leading-relaxed space-y-2">
            <h4 className="font-bold text-neutral-700 flex items-center gap-1">
              <HelpCircle size={14} className="text-emerald-600" /> Blueprint Instructions
            </h4>
            <ul className="list-disc pl-4 space-y-1">
              <li>Drag spawned blocks across the blueprint container to map relative physical coordinates.</li>
              <li>Fields scale visually to match your exact acreage settings proportionately.</li>
              <li>Click any spawned piece to configure custom scheduling parameters and nutrient logs.</li>
            </ul>
          </Card>
        </div>

        {/* Center Grid + Selected Sidebar Customizer (Columns 8) */}
        <div className="lg:col-span-8 space-y-6">
          <div className="flex flex-col xl:flex-row gap-6 items-start">
            
            {/* Blueprint Grid Container */}
            <div className="flex-grow border border-neutral-300 rounded-2xl shadow-sm bg-neutral-900 overflow-hidden relative select-none">
              
              {/* High-tech glassmorphism grid overlay */}
              <div 
                className="absolute inset-0 opacity-15 pointer-events-none"
                style={{
                  backgroundImage: `
                    linear-gradient(to right, #ffffff 1px, transparent 1px),
                    linear-gradient(to bottom, #ffffff 1px, transparent 1px)
                  `,
                  backgroundSize: `${GRID_SNAP_SIZE}px ${GRID_SNAP_SIZE}px`
                }}
              />

              <div 
                ref={canvasRef}
                className="relative w-full h-[500px] overflow-hidden"
                onMouseMove={handleMouseMove}
                onMouseLeave={handleMouseUp}
                onMouseUp={handleMouseUp}
              >
                
                {/* Visual Blocks Renderer */}
                {layoutBlocks.map((block) => {
                  const isSelected = selectedBlockId === block.id;
                  
                  // Color codes for background blocks
                  let bgStyle = 'bg-neutral-800 border-neutral-700 text-neutral-400';
                  if (block.type === 'field') {
                    bgStyle = 'bg-emerald-950/70 border-emerald-600/90 text-emerald-300';
                  } else if (block.type === 'road') {
                    bgStyle = 'bg-neutral-700/80 border-neutral-500/80 text-neutral-300';
                  } else if (block.type === 'water') {
                    bgStyle = 'bg-cyan-950/75 border-cyan-500/85 text-cyan-300 rounded-full';
                  }

                  return (
                    <motion.div
                      key={block.id}
                      className={`absolute border-2 cursor-grab active:cursor-grabbing p-2.5 flex flex-col justify-between items-center shadow-lg backdrop-blur-sm transition-shadow ${bgStyle} ${
                        isSelected ? 'ring-2 ring-emerald-400 ring-offset-2 ring-offset-neutral-900 z-50' : 'hover:shadow-2xl'
                      }`}
                      style={{
                        left: block.x,
                        top: block.y,
                        width: block.w,
                        height: block.h,
                      }}
                      onMouseDown={(e) => handleMouseDown(block.id, e)}
                    >
                      
                      {/* Name Label */}
                      <span className="text-[10px] font-extrabold tracking-wider truncate max-w-full leading-none">
                        {block.name}
                      </span>

                      {/* Info badges inside block if field */}
                      {block.type === 'field' && block.h >= 60 && (
                        <div className="flex flex-col items-center gap-0.5 text-[8px] text-emerald-400/95 font-bold uppercase mt-1 leading-none">
                          <span>{block.area} ac</span>
                          <span>{block.crop}</span>
                        </div>
                      )}

                      {/* Small Delete Icon */}
                      <button
                        onClick={() => handleDeleteBlock(block.id)}
                        className="delete-btn absolute -top-2.5 -right-2.5 bg-red-600 border border-red-700 text-white rounded-full p-1 opacity-0 hover:opacity-100 focus:opacity-100 group-hover:opacity-100 transition-opacity shadow"
                        style={{ display: isSelected ? 'block' : 'none' }}
                      >
                        <Trash2 size={10} />
                      </button>

                    </motion.div>
                  );
                })}

                {/* Empty State Instructions */}
                {layoutBlocks.length === 0 && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 text-neutral-500 z-10">
                    <Grid size={48} className="text-neutral-700 mb-3 animate-pulse" />
                    <p className="font-bold text-sm text-neutral-400">Blueprint Empty</p>
                    <p className="text-xs text-neutral-600 max-w-xs mt-1">Configure your physical parcel details and spawn fields above to start layouts.</p>
                  </div>
                )}

              </div>
            </div>

            {/* Visual Sidebar Details Panel */}
            <AnimatePresence>
              {activeBlock && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="w-full xl:w-72 shrink-0 space-y-4"
                >
                  <Card className="border border-neutral-200 shadow-lg overflow-hidden text-xs">
                    
                    {/* Header Label */}
                    <div className="bg-neutral-900 text-white px-4 py-3 flex justify-between items-center">
                      <div className="truncate max-w-[150px]">
                        <h3 className="font-extrabold text-[10px] text-emerald-400 uppercase tracking-widest leading-none">Selected Element</h3>
                        <input
                          type="text"
                          value={activeBlock.name}
                          onChange={(e) => handleUpdateBlockField('name', e.target.value)}
                          className="bg-transparent border-b border-transparent hover:border-neutral-700 focus:border-emerald-500 focus:outline-none text-xs font-bold text-white mt-1 w-full"
                        />
                      </div>
                      
                      <button
                        onClick={() => handleDeleteBlock(activeBlock.id)}
                        className="text-red-500 hover:text-red-400 p-1.5 rounded-lg hover:bg-white/5 transition-all"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>

                    {/* Tab Navigation if type is field */}
                    {activeBlock.type === 'field' && (
                      <div className="flex border-b border-neutral-100 bg-neutral-50 p-1 gap-1">
                        {[
                          { id: 'info', label: 'Info & Soil', icon: Sprout },
                          { id: 'procedures', label: 'Tasks', icon: ClipboardList },
                          { id: 'fertilizers', label: 'Fertilizers', icon: Layers }
                        ].map(tab => (
                          <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex-1 py-1.5 rounded font-bold text-[9px] flex items-center justify-center gap-1 transition-all ${
                              activeTab === tab.id ? 'bg-white text-neutral-950 shadow-sm border border-neutral-200' : 'text-neutral-500 hover:text-neutral-950'
                            }`}
                          >
                            <tab.icon size={11} />
                            {tab.label}
                          </button>
                        ))}
                      </div>
                    )}

                    <div className="p-4 space-y-4">

                      {/* Fields detailed tabs */}
                      {activeBlock.type === 'field' && activeTab === 'info' && (
                        <div className="space-y-3">
                          
                          <div>
                            <label className="block text-[10px] font-bold text-neutral-400 uppercase mb-1">Acreage Area</label>
                            <div className="flex items-center gap-1.5">
                              <input
                                type="number"
                                step="0.1"
                                value={activeBlock.area || ''}
                                onChange={(e) => {
                                  const areaVal = parseFloat(e.target.value) || 0;
                                  const { w, h } = calculateProportionalDimensions(areaVal);
                                  setLayoutBlocks(layoutBlocks.map(b => 
                                    b.id === activeBlock.id ? { ...b, area: areaVal, w, h } : b
                                  ));
                                }}
                                className="w-20 border border-neutral-200 rounded p-1.5 font-bold"
                              />
                              <span className="font-semibold text-neutral-500">Acres (Auto Resize)</span>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-[10px] font-bold text-neutral-400 uppercase mb-1">Crop type</label>
                              <select
                                value={activeBlock.crop}
                                onChange={(e) => handleUpdateBlockField('crop', e.target.value)}
                                className="w-full border border-neutral-200 rounded p-1.5 font-semibold bg-white"
                              >
                                {cropOptions.map(c => (
                                  <option key={c} value={c}>{c}</option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label className="block text-[10px] font-bold text-neutral-400 uppercase mb-1">Soil Type</label>
                              <select
                                value={activeBlock.soil}
                                onChange={(e) => handleUpdateBlockField('soil', e.target.value)}
                                className="w-full border border-neutral-200 rounded p-1.5 font-semibold bg-white"
                              >
                                {['Loamy', 'Clayey', 'Sandy', 'Alluvial', 'Black', 'Red', 'Laterite', 'Desert'].map(s => (
                                  <option key={s} value={s}>{s}</option>
                                ))}
                              </select>
                            </div>
                          </div>

                          <div>
                            <label className="block text-[10px] font-bold text-neutral-400 uppercase mb-1">Irrigation Supply</label>
                            <select
                              value={activeBlock.irrigation}
                              onChange={(e) => handleUpdateBlockField('irrigation', e.target.value)}
                              className="w-full border border-neutral-200 rounded p-1.5 font-semibold bg-white"
                            >
                              {['Drip', 'Sprinkler', 'Canal Flood', 'Manual Rainfed'].map(i => (
                                <option key={i} value={i}>{i}</option>
                              ))}
                            </select>
                          </div>

                        </div>
                      )}

                      {/* Completed procedures Checklist tab */}
                      {activeBlock.type === 'field' && activeTab === 'procedures' && (
                        <div className="space-y-3">
                          <span className="block text-[10px] font-bold text-neutral-400 uppercase mb-1">Completed Farm tasks</span>
                          
                          <div className="space-y-2">
                            {[
                              { key: 'ploughing', label: 'Tillage & Deep Ploughing' },
                              { key: 'sowing', label: 'Crop Sowing completed' },
                              { key: 'weeding', label: 'Weeds removed / Spray' },
                              { key: 'harvesting', label: 'Final Harvest complete' }
                            ].map(task => (
                              <button
                                key={task.key}
                                type="button"
                                onClick={() => handleToggleProcedure(task.key)}
                                className="w-full flex items-center gap-2.5 p-2 rounded-lg border border-neutral-100 hover:bg-neutral-50 transition-all text-left"
                              >
                                <div className={`shrink-0 rounded p-0.5 ${
                                  activeBlock.procedures?.[task.key] ? 'text-emerald-600 bg-emerald-50' : 'text-neutral-300 bg-neutral-50'
                                }`}>
                                  <CheckCircle2 size={15} />
                                </div>
                                <span className={`font-semibold ${
                                  activeBlock.procedures?.[task.key] ? 'text-neutral-900 line-through decoration-neutral-300' : 'text-neutral-700'
                                }`}>
                                  {task.label}
                                </span>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Fertilizers added Tab */}
                      {activeBlock.type === 'field' && activeTab === 'fertilizers' && (
                        <div className="space-y-4">
                          
                          {/* Log Spawn form */}
                          <form onSubmit={handleAddFertilizer} className="bg-neutral-50 p-2.5 rounded-lg border border-neutral-200 space-y-2">
                            <span className="block text-[10px] font-bold text-emerald-800 uppercase tracking-wide">Record Fertilizer Feed</span>
                            <div className="grid grid-cols-2 gap-2">
                              <input
                                type="text"
                                required
                                placeholder="Type (e.g. NPK)"
                                value={fertName}
                                onChange={(e) => setFertName(e.target.value)}
                                className="border border-neutral-200 rounded p-1 w-full"
                              />
                              <input
                                type="text"
                                placeholder="Amount (e.g. 50kg)"
                                value={fertAmount}
                                onChange={(e) => setFertAmount(e.target.value)}
                                className="border border-neutral-200 rounded p-1 w-full"
                              />
                            </div>
                            <Button
                              type="submit"
                              className="w-full bg-neutral-900 hover:bg-neutral-800 text-[10px] py-1 rounded font-bold"
                            >
                              Add Log
                            </Button>
                          </form>

                          {/* Fertilizer List */}
                          <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                            {(!activeBlock.fertilizers || activeBlock.fertilizers.length === 0) ? (
                              <div className="text-center py-4 text-neutral-400 italic">No fertilizer logs captured yet.</div>
                            ) : (
                              activeBlock.fertilizers.map((fert) => (
                                <div key={fert.id} className="border border-neutral-100 bg-neutral-50/50 p-2 rounded-lg flex justify-between items-center">
                                  <div>
                                    <div className="font-bold text-neutral-800">{fert.name}</div>
                                    <div className="text-[9px] text-neutral-400 flex items-center gap-1 mt-0.5">
                                      <Calendar size={9} /> {fert.date} • {fert.amount}
                                    </div>
                                  </div>
                                  <button
                                    onClick={() => handleDeleteFertilizer(fert.id)}
                                    className="text-red-500 hover:text-red-400 p-1"
                                  >
                                    <Trash2 size={12} />
                                  </button>
                                </div>
                              ))
                            )}
                          </div>

                        </div>
                      )}

                      {/* Info Readout if element is Road / Water */}
                      {activeBlock.type !== 'field' && (
                        <div className="p-3 bg-neutral-50 rounded-lg border border-neutral-200 space-y-2 text-neutral-500">
                          <h5 className="font-bold text-neutral-700 flex items-center gap-1 capitalize">
                            {activeBlock.type === 'road' ? <Milestone size={14} /> : <Droplets size={14} />}
                            {activeBlock.type} Metadata
                          </h5>
                          <p>Infrastructure assets establish geographic routing boundaries relative to physical plots on the visual layout map.</p>
                        </div>
                      )}

                    </div>

                  </Card>
                </motion.div>
              )}
            </AnimatePresence>

          </div>
        </div>

      </div>

    </div>
  );
};

export default PlanningView;
