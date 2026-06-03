import React from 'react';
import { Outlet } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Leaf, Microscope, CloudRain, BarChart3, Map } from 'lucide-react';

const features = [
  {
    text: 'AI-powered crop disease detection',
    desc: 'Instant visual diagnosis and treatment recommendation.',
    icon: Microscope,
  },
  {
    text: 'Real-time weather & soil analytics',
    desc: 'Hyper-local forecasting and sensor metrics mapping.',
    icon: CloudRain,
  },
  {
    text: 'Smart yield prediction & forecasting',
    desc: 'Historical modeling to estimate and optimize harvest.',
    icon: BarChart3,
  },
  {
    text: 'Market price tracking across regions',
    desc: 'Live commodities market pricing from local mandis.',
    icon: Map,
  },
];

const AuthLayout = () => {
  return (
    <div className="flex min-h-screen bg-neutral-50 lg:bg-white lg:flex-row flex-col">
      {/* Left Branding Panel */}
      <div className="hidden lg:flex flex-col flex-1 bg-[#0A120D] text-white justify-between p-16 border-r border-neutral-800 relative overflow-hidden">
        {/* Subtle organic background glow */}
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_top_left,rgba(16,185,129,0.06),transparent_50%)] pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-full h-full bg-[radial-gradient(ellipse_at_bottom_right,rgba(59,130,246,0.04),transparent_50%)] pointer-events-none" />

        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="relative z-10 max-w-lg"
        >
          {/* Logo */}
          <div className="flex items-center gap-3 mb-16">
            <div className="h-10 w-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Leaf size={22} />
            </div>
            <span className="text-xl font-bold tracking-tight text-white">AgriBrain</span>
          </div>

          {/* Heading */}
          <h1 className="text-4xl xl:text-5xl font-bold tracking-tight text-white leading-[1.15] mb-6">
            Farm smarter <br />
            <span className="text-emerald-400">with farm intelligence.</span>
          </h1>
          <p className="text-neutral-400 text-lg mb-14 leading-relaxed max-w-md">
            The complete AI-powered operating system for modern agricultural yields and disease monitoring.
          </p>

          {/* Premium Features List */}
          <div className="space-y-6">
            {features.map((f, idx) => (
              <motion.div
                key={f.text}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4, delay: 0.1 * idx, ease: 'easeOut' }}
                className="flex gap-4 p-4 rounded-2xl bg-white/[0.02] border border-white/[0.04] hover:bg-white/[0.04] hover:border-white/[0.08] transition-all duration-200"
              >
                <div className="h-10 w-10 rounded-xl bg-white/[0.04] text-emerald-400 flex items-center justify-center shrink-0 border border-white/[0.05]">
                  <f.icon size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-neutral-100">{f.text}</h3>
                  <p className="text-xs text-neutral-400 mt-0.5 leading-relaxed">{f.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
        
        <div className="text-xs text-neutral-500 font-medium relative z-10">
          &copy; {new Date().getFullYear()} AgriBrain Inc. All rights reserved.
        </div>
      </div>

      {/* Right Form Panel */}
      <div className="flex flex-1 flex-col justify-center px-6 py-12 sm:px-12 lg:px-20 xl:px-24 bg-white min-h-screen lg:min-h-0">
        <div className="mx-auto w-full max-w-md">
          <Outlet />
        </div>
      </div>
    </div>
  );
};

export default AuthLayout;
