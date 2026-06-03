import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../store/AuthContext';
import { useWorkspace } from '../store/WorkspaceContext';
import { Card, CardHeader, CardTitle, CardContent } from './ui/Card';
import { Bell, Activity, Circle, CheckCircle2, Map, LineChart, FileText, CloudRain } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const getRelativeTimeGroup = (timestamp) => {
  const d = new Date(timestamp);
  const now = new Date();
  
  const dDate = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const nowDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  const diffTime = Math.abs(nowDate - dDate);
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)); 
  
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const getEventIcon = (type) => {
  switch (type) {
    case 'plot_created': return <Map size={16} className="text-emerald-500" />;
    case 'recommendation_generated': return <CheckCircle2 size={16} className="text-purple-500" />;
    case 'yield_plan_saved': return <LineChart size={16} className="text-amber-500" />;
    case 'first_weather_view': return <CloudRain size={16} className="text-blue-500" />;
    case 'first_market_view': return <FileText size={16} className="text-teal-500" />;
    default: return <Activity size={16} className="text-neutral-400" />;
  }
};

const PlotActivityTimeline = ({ userDoc }) => {
  const { activePlot } = useWorkspace();
  const [isOpen, setIsOpen] = useState(false);
  const [hasNew, setHasNew] = useState(false);
  const panelRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (panelRef.current && !panelRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  
  if (!activePlot || !userDoc || !userDoc.timeline) {
    return null;
  }

  const events = userDoc.timeline
    .filter(e => e.plotId === activePlot.id)
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    .filter((event, index, self) => index === self.findIndex((t) => t.summary === event.summary))
    .slice(0, 6);

  useEffect(() => {
    if (events.length > 0) {
      const lastViewed = localStorage.getItem(`activity_viewed_${activePlot.id}`);
      const latestEventTime = new Date(events[0].timestamp).getTime();
      if (!lastViewed || latestEventTime > parseInt(lastViewed)) {
        setHasNew(true);
      }
    }
  }, [events, activePlot]);

  const togglePanel = () => {
    if (!isOpen) {
      if (events.length > 0) {
        localStorage.setItem(`activity_viewed_${activePlot.id}`, new Date(events[0].timestamp).getTime().toString());
        setHasNew(false);
      }
    }
    setIsOpen(!isOpen);
  };

  const groupedEvents = [];
  events.forEach(event => {
    const group = getRelativeTimeGroup(event.timestamp);
    const lastGroup = groupedEvents[groupedEvents.length - 1];
    
    if (lastGroup && lastGroup.title === group) {
      lastGroup.events.push(event);
    } else {
      groupedEvents.push({ title: group, events: [event] });
    }
  });

  return (
    <div className="relative z-50" ref={panelRef}>
      <button 
        onClick={togglePanel}
        className="p-2.5 bg-white border border-neutral-200 rounded-full hover:bg-neutral-50 shadow-sm relative transition-all"
        title="Recent Activity"
      >
        <Bell size={18} className="text-neutral-700" />
        {hasNew && (
          <span className="absolute top-0.5 right-0.5 w-2.5 h-2.5 bg-red-500 border-2 border-white rounded-full"></span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full mt-2 w-80 bg-white border border-neutral-200 shadow-xl rounded-xl overflow-hidden"
          >
            <div className="bg-neutral-50/50 p-4 border-b border-neutral-100 flex justify-between items-center">
              <h3 className="text-sm font-semibold flex items-center gap-2 text-neutral-900">
                <Activity size={16} className="text-emerald-600" /> Recent Activity
              </h3>
            </div>
            <div className="max-h-[400px] overflow-y-auto p-5 space-y-6 custom-scrollbar">
              {events.length === 0 ? (
                <p className="text-xs text-neutral-500 text-center py-4">No recent activity.</p>
              ) : (
                groupedEvents.map((group, idx) => (
                  <div key={idx}>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-400 mb-3">{group.title}</h4>
                    <div className="space-y-4">
                      {group.events.map((event, i) => (
                        <motion.div 
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.05 }}
                          key={event.id} 
                          className="flex gap-3 items-start relative"
                        >
                          {i !== group.events.length - 1 && (
                            <div className="absolute left-[11px] top-6 bottom-[-16px] w-[2px] bg-neutral-100" />
                          )}
                          <div className="mt-0.5 bg-white rounded-full p-1 border border-neutral-100 shadow-sm z-10 relative">
                            {getEventIcon(event.type)}
                          </div>
                          <div className="flex-1 pb-1">
                            <p className="text-sm font-medium text-neutral-800 leading-snug">{event.summary}</p>
                            <span className="text-[11px] text-neutral-400 mt-0.5 block">
                              {new Date(event.timestamp).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                            </span>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default PlotActivityTimeline;
