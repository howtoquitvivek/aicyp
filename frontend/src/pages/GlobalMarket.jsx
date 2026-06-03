import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { BarChart3, Search, RefreshCw, AlertTriangle, TrendingUp, Calendar as CalendarIcon, MapPin, SearchX } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import api from '../services/api';

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
};

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] } },
};

// Static list of commonly supported AGMARKNET commodities
const COMMON_CROPS = [
  'Wheat', 'Rice', 'Paddy(Dhan)', 'Cotton', 'Maize', 'Soyabean', 'Gram', 'Mustard', 'Onion', 'Potato', 'Tomato'
];

const chartTooltipStyle = {
  backgroundColor: '#ffffff',
  border: '1px solid #f1f5f9',
  borderRadius: '8px',
  color: '#0f172a',
  fontSize: '0.875rem',
  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
};

const GlobalMarket = () => {
  const [form, setForm] = useState({
    crop: 'Wheat',
    state: '',
    district: '',
    days: '30'
  });

  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  const fetchMarketHistory = async (e) => {
    if (e) e.preventDefault();
    if (!form.crop) return;

    setLoading(true);
    setError(null);
    try {
      const resp = await api.market.search(form.crop, form.state, form.district);
      const records = resp?.records || [];
      setData(records);
    } catch (err) {
      console.error('Failed to fetch market data:', err);
      setError('Failed to fetch market data from AGMARKNET. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMarketHistory();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => {
      const updated = { ...prev, [name]: value };
      if (name === 'state') {
        updated.district = '';
      }
      return updated;
    });
  };

  // Process data for charts
  const chartData = useMemo(() => {
    if (!data || data.length === 0) return [];
    
    const daysLimit = parseInt(form.days, 10);
    const now = new Date();
    const cutoffDate = new Date(now.getTime() - (daysLimit * 24 * 60 * 60 * 1000));
    
    // Group by date to find average modal price per day (in case of multiple mandis)
    const grouped = {};
    data.forEach(rec => {
      const dStr = rec.Arrival_Date || rec.arrival_date;
      if (!dStr) return;
      
      const parts = dStr.split('/');
      let dateObj;
      if (parts.length === 3) {
        dateObj = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
      } else {
        dateObj = new Date(dStr);
      }
      
      if (dateObj < cutoffDate) return;
      
      const isoDate = dateObj.toISOString().split('T')[0];
      if (!grouped[isoDate]) {
        grouped[isoDate] = { sum: 0, count: 0 };
      }
      const price = parseFloat(rec.Modal_Price || rec.modal_price || 0);
      if (price > 0) {
        grouped[isoDate].sum += price;
        grouped[isoDate].count += 1;
      }
    });

    const results = Object.keys(grouped).map(dateStr => {
      const g = grouped[dateStr];
      const avgPrice = g.count > 0 ? (g.sum / g.count) : 0;
      return {
        date: dateStr,
        displayDate: new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        price: Math.round(avgPrice)
      };
    }).sort((a, b) => new Date(a.date) - new Date(b.date));
    
    return results;
  }, [data, form.days]);

  // Process data for table
  const tableData = useMemo(() => {
    if (!data || data.length === 0) return [];
    const daysLimit = parseInt(form.days, 10);
    const now = new Date();
    const cutoffDate = new Date(now.getTime() - (daysLimit * 24 * 60 * 60 * 1000));
    
    return data.filter(rec => {
      const dStr = rec.Arrival_Date || rec.arrival_date;
      if (!dStr) return false;
      const parts = dStr.split('/');
      let dateObj = parts.length === 3 ? new Date(`${parts[2]}-${parts[1]}-${parts[0]}`) : new Date(dStr);
      return dateObj >= cutoffDate;
    }).slice(0, 50); // limit to 50 for display
  }, [data, form.days]);

  return (
    <motion.div className="max-w-6xl mx-auto space-y-8" variants={containerVariants} initial="hidden" animate="visible">
      {/* Header */}
      <motion.div className="flex flex-col md:flex-row md:items-center justify-between gap-4" variants={cardVariants}>
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight text-neutral-900">Market Intelligence</h1>
          <p className="text-neutral-500">Global AGMARKNET explorer. Query and analyze price trends.</p>
        </div>
      </motion.div>

      {/* Search Panel */}
      <motion.div variants={cardVariants}>
        <Card className="border border-neutral-200 shadow-sm">
          <CardContent className="p-6">
            <form onSubmit={fetchMarketHistory} className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
              <div className="space-y-2 md:col-span-1">
                <label className="text-sm font-medium text-neutral-700">Crop / Commodity *</label>
                <div className="relative">
                  <select
                    name="crop"
                    value={form.crop}
                    onChange={handleChange}
                    className="w-full h-10 pl-3 pr-8 rounded-md border border-neutral-300 bg-white text-sm outline-none focus:ring-2 focus:ring-emerald-500 appearance-none"
                    required
                  >
                    {COMMON_CROPS.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              <div className="space-y-2 md:col-span-1">
                <label className="text-sm font-medium text-neutral-700">State (Optional)</label>
                <div className="relative">
                  <select
                    name="state"
                    value={form.state}
                    onChange={handleChange}
                    className="w-full h-10 pl-3 pr-8 rounded-md border border-neutral-300 bg-white text-sm outline-none focus:ring-2 focus:ring-emerald-500 appearance-none"
                  >
                    <option value="">All States</option>
                    {[
                      "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", 
                      "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka", 
                      "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram", 
                      "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", 
                      "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal", "Andaman and Nicobar", 
                      "Chandigarh", "Dadra and Nagar Haveli", "Daman and Diu", "Delhi", 
                      "Jammu and Kashmir", "Ladakh", "Lakshadweep", "Puducherry"
                    ].sort().map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>


              <div className="space-y-2 md:col-span-1">
                <label className="text-sm font-medium text-neutral-700">District (Optional)</label>
                {['Madhya Pradesh', 'Maharashtra', 'Uttar Pradesh', 'Punjab', 'Gujarat', 'Haryana'].includes(form.state) ? (
                  <div className="relative">
                    <select
                      name="district"
                      value={form.district}
                      onChange={handleChange}
                      className="w-full h-10 pl-3 pr-8 rounded-md border border-neutral-300 bg-white text-sm outline-none focus:ring-2 focus:ring-emerald-500 appearance-none"
                    >
                      <option value="">All Districts</option>
                      {form.state === 'Madhya Pradesh' && ['Bhopal', 'Indore', 'Jabalpur', 'Gwalior', 'Ujjain', 'Sagar', 'Rewa'].map(d => <option key={d} value={d}>{d}</option>)}
                      {form.state === 'Maharashtra' && ['Mumbai', 'Pune', 'Nagpur', 'Nashik', 'Aurangabad', 'Solapur', 'Amravati'].map(d => <option key={d} value={d}>{d}</option>)}
                      {form.state === 'Uttar Pradesh' && ['Lucknow', 'Kanpur', 'Varanasi', 'Agra', 'Meerut', 'Prayagraj', 'Gorakhpur'].map(d => <option key={d} value={d}>{d}</option>)}
                      {form.state === 'Punjab' && ['Ludhiana', 'Amritsar', 'Jalandhar', 'Patiala', 'Bathinda', 'Hoshiarpur', 'Mohali'].map(d => <option key={d} value={d}>{d}</option>)}
                      {form.state === 'Gujarat' && ['Ahmedabad', 'Surat', 'Vadodara', 'Rajkot', 'Bhavnagar', 'Jamnagar', 'Gandhinagar'].map(d => <option key={d} value={d}>{d}</option>)}
                      {form.state === 'Haryana' && ['Faridabad', 'Gurugram', 'Panipat', 'Ambala', 'Yamunanagar', 'Rohtak', 'Hisar'].map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>
                ) : (
                  <Input
                    type="text" name="district" value={form.district} onChange={handleChange}
                    placeholder="e.g. Jabalpur" className="h-10"
                  />
                )}
              </div>

              
              <div className="space-y-2 md:col-span-1">
                <label className="text-sm font-medium text-neutral-700">Date Range</label>
                <select
                  name="days"
                  value={form.days}
                  onChange={handleChange}
                  className="w-full h-10 px-3 rounded-md border border-neutral-300 bg-white text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="7">Last 7 Days</option>
                  <option value="30">Last 30 Days</option>
                  <option value="90">Last 90 Days</option>
                </select>
              </div>

              <div className="md:col-span-1">
                <Button type="submit" disabled={loading} className="w-full h-10 bg-neutral-900 text-white hover:bg-neutral-800">
                  {loading ? <RefreshCw className="animate-spin h-4 w-4 mr-2" /> : <Search className="h-4 w-4 mr-2" />}
                  Search
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </motion.div>

      {/* Results Section */}
      {error && (
        <motion.div variants={cardVariants} className="p-4 bg-red-50 text-red-700 border border-red-200 rounded-xl flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
          <p className="text-sm">{error}</p>
        </motion.div>
      )}

      {loading && !data && (
        <div className="py-20 flex flex-col items-center justify-center text-neutral-500 space-y-4">
          <RefreshCw className="animate-spin h-8 w-8 text-emerald-600" />
          <p>Querying AGMARKNET Data Hub...</p>
        </div>
      )}

      {!loading && data && data.length === 0 && !error && (
        <motion.div variants={cardVariants} className="py-20 flex flex-col items-center text-center text-neutral-500">
          <div className="h-16 w-16 bg-neutral-100 text-neutral-400 rounded-full flex items-center justify-center mb-4">
            <SearchX size={32} />
          </div>
          <h3 className="text-lg font-semibold text-neutral-800">No Records Found</h3>
          <p className="max-w-md mx-auto mt-1">No AGMARKNET records were found for {form.crop} in {form.state || 'India'} over the selected time period.</p>
        </motion.div>
      )}

      {!loading && data && data.length > 0 && chartData.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <motion.div variants={cardVariants} className="lg:col-span-2">
            <Card className="h-full border border-neutral-200 shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <TrendingUp className="h-5 w-5 text-emerald-600" /> Price Trends
                </CardTitle>
                <CardDescription>Average modal price across matching mandis.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorPriceGlobal" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#059669" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#059669" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <XAxis dataKey="displayDate" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dy={10} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} tickFormatter={(val) => `₹${val}`} />
                      <Tooltip contentStyle={chartTooltipStyle} formatter={(val) => [`₹${val}/qtl`, 'Avg Price']} labelStyle={{ fontWeight: 'bold', color: '#0f172a', marginBottom: '4px' }} />
                      <Area type="monotone" dataKey="price" stroke="#059669" strokeWidth={3} fillOpacity={1} fill="url(#colorPriceGlobal)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={cardVariants} className="lg:col-span-1">
            <Card className="h-full border border-neutral-200 shadow-sm overflow-hidden flex flex-col">
              <CardHeader className="bg-neutral-50 border-b border-neutral-100 shrink-0">
                <CardTitle className="text-base flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-emerald-600" /> Recent Arrivals
                </CardTitle>
              </CardHeader>
              <div className="flex-1 overflow-auto p-0">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-neutral-500 uppercase bg-neutral-50 sticky top-0 border-b border-neutral-200">
                    <tr>
                      <th className="px-4 py-3 font-medium">Mandi</th>
                      <th className="px-4 py-3 font-medium">Date</th>
                      <th className="px-4 py-3 font-medium text-right">Modal (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {tableData.map((rec, i) => (
                      <tr key={i} className="hover:bg-neutral-50 transition-colors">
                        <td className="px-4 py-3">
                          <p className="font-medium text-neutral-900 truncate max-w-[120px]">{rec.Market || rec.market}</p>
                          <p className="text-xs text-neutral-500 truncate max-w-[120px]">{rec.State || rec.state}</p>
                        </td>
                        <td className="px-4 py-3 text-neutral-600 whitespace-nowrap">
                          {rec.Arrival_Date || rec.arrival_date}
                        </td>
                        <td className="px-4 py-3 text-right font-medium text-emerald-700">
                          {rec.Modal_Price || rec.modal_price}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </motion.div>
        </div>
      )}
    </motion.div>
  );
};

export default GlobalMarket;
