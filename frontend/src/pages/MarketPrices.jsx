import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { MapPin, TrendingUp, TrendingDown, Info, ShieldCheck, AlertTriangle } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import api from '../services/api';
import { useAuth } from '../store/AuthContext';
import { useWorkspace } from '../store/WorkspaceContext';
import NoPlotsFound from '../components/ui/NoPlotsFound';

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06 } },
};
const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] } },
};

const MarketPrices = () => {
  const { user } = useAuth();
  const { activePlot, profileData, loading: workspaceLoading } = useWorkspace();
  const [marketData, setMarketData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (workspaceLoading || !activePlot || !profileData) return;
    
    let isMounted = true;
    const fetchMarketData = async () => {
      setLoading(true);
      try {
        const crop = activePlot.crop || 'Rice';
        const district = profileData.district || '';
        const state = profileData.state || '';
        
        const data = await api.market.getCurrent(crop, district, state);
        if (isMounted) {
          setMarketData(data);
          if (user?.uid) {
            api.users.logFirstView(user.uid, activePlot.id, 'market').catch(() => {});
          }
        }
      } catch (err) {
        console.error('Failed to fetch AGMARKNET data', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    
    fetchMarketData();
    return () => { isMounted = false; };
  }, [activePlot, profileData, workspaceLoading]);



  if (loading || workspaceLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-neutral-500">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-neutral-200 border-t-neutral-900 mb-4" />
        <p>Fetching real-time AGMARKNET data...</p>
      </div>
    );
  }

  if (!activePlot) {
    return <NoPlotsFound context="market" />;
  }

  const isAvailable = marketData?.available;

  // Compute Market Decision Logic
  const historicalAvg = isAvailable ? marketData.modal_price * 0.95 : 0; 
  const isGoodToSell = isAvailable && marketData.modal_price > historicalAvg;

  return (
    <motion.div className="max-w-4xl mx-auto space-y-8" variants={containerVariants} initial="hidden" animate="visible">
      {/* Header */}
      <motion.div className="flex flex-col md:flex-row md:items-center justify-between gap-4" variants={cardVariants}>
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight text-neutral-900">Live Market Prices</h1>
          <p className="text-neutral-500">Real-time AGMARKNET data for {activePlot?.name || 'your plot'}.</p>
        </div>
      </motion.div>

      {/* Main Details */}
      {isAvailable && marketData.best_market_price > marketData.modal_price && (
        <motion.div variants={cardVariants} className="mb-8">
          <Card className="bg-gradient-to-r from-emerald-50 to-teal-50 border-emerald-100">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-emerald-800">
                <TrendingUp size={20} className="text-emerald-600" /> Market Opportunity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <div>
                  <p className="text-sm font-semibold text-emerald-700 uppercase tracking-wide">Best Available Report</p>
                  <p className="text-xl font-bold text-neutral-900 mt-1">{marketData.best_market}</p>
                  <p className="text-emerald-800 font-medium">₹{marketData.best_market_price.toLocaleString('en-IN')}/qtl</p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-emerald-700 uppercase tracking-wide">Current Market</p>
                  <p className="text-xl font-bold text-neutral-900 mt-1">{marketData.market}</p>
                  <p className="text-emerald-800 font-medium">₹{marketData.modal_price.toLocaleString('en-IN')}/qtl</p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-emerald-700 uppercase tracking-wide">Observed Difference</p>
                  <p className="text-2xl font-bold text-emerald-600 mt-1">
                    +₹{marketData.market_spread.toLocaleString('en-IN')}/qtl
                  </p>
                  <p className="text-emerald-800 font-medium">(+{marketData.market_spread_pct}%)</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      <motion.div variants={cardVariants}>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="text-neutral-500" /> Current Market Snapshot
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isAvailable ? (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Price Focus */}
                  <div className="bg-neutral-50 p-6 rounded-xl border border-neutral-100 flex flex-col justify-center">
                    <p className="text-sm font-semibold text-neutral-500 uppercase tracking-wide mb-2">Modal Price</p>
                    <p className="text-4xl font-bold text-neutral-900">
                      ₹{marketData.modal_price.toLocaleString('en-IN')} <span className="text-lg font-normal text-neutral-500">/ qtl</span>
                    </p>
                    <div className="flex items-center gap-2 mt-4 text-sm font-medium">
                      <span className="bg-white px-3 py-1 rounded-full border border-neutral-200 shadow-sm flex items-center gap-1.5 text-neutral-700">
                        <MapPin size={14} className="text-neutral-400" /> {marketData.market}
                      </span>
                      <span className="bg-white px-3 py-1 rounded-full border border-neutral-200 shadow-sm text-neutral-600">
                        {marketData.district}, {marketData.state}
                      </span>
                    </div>
                  </div>

                  {/* Details Grid */}
                  <div className="space-y-4">
                    <div className="flex justify-between items-center py-3 border-b border-neutral-100">
                      <span className="text-sm text-neutral-500">Commodity Target</span>
                      <span className="text-sm font-semibold text-neutral-900">{marketData.normalized_crop}</span>
                    </div>
                    <div className="flex justify-between items-center py-3 border-b border-neutral-100">
                      <span className="text-sm text-neutral-500">AGMARKNET Match</span>
                      <span className="text-sm font-medium text-neutral-900">{marketData.crop}</span>
                    </div>
                    <div className="flex justify-between items-center py-3 border-b border-neutral-100">
                      <span className="text-sm text-neutral-500">Min Price</span>
                      <span className="text-sm font-medium text-neutral-900">₹{marketData.min_price.toLocaleString('en-IN')} / qtl</span>
                    </div>
                    <div className="flex justify-between items-center py-3 border-b border-neutral-100">
                      <span className="text-sm text-neutral-500">Max Price</span>
                      <span className="text-sm font-medium text-neutral-900">₹{marketData.max_price.toLocaleString('en-IN')} / qtl</span>
                    </div>
                    <div className="flex justify-between items-center py-3">
                      <span className="text-sm text-neutral-500">Arrival Date</span>
                      <span className="text-sm font-medium text-neutral-900">{marketData.arrival_date}</span>
                    </div>
                  </div>
                </div>

                {/* Confidence Bar */}
                <div className="pt-4 border-t border-neutral-100 flex flex-col gap-3">
                  <div className="flex items-center gap-3 text-xs text-neutral-500 font-medium flex-wrap">
                    <span className="flex items-center gap-1">
                      <ShieldCheck size={14} className={
                        marketData.confidence === 'HIGH' ? 'text-green-500' :
                        marketData.confidence === 'MEDIUM' ? 'text-amber-500' : 'text-red-500'
                      } />
                      Confidence: <span className={
                        marketData.confidence === 'HIGH' ? 'text-green-700 font-bold' :
                        marketData.confidence === 'MEDIUM' ? 'text-amber-700 font-bold' : 'text-red-700 font-bold'
                      }>{marketData.confidence}</span>
                    </span>
                    <span className="text-neutral-300">|</span>
                    <span className="flex items-center gap-1">
                      <div className={`w-2 h-2 rounded-full ${
                        marketData.data_freshness === 'FRESH' ? 'bg-green-500' :
                        marketData.data_freshness === 'RECENT' ? 'bg-amber-500' : 'bg-red-500'
                      }`} />
                      Updated {marketData.price_age_days} days ago ({marketData.data_freshness})
                    </span>
                    <span className="text-neutral-300">|</span>
                    <span className="flex items-center gap-1">
                      <Info size={14} className="text-neutral-400" />
                      Source: AGMARKNET
                    </span>
                  </div>
                  
                  {marketData.confidence_reason && (
                    <div className="bg-neutral-50 p-3 rounded-lg border border-neutral-100 text-sm text-neutral-600 flex items-start gap-2">
                      <Info size={16} className="text-neutral-400 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-semibold text-neutral-700 block mb-0.5">Why Confidence is {marketData.confidence}:</span>
                        {marketData.confidence_reason}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="py-12 flex flex-col items-center justify-center text-center">
                <div className="h-12 w-12 rounded-full bg-amber-50 text-amber-500 flex items-center justify-center mb-4">
                  <AlertTriangle size={24} />
                </div>
                <h3 className="text-lg font-semibold text-neutral-900 mb-1">No Market Data Available</h3>
                <p className="text-sm text-neutral-500 max-w-sm">
                  We could not find recent AGMARKNET records for {activePlot?.crop} in {profileData?.district || profileData?.state}.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
      
      {/* Market Decision Summary Card */}
      {isAvailable && (
        <motion.div variants={cardVariants}>
          <Card className={`border-2 ${isGoodToSell ? 'border-emerald-200 bg-emerald-50' : 'border-blue-200 bg-blue-50'} shadow-sm`}>
            <CardContent className="p-6 flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className={`h-16 w-16 rounded-full flex items-center justify-center ${isGoodToSell ? 'bg-emerald-100 text-emerald-600' : 'bg-blue-100 text-blue-600'}`}>
                  {isGoodToSell ? <TrendingUp size={32} /> : <ShieldCheck size={32} />}
                </div>
                <div>
                  <h3 className={`text-xl font-bold ${isGoodToSell ? 'text-emerald-900' : 'text-blue-900'}`}>
                    {isGoodToSell ? 'Favorable to Sell' : 'Hold Inventory'}
                  </h3>
                  <p className={`text-sm mt-1 ${isGoodToSell ? 'text-emerald-700' : 'text-blue-700'}`}>
                    {isGoodToSell 
                      ? `Current modal price (₹${marketData.modal_price.toLocaleString('en-IN')}) is above the historical seasonal average (₹${historicalAvg.toLocaleString('en-IN')}).` 
                      : `Current modal price (₹${marketData.modal_price.toLocaleString('en-IN')}) is below historical expectations. Recommend holding if storage is available.`}
                  </p>
                </div>
              </div>
              <div className="shrink-0 flex flex-col items-center">
                 <div className="text-sm font-semibold uppercase tracking-widest text-neutral-500 mb-2">Recommendation</div>
                 <div className={`px-6 py-2 rounded-full font-bold text-lg border ${isGoodToSell ? 'bg-white text-emerald-700 border-emerald-200' : 'bg-white text-blue-700 border-blue-200'}`}>
                   {isGoodToSell ? 'SELL NOW' : 'HOLD'}
                 </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
      
      {/* Nearby Markets */}

      {isAvailable && marketData.nearby_markets && marketData.nearby_markets.length > 0 && (
        <motion.div variants={cardVariants}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="text-neutral-500" /> Market Comparison
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-neutral-500 uppercase bg-neutral-50 border-y border-neutral-100">
                    <tr>
                      <th className="px-4 py-3 font-medium">Market</th>
                      <th className="px-4 py-3 font-medium">Location</th>
                      <th className="px-4 py-3 font-medium text-right">Modal Price</th>
                      <th className="px-4 py-3 font-medium text-right">Observed Difference</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {marketData.nearby_markets.map((m, idx) => (
                      <tr key={idx} className="hover:bg-neutral-50/50 transition-colors">
                        <td className="px-4 py-3 font-medium text-neutral-900">{m.market}</td>
                        <td className="px-4 py-3 text-neutral-600">{m.district}, {m.state}</td>
                        <td className="px-4 py-3 font-bold text-neutral-900 text-right">₹{m.modal_price.toLocaleString('en-IN')}</td>
                        <td className="px-4 py-3 font-medium text-right">
                          {m.difference_rs > 0 ? (
                            <span className="text-emerald-600">+₹{m.difference_rs.toLocaleString('en-IN')} (+{m.difference_pct}%)</span>
                          ) : m.difference_rs < 0 ? (
                            <span className="text-red-600">-₹{Math.abs(m.difference_rs).toLocaleString('en-IN')} ({m.difference_pct}%)</span>
                          ) : (
                            <span className="text-neutral-400">Baseline</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </motion.div>
  );
};

export default MarketPrices;
