import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User, Bell, Shield, Tractor,
  Camera, CheckCircle2, Trash2, LogOut, Loader2
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { useAuth } from '../store/AuthContext';
import api from '../services/api';

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
};
const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] } },
};

const LANGUAGES = ['English', 'हिन्दी', 'मराठी', 'தமிழ்', 'తెలుగు', 'ਪੰਜਾਬੀ', 'বাংলা'];
const SOIL_TYPES = ['Loamy', 'Sandy', 'Clay', 'Silt', 'Black', 'Red', 'Laterite', 'Alluvial'];
const STATES = [
  'Andhra Pradesh', 'Bihar', 'Gujarat', 'Haryana', 'Karnataka',
  'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Punjab', 'Rajasthan',
  'Tamil Nadu', 'Telangana', 'Uttar Pradesh', 'West Bengal',
];

const Toggle = ({ checked, onChange, title, description }) => (
  <div className="flex items-center justify-between py-4 border-b border-neutral-100 last:border-0">
    <div className="flex flex-col gap-1 pr-4">
      <span className="text-sm font-semibold text-neutral-900">{title}</span>
      {description && <span className="text-sm text-neutral-500">{description}</span>}
    </div>
    <label className="relative inline-flex items-center cursor-pointer">
      <input
        type="checkbox"
        className="sr-only peer"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <div className="w-11 h-6 bg-neutral-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-neutral-900 peer-focus:ring-offset-2 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-neutral-900"></div>
    </label>
  </div>
);

const Settings = () => {
  const { user, signOut } = useAuth();
  const [toast, setToast] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState('');

  // Profile form
  const [profile, setProfile] = useState({
    display_name: '',
    phone: '',
    state: '',
    district: '',
  });

  // Farm config
  const [farm, setFarm] = useState({
    farm_name: '',
    area: '',
    soil_type: '',
    irrigation_type: 'Drip',
    crops: '',
  });

  // Preferences
  const [prefs, setPrefs] = useState({
    language: 'English',
    notifications: true,
    email_alerts: true,
    price_alerts: true,
    weather_alerts: true,
    weekly_report: false,
  });

  // ── Load user data from MongoDB on mount ──
  useEffect(() => {
    if (!user?.uid) return;
    const loadData = async () => {
      setLoading(true);
      try {
        const doc = await api.users.getMe(user.uid);
        if (doc.profile) {
          setProfile((p) => ({ ...p, ...doc.profile }));
        }
        if (doc.farm) {
          setFarm((f) => ({ ...f, ...doc.farm }));
        }
        if (doc.preferences) {
          setPrefs((pr) => ({ ...pr, ...doc.preferences }));
        }
      } catch {
        /* first visit — no doc yet, use defaults */
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [user?.uid]);

  const initials = user?.displayName
    ? user.displayName.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
    : user?.email?.[0]?.toUpperCase() ?? 'U';

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const handleProfileChange = (e) =>
    setProfile((p) => ({ ...p, [e.target.name]: e.target.value }));

  const handleFarmChange = (e) =>
    setFarm((f) => ({ ...f, [e.target.name]: e.target.value }));

  // ── Save handlers → MongoDB ──
  const handleSaveProfile = useCallback(async (e) => {
    e.preventDefault();
    if (!user?.uid) return;
    setSaving('profile');
    try {
      await api.users.saveProfile(user.uid, profile);
      showToast('Profile saved to database');
    } catch {
      showToast('Failed to save profile');
    } finally {
      setSaving('');
    }
  }, [user?.uid, profile]);

  const handleSaveFarm = useCallback(async (e) => {
    e.preventDefault();
    if (!user?.uid) return;
    setSaving('farm');
    try {
      await api.users.saveFarm(user.uid, farm);
      showToast('Farm settings saved to database');
    } catch {
      showToast('Failed to save farm settings');
    } finally {
      setSaving('');
    }
  }, [user?.uid, farm]);

  const handleSavePrefs = useCallback(async () => {
    if (!user?.uid) return;
    setSaving('prefs');
    try {
      await api.users.savePreferences(user.uid, prefs);
      showToast('Preferences saved to database');
    } catch {
      showToast('Failed to save preferences');
    } finally {
      setSaving('');
    }
  }, [user?.uid, prefs]);

  if (loading) {
    return (
      <div className="flex justify-center p-16 text-neutral-500">
        <Loader2 size={28} className="animate-spin" />
      </div>
    );
  }

  return (
    <motion.div className="max-w-4xl mx-auto pb-12" variants={containerVariants} initial="hidden" animate="visible">
      {/* Header */}
      <motion.div className="mb-8" variants={cardVariants}>
        <h1 className="text-3xl font-bold tracking-tight text-neutral-900 mb-2">Settings</h1>
        <p className="text-neutral-500 text-lg">Manage your profile, farm configuration, and preferences.</p>
      </motion.div>

      <div className="space-y-8">
        {/* ─── Profile Section ─── */}
        <motion.div variants={cardVariants}>
          <Card>
            <CardHeader className="border-b border-neutral-100 flex flex-row items-center gap-4">
              <div className="h-10 w-10 rounded-full bg-neutral-100 flex items-center justify-center text-neutral-900">
                <User size={20} />
              </div>
              <div className="flex flex-col space-y-1">
                <CardTitle>Profile</CardTitle>
                <CardDescription>Your personal information</CardDescription>
              </div>
            </CardHeader>

            <CardContent className="pt-6">
              <div className="flex items-center gap-6 mb-8">
                <div className="relative group cursor-pointer">
                  {user?.photoURL ? (
                    <img src={user.photoURL} alt="" className="h-20 w-20 rounded-full object-cover border border-neutral-200" />
                  ) : (
                    <div className="h-20 w-20 rounded-full bg-neutral-900 text-white flex items-center justify-center text-xl font-bold">
                      {initials}
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Camera size={20} color="#fff" />
                  </div>
                </div>
                <div className="flex flex-col">
                  <h3 className="text-xl font-semibold text-neutral-900">{user?.displayName || user?.email?.split('@')[0] || 'Farmer'}</h3>
                  <p className="text-sm text-neutral-500">{user?.email}</p>
                  {user?.emailVerified && (
                    <span className="inline-flex items-center gap-1.5 mt-2 text-xs font-medium text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full w-max">
                      <CheckCircle2 size={14} /> Email verified
                    </span>
                  )}
                </div>
              </div>

              <form onSubmit={handleSaveProfile} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-neutral-900">Full Name</label>
                    <Input
                      name="display_name" value={profile.display_name}
                      onChange={handleProfileChange} placeholder="Your name"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-neutral-900">Email</label>
                    <Input value={user?.email || ''} disabled className="bg-neutral-50" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-neutral-900">Phone Number</label>
                    <Input
                      name="phone" value={profile.phone}
                      onChange={handleProfileChange} placeholder="+91 XXXXX XXXXX"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-neutral-900">State</label>
                    <select
                      className="flex h-10 w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-950 focus:ring-offset-2"
                      name="state" value={profile.state} onChange={handleProfileChange}
                    >
                      <option value="">Select state</option>
                      {STATES.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-neutral-900">District / City</label>
                    <Input
                      name="district" value={profile.district}
                      onChange={handleProfileChange} placeholder="Your district"
                    />
                  </div>
                </div>
                <div className="flex justify-end pt-4 border-t border-neutral-100">
                  <Button type="submit" disabled={saving === 'profile'}>
                    {saving === 'profile' ? 'Saving…' : 'Save Profile'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </motion.div>

        {/* ─── Farm Configuration ─── */}
        <motion.div variants={cardVariants}>
          <Card>
            <CardHeader className="border-b border-neutral-100 flex flex-row items-center gap-4">
              <div className="h-10 w-10 rounded-full bg-neutral-100 flex items-center justify-center text-neutral-900">
                <Tractor size={20} />
              </div>
              <div className="flex flex-col space-y-1">
                <CardTitle>Farm Configuration</CardTitle>
                <CardDescription>Your farm details for better recommendations</CardDescription>
              </div>
            </CardHeader>

            <CardContent className="pt-6">
              <form onSubmit={handleSaveFarm} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2 md:col-span-2">
                    <label className="text-sm font-medium text-neutral-900">Farm Name</label>
                    <Input
                      name="farm_name" value={farm.farm_name}
                      onChange={handleFarmChange} placeholder="e.g. Green Valley Farm"
                    />
                  </div>
                  <div className="md:col-span-2 p-3 bg-neutral-50 rounded text-sm text-neutral-500 border border-neutral-100">
                    ℹ️ Note: Area, soil chemistry, and crops are now managed strictly on a per-plot basis. Use the <strong>Farm Canvas</strong> to draw and configure your plots.
                  </div>
                </div>
                <div className="flex justify-end pt-4 border-t border-neutral-100">
                  <Button type="submit" disabled={saving === 'farm'}>
                    {saving === 'farm' ? 'Saving…' : 'Save Farm Settings'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </motion.div>

        {/* ─── Preferences ─── */}
        <motion.div variants={cardVariants}>
          <Card>
            <CardHeader className="border-b border-neutral-100 flex flex-row items-center gap-4">
              <div className="h-10 w-10 rounded-full bg-neutral-100 flex items-center justify-center text-neutral-900">
                <Bell size={20} />
              </div>
              <div className="flex flex-col space-y-1">
                <CardTitle>Notifications & Preferences</CardTitle>
                <CardDescription>Control how you receive updates</CardDescription>
              </div>
            </CardHeader>

            <CardContent className="pt-6">
              <div className="mb-8">
                <label className="text-sm font-medium text-neutral-900 mb-2 block">Language</label>
                <select
                  className="flex h-10 w-full md:w-64 rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-950 focus:ring-offset-2"
                  value={prefs.language}
                  onChange={(e) => setPrefs((p) => ({ ...p, language: e.target.value }))}
                >
                  {LANGUAGES.map((l) => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>

              <div className="flex flex-col">
                <Toggle
                  title="Push Notifications"
                  description="Get real-time alerts on your device"
                  checked={prefs.notifications}
                  onChange={(v) => setPrefs((p) => ({ ...p, notifications: v }))}
                />
                <Toggle
                  title="Email Alerts"
                  description="Receive important updates via email"
                  checked={prefs.email_alerts}
                  onChange={(v) => setPrefs((p) => ({ ...p, email_alerts: v }))}
                />
                <Toggle
                  title="Price Drop / Spike Alerts"
                  description="Notify when commodity prices change significantly"
                  checked={prefs.price_alerts}
                  onChange={(v) => setPrefs((p) => ({ ...p, price_alerts: v }))}
                />
                <Toggle
                  title="Weather Warnings"
                  description="Severe weather alerts for your farm location"
                  checked={prefs.weather_alerts}
                  onChange={(v) => setPrefs((p) => ({ ...p, weather_alerts: v }))}
                />
                <Toggle
                  title="Weekly Farm Report"
                  description="Get a summary email every Monday"
                  checked={prefs.weekly_report}
                  onChange={(v) => setPrefs((p) => ({ ...p, weekly_report: v }))}
                />
              </div>

              <div className="flex justify-end pt-6 mt-4 border-t border-neutral-100">
                <Button onClick={handleSavePrefs} disabled={saving === 'prefs'}>
                  {saving === 'prefs' ? 'Saving…' : 'Save Preferences'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* ─── Danger Zone ─── */}
        <motion.div variants={cardVariants}>
          <Card className="border-red-200 bg-red-50/50">
            <CardHeader className="border-b border-red-100 flex flex-row items-center gap-4">
              <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center text-red-600">
                <Shield size={20} />
              </div>
              <div className="flex flex-col space-y-1">
                <CardTitle className="text-red-900">Account Security</CardTitle>
                <CardDescription className="text-red-700/80">Sign out or permanently delete your account</CardDescription>
              </div>
            </CardHeader>

            <CardContent className="pt-6 flex flex-col sm:flex-row gap-4">
              <Button variant="outline" onClick={signOut} className="text-red-700 border-red-200 hover:bg-red-50 hover:text-red-800">
                <LogOut size={16} className="mr-2" />
                Sign Out
              </Button>
              <Button variant="danger">
                <Trash2 size={16} className="mr-2" />
                Delete Account
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            className="fixed bottom-6 right-6 flex items-center gap-3 bg-neutral-900 text-white px-4 py-3 rounded-md shadow-lg z-50 text-sm font-medium"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 30 }}
          >
            <CheckCircle2 size={18} className="text-emerald-400" />
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default Settings;
