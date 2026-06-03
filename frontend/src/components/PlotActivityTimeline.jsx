import React from 'react';
import { useAuth } from '../store/AuthContext';
import { useWorkspace } from '../store/WorkspaceContext';
import { Card, CardHeader, CardTitle, CardContent } from './ui/Card';
import { Activity, Circle, CheckCircle2, Map, LineChart, FileText, CloudRain } from 'lucide-react';
import { motion } from 'framer-motion';

const getRelativeTimeGroup = (timestamp) => {
  const d = new Date(timestamp);
  const now = new Date();
  
  // Reset times to start of day for accurate day-diffing
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
  
  if (!activePlot || !userDoc || !userDoc.timeline) {
    return null;
  }

  // Filter events by active plot, sort by timestamp desc, limit 10
  const events = userDoc.timeline
    .filter(e => e.plotId === activePlot.id)
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    .slice(0, 10);

  if (events.length === 0) {
    return null;
  }

  // Group events by relative time
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
    <Card className="border border-neutral-200 shadow-sm overflow-hidden h-full">
      <CardHeader className="bg-neutral-50/50 pb-4 border-b border-neutral-100">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <Activity size={18} className="text-emerald-600" /> Recent Activity
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="max-h-[400px] overflow-y-auto p-5 space-y-6 custom-scrollbar">
          {groupedEvents.map((group, idx) => (
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
                    {/* Connection line */}
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
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default PlotActivityTimeline;
