import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sprout, Globe, Compass, Droplet, Check,
  ArrowRight, ArrowLeft, Loader2, Info
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { useAuth } from '../store/AuthContext';
import api from '../services/api';

const SOIL_TEMPLATES = {
  Loamy: { n: 50, p: 40, k: 40, ph: 6.5, desc: 'Rich in organic matter, balanced moisture retention, highly versatile.' },
  Clayey: { n: 40, p: 30, k: 50, ph: 7.0, desc: 'High water retention capacity, heavy density, nutrient-rich.' },
  Sandy: { n: 20, p: 20, k: 20, ph: 5.8, desc: 'Coarse texture, quick drainage, requires regular fertilization.' },
  'Black Cotton': { n: 60, p: 50, k: 60, ph: 7.5, desc: 'High dark-clay mineral content, extremely rich, ideal for cotton/grains.' }
};

const Onboarding = () => {
  const { user, completeOnboarding } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [suggestedCrops, setSuggestedCrops] = useState([
    'Rice', 'Wheat', 'Cotton', 'Sugarcane', 'Maize',
    'Tomato', 'Soybean', 'Potato', 'Mustard', 'Groundnut'
  ]);

  useEffect(() => {
    const fetchCrops = async () => {
      try {
        const data = await api.datasets.getCrops();
        if (data && data.length > 0) {
          setSuggestedCrops(data.map(c => c.name));
        }
      } catch (err) {
        console.error('Failed to load crops from dataset API, falling back:', err);
      }
    };
    fetchCrops();
  }, []);

  // Step 1: Regional Info
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [state, setState] = useState('');
  const [district, setDistrict] = useState('');
  const [village, setVillage] = useState('');
  const [language, setLanguage] = useState('English');

  // Step 2: Farming Goals
  const [farmName, setFarmName] = useState(`${displayName || 'My'} Farm`);
  const [experienceLevel, setExperienceLevel] = useState('');
  const [farmingGoal, setFarmingGoal] = useState('');
  const [cropInterests, setCropInterests] = useState([]);
  const [cropInput, setCropInput] = useState('');

  const toggleCropInterest = (cropName) => {
    if (cropInterests.includes(cropName)) {
      setCropInterests(cropInterests.filter(c => c !== cropName));
    } else {
      setCropInterests([...cropInterests, cropName]);
    }
  };

  const handleAddCustomCrop = (e) => {
    e.preventDefault();
    const cleanCrop = cropInput.trim();
    if (cleanCrop && !cropInterests.includes(cleanCrop)) {
      setCropInterests([...cropInterests, cleanCrop]);
      setCropInput('');
    }
  };

  const handleNext = () => {
    setError('');
    if (step === 1) {
      if (!displayName.trim()) return setError('Please enter your name.');
      if (!state.trim()) return setError('Please select your state.');
      if (!district.trim()) return setError('Please enter your city or district.');
      setFarmName(`${displayName}'s Farm`);
      setStep(2);
    }
  };

  const handleBack = () => {
    setError('');
    setStep(step - 1);
  };

  const handleSkip = () => {
    navigate('/dashboard');
  };

  const handleSubmit = async () => {
    if (!farmName.trim()) return setError('Please enter a farm name.');
    if (!experienceLevel) return setError('Please select an experience level.');
    if (!farmingGoal) return setError('Please select a farming goal.');

    setLoading(true);
    setError('');

    try {
      // 1. Save Profile info
      await api.users.saveProfile(user.uid, {
        display_name: displayName,
        phone: '',
        state,
        district,
        village
      });

      // 2. Save Farm info (No plots created initially)
      await api.users.saveFarm(user.uid, {
        farm_name: farmName,
        plots: []
      });

      // 3. Save Preferences
      await api.users.savePreferences(user.uid, {
        language,
        experience_level: experienceLevel,
        farming_goal: farmingGoal,
        crop_interests: cropInterests,
        notifications: true,
        email_alerts: true,
        price_alerts: true,
        weather_alerts: true,
        weekly_report: false
      });

      // Navigate to dashboard
      completeOnboarding();
      navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'Failed to save configuration. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#070D09] text-neutral-100 flex flex-col justify-between p-6 sm:p-12 relative overflow-hidden select-none">
      {/* Background Organic Radial Glow */}
      <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-emerald-950/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] rounded-full bg-neutral-900/20 blur-[120px] pointer-events-none" />

      {/* Header Bar */}
      <header className="flex justify-between items-center w-full max-w-6xl mx-auto z-10">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white shadow-lg shadow-emerald-900/20">
            <Sprout size={18} />
          </div>
          <span className="font-semibold text-lg tracking-wider uppercase text-neutral-200">AgriBrain</span>
        </div>

        <div className="flex flex-col items-end gap-1">
          <button
            onClick={handleSkip}
            className="text-sm font-medium text-neutral-400 hover:text-white transition-colors cursor-pointer"
          >
            Skip Calibration
          </button>
          <span className="text-[10px] text-neutral-500 max-w-[200px] text-right">
            Skip for now. You can calibrate later from Profile Settings.
          </span>
        </div>
      </header>

      {/* Main Wizard Form Container */}
      <main className="w-full max-w-2xl mx-auto my-12 z-10 flex-1 flex flex-col justify-center">
        {/* Progress Tracker */}
        <div className="flex items-center gap-3 mb-10">
          {[1, 2].map((s) => (
            <React.Fragment key={s}>
              <div className="flex items-center gap-2">
                <div
                  className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-semibold border transition-all duration-300 ${
                    s === step
                      ? 'bg-emerald-600 border-emerald-500 text-white shadow-md shadow-emerald-950'
                      : s < step
                      ? 'bg-emerald-900/20 border-emerald-800 text-emerald-400'
                      : 'bg-neutral-900/50 border-neutral-800 text-neutral-500'
                  }`}
                >
                  {s < step ? <Check size={12} /> : s}
                </div>
                <span
                  className={`text-xs font-semibold tracking-wider uppercase ${
                    s === step ? 'text-neutral-200' : 'text-neutral-500'
                  }`}
                >
                  {s === 1 ? 'Region' : 'Farm'}
                </span>
              </div>
              {s < 2 && <div className="h-[1px] flex-1 bg-neutral-800" />}
            </React.Fragment>
          ))}
        </div>

        {/* Step Content with Framer Motion Animation */}
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 15 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -15 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="space-y-6"
          >
            {error && (
              <div className="bg-red-950/20 border border-red-900/40 text-red-400 px-4 py-3 rounded-lg text-sm font-medium flex items-center gap-2 animate-shake">
                <Info size={16} />
                {error}
              </div>
            )}

            {/* STEP 1: REGIONAL CALIBRATION */}
            {step === 1 && (
              <div className="space-y-6">
                <div className="space-y-1 text-left">
                  <h2 className="text-2xl font-bold tracking-tight text-white">Region & Profile Calibration</h2>
                  <p className="text-neutral-400 text-sm">
                    Enter your location to sync local weather forecasts and regional market prices.
                  </p>
                </div>

                <div className="space-y-4">
                  <Input
                    label="What is your full name?"
                    placeholder="Enter your name"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    icon={Globe}
                    className="bg-neutral-900/50 border-neutral-800 text-white placeholder-neutral-600 focus:border-emerald-600 focus:ring-emerald-900/20"
                  />

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-2 text-left">
                      <label className="text-xs font-semibold tracking-wider text-neutral-500 uppercase">State</label>
                      <select
                        value={state}
                        onChange={(e) => setState(e.target.value)}
                        className="flex h-10 w-full rounded-md border border-neutral-800 bg-neutral-900/50 px-3 py-2 text-sm text-neutral-200 focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-900/20"
                      >
                        <option value="" disabled className="bg-neutral-950 text-neutral-500">Select state</option>
                        {['Andhra Pradesh', 'Bihar', 'Gujarat', 'Haryana', 'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Punjab', 'Rajasthan', 'Tamil Nadu', 'Telangana', 'Uttar Pradesh', 'West Bengal'].map((s) => (
                          <option key={s} value={s} className="bg-neutral-950 text-neutral-200">{s}</option>
                        ))}
                      </select>
                    </div>

                    <Input
                      label="District"
                      placeholder="e.g. Nashik"
                      value={district}
                      onChange={(e) => setDistrict(e.target.value)}
                      icon={Compass}
                      className="bg-neutral-900/50 border-neutral-800 text-white placeholder-neutral-600 focus:border-emerald-600 focus:ring-emerald-900/20"
                    />

                    <Input
                      label="Village / Town"
                      placeholder="e.g. Niphad"
                      value={village}
                      onChange={(e) => setVillage(e.target.value)}
                      icon={Compass}
                      className="bg-neutral-900/50 border-neutral-800 text-white placeholder-neutral-600 focus:border-emerald-600 focus:ring-emerald-900/20"
                    />
                  </div>

                  <div className="space-y-2 text-left">
                    <label className="text-xs font-semibold tracking-wider text-neutral-500 uppercase">Preferred Language</label>
                    <select
                      value={language}
                      onChange={(e) => setLanguage(e.target.value)}
                      className="flex h-10 w-full rounded-md border border-neutral-800 bg-neutral-900/50 px-3 py-2 text-sm text-neutral-200 focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-900/20"
                    >
                      {['English', 'हिन्दी', 'मराठी', 'தமிழ்', 'తెలుగు'].map((l) => (
                        <option key={l} value={l} className="bg-neutral-950 text-neutral-200">{l}</option>
                      ))}
                    </select>
                    <p className="text-[10px] text-neutral-500 leading-snug">
                      This calibrates the voice assistant and smart notification reports to your dialect.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 2: FARM PROFILE */}
            {step === 2 && (
              <div className="space-y-6">
                <div className="space-y-1 text-left">
                  <h2 className="text-2xl font-bold tracking-tight text-white">Farm Profile</h2>
                  <p className="text-neutral-400 text-sm">
                    Enter your overall farm details. You can create individual plots later in the Canvas.
                  </p>
                </div>

                <div className="space-y-4">
                  <Input
                    label="Farm Name"
                    placeholder="e.g. My Family Farm"
                    value={farmName}
                    onChange={(e) => setFarmName(e.target.value)}
                    icon={Sprout}
                    className="bg-neutral-900/50 border-neutral-800 text-white placeholder-neutral-600 focus:border-emerald-600"
                  />

                  <div className="space-y-2 text-left">
                    <label className="text-xs font-semibold tracking-wider text-neutral-500 uppercase">Farming Experience</label>
                    <div className="grid grid-cols-3 gap-3">
                      {['Beginner', 'Intermediate', 'Advanced'].map((level) => (
                        <button
                          key={level}
                          type="button"
                          onClick={() => setExperienceLevel(level)}
                          className={`p-3 rounded-lg border text-sm font-semibold transition-all duration-200 cursor-pointer ${
                            experienceLevel === level
                              ? 'bg-emerald-950/20 border-emerald-500/70 text-emerald-400'
                              : 'bg-neutral-900/30 border-neutral-800/80 hover:border-neutral-700 text-neutral-300'
                          }`}
                        >
                          {level}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2 text-left">
                    <label className="text-xs font-semibold tracking-wider text-neutral-500 uppercase">Primary Goal</label>
                    <select
                      value={farmingGoal}
                      onChange={(e) => setFarmingGoal(e.target.value)}
                      className="flex h-10 w-full rounded-md border border-neutral-800 bg-neutral-900/50 px-3 py-2 text-sm text-neutral-200 focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-900/20"
                    >
                      <option value="" disabled className="bg-neutral-950 text-neutral-500">Select a goal</option>
                      {['Maximize Yield', 'Maximize Profit', 'Water Efficient Farming', 'Sustainable Farming'].map((g) => (
                        <option key={g} value={g} className="bg-neutral-950 text-neutral-200">{g}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-3 text-left pt-2 border-t border-neutral-800/50">
                    <label className="text-xs font-semibold tracking-wider text-neutral-500 uppercase">Crop Interests</label>
                    
                    <div className="flex flex-wrap gap-2 mb-2 min-h-[40px] p-2 rounded-lg border border-neutral-800/40 bg-neutral-900/10">
                      {cropInterests.length === 0 ? (
                        <span className="text-xs text-neutral-600 self-center">No crops selected yet. Choose below or add custom.</span>
                      ) : (
                        cropInterests.map((c) => (
                          <span
                            key={c}
                            onClick={() => toggleCropInterest(c)}
                            className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-400 bg-emerald-950/30 border border-emerald-800/40 px-2.5 py-1 rounded-full cursor-pointer hover:bg-red-950/20 hover:border-red-900/20 hover:text-red-400 transition-colors"
                          >
                            {c} &times;
                          </span>
                        ))
                      )}
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      {['Rice', 'Wheat', 'Soybean', 'Cotton', 'Vegetables', 'Fruits'].map((crop) => {
                        const active = cropInterests.includes(crop);
                        return (
                          <button
                            key={crop}
                            type="button"
                            onClick={() => toggleCropInterest(crop)}
                            className={`text-xs px-3 py-1.5 rounded-full border transition-all cursor-pointer ${
                              active
                                ? 'bg-emerald-950/20 border-emerald-500/70 text-emerald-400'
                                : 'bg-neutral-900/30 border-neutral-800 text-neutral-400 hover:border-neutral-700'
                            }`}
                          >
                            {crop}
                          </button>
                        );
                      })}
                    </div>

                    <form onSubmit={handleAddCustomCrop} className="flex gap-2 pt-2">
                      <input
                        value={cropInput}
                        onChange={(e) => setCropInput(e.target.value)}
                        placeholder="Add other crop interests..."
                        className="flex-1 h-9 rounded-md border border-neutral-800 bg-neutral-900/50 px-3 py-1 text-xs text-neutral-200 placeholder-neutral-600 focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-950"
                      />
                      <button
                        type="submit"
                        className="h-9 px-4 rounded-md bg-neutral-800 border border-neutral-700 hover:bg-neutral-750 transition-colors text-xs font-semibold cursor-pointer"
                      >
                        Add
                      </button>
                    </form>
                  </div>
                </div>
              </div>
            )}


          </motion.div>
        </AnimatePresence>
      </main>

      {/* Footer Navigation Bar */}
      <footer className="w-full max-w-6xl mx-auto pt-6 border-t border-neutral-900 z-10 flex justify-between items-center">
        {step > 1 ? (
          <Button
            onClick={handleBack}
            className="bg-neutral-900 border border-neutral-800 hover:bg-neutral-800 text-neutral-300"
            disabled={loading}
          >
            <ArrowLeft size={16} className="mr-2" />
            Back
          </Button>
        ) : (
          <div />
        )}

        {step < 2 ? (
          <Button
            onClick={handleNext}
            className="bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-900/20"
          >
            Continue
            <ArrowRight size={16} className="ml-2" />
          </Button>
        ) : (
          <Button
            onClick={handleSubmit}
            className="bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-900/20"
            disabled={loading}
          >
            {loading ? <Loader2 size={16} className="animate-spin mr-2" /> : <Check size={16} className="mr-2" />}
            {loading ? 'Bootstrapping...' : 'Complete Setup'}
          </Button>
        )}
      </footer>
    </div>
  );
};

export default Onboarding;
