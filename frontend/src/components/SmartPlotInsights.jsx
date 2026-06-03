import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from './ui/Card';
import { Sparkles, Loader2, AlertCircle } from 'lucide-react';
import api from '../services/api';

const SmartPlotInsights = ({ plotData }) => {
  const [insights, setInsights] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;
    
    const fetchInsights = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await api.ai.getPlotInsights(plotData);
        if (isMounted) {
          setInsights(data.insights || []);
        }
      } catch (err) {
        console.error('AI Insights Error:', err);
        // Fallback deterministic insights
        if (isMounted) {
          const fallback = [];
          if (plotData.temperature > 35) {
            fallback.push(`Current temperature (${plotData.temperature}°C) is above the ideal range for ${plotData.crop}.`);
          }
          if (plotData.areaSharePercent) {
            fallback.push(`This plot contributes ${plotData.areaSharePercent}% of total farm acreage.`);
          }
          fallback.push(`${plotData.soilType} soil is generally favorable for ${plotData.crop} cultivation.`);
          if (plotData.marketPrice) {
            fallback.push(`Current market price is ₹${plotData.marketPrice}/qtl.`);
          }
          if (plotData.expectedYield) {
            fallback.push(`Estimated yield is ${plotData.expectedYield} tons per acre.`);
          }
          setInsights(fallback.slice(0, 4));
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    if (plotData) {
      fetchInsights();
    }

    return () => { isMounted = false; };
  }, [plotData]);

  return (
    <Card className="h-full flex flex-col bg-emerald-50/30 border-emerald-100 shadow-sm">
      <CardHeader className="border-b border-emerald-100 pb-4">
        <CardTitle className="flex items-center gap-2 text-emerald-800">
          <Sparkles size={18} className="text-emerald-600" /> Smart Plot Insights
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 p-5 flex flex-col justify-center">
        {loading ? (
          <div className="flex flex-col items-center justify-center text-emerald-600 space-y-3 h-full min-h-[120px]">
            <Loader2 size={24} className="animate-spin" />
            <span className="text-sm font-medium animate-pulse">Generating plot insights...</span>
          </div>
        ) : (
          <ul className="space-y-3 text-sm text-neutral-700 font-medium">
            {insights.map((insight, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <span className="text-emerald-600 mt-0.5">•</span>
                <span>{insight}</span>
              </li>
            ))}
            {insights.length === 0 && !loading && (
              <li className="flex items-center gap-2 text-neutral-500 justify-center h-full">
                <AlertCircle size={16} /> No insights available.
              </li>
            )}
          </ul>
        )}
      </CardContent>
    </Card>
  );
};

export default SmartPlotInsights;
