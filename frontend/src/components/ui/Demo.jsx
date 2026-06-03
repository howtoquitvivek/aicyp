import React, { useState, useEffect } from 'react';
import ScrollExpandMedia from './scroll-expansion-hero';
import { Leaf, Sprout, CloudRain, BarChart3, Microscope, Map, MessageSquareText, ArrowRight } from 'lucide-react';
import { Button } from './Button';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

const features = [
  {
    icon: Microscope,
    title: 'Crop Disease Detection',
    desc: 'Upload a photo — our AI identifies diseases instantly and recommends targeted treatment.',
  },
  {
    icon: CloudRain,
    title: 'Weather & Soil Analytics',
    desc: 'Real-time weather forecasts and soil moisture data tailored to your farm location.',
  },
  {
    icon: BarChart3,
    title: 'Yield Prediction',
    desc: 'Machine learning models trained on regional data predict your harvest before planting.',
  },
  {
    icon: Sprout,
    title: 'Crop Recommendation',
    desc: 'Get crop suggestions based on your soil type, climate, and market demand.',
  },
  {
    icon: Map,
    title: 'Market Price Tracking',
    desc: 'Live commodity prices from major mandis, so you can sell at the right moment.',
  },
  {
    icon: MessageSquareText,
    title: 'AI Chatbot Assistant',
    desc: 'Ask anything — from planting schedules to fertilizer doses — in your language.',
  },
];

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } }
};

const itemVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] } }
};

const sampleMediaContent = {
  video: {
    src: 'https://me7aitdbxq.ufs.sh/f/2wsMIGDMQRdYuZ5R8ahEEZ4aQK56LizRdfBSqeDMsmUIrJN1',
    poster: 'https://images.unsplash.com/photo-1592982537447-6f2a6a0c6c13?q=80&w=2940&auto=format&fit=crop',
    background: 'https://images.unsplash.com/photo-1586771107445-d3af28359a1d?q=80&w=2940&auto=format&fit=crop',
    title: 'AgriBrain Intelligence',
    date: 'Smart Farming',
    scrollToExpand: 'Scroll to explore the platform',
  },
  image: {
    src: 'https://images.unsplash.com/photo-1625246333195-78d9c38ad449?q=80&w=2940&auto=format&fit=crop',
    background: 'https://images.unsplash.com/photo-1560493676-04071c5f467b?q=80&w=2874&auto=format&fit=crop',
    title: 'Precision Agriculture',
    date: 'Data-Driven Yields',
    scrollToExpand: 'Scroll to explore the platform',
  },
};

const LandingContent = () => {
  return (
    <div className="bg-white w-full">
      {/* Introduction Section (previously Hero) */}
      <section className="relative px-6 py-20 lg:py-32 flex flex-col items-center text-center overflow-hidden">
        <motion.div
          className="max-w-4xl mx-auto flex flex-col items-center relative z-10"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-neutral-100 border border-neutral-200 text-xs font-semibold text-neutral-600 uppercase tracking-widest mb-8">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-neutral-900 opacity-20"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-neutral-900"></span>
            </span>
            AI-Powered Precision Agriculture
          </div>

          <h1 className="text-5xl md:text-7xl font-bold tracking-tighter text-neutral-900 mb-6 leading-[1.1]">
            The smartest way to <br className="hidden md:block" />
            <span className="text-neutral-400">grow your farm.</span>
          </h1>
          <p className="text-xl text-neutral-500 max-w-2xl mb-10 leading-relaxed">
            Combine AI crop intelligence, real-time weather data, and market analytics
            to make better farming decisions — every single day.
          </p>

          <div className="flex flex-col sm:flex-row items-center gap-4">
            <Link to="/register">
              <Button size="lg" className="h-12 px-8 text-base">
                Start for Free
                <ArrowRight size={18} className="ml-2" />
              </Button>
            </Link>
            <Link to="/login">
              <Button variant="outline" size="lg" className="h-12 px-8 text-base">
                Book a Demo
              </Button>
            </Link>
          </div>
        </motion.div>
      </section>

      {/* Features Section */}
      <section className="px-6 py-24 bg-neutral-50 border-y border-neutral-100" id="features">
        <div className="max-w-6xl mx-auto">
          <div className="mb-16 md:text-center">
            <h2 className="text-3xl font-bold tracking-tight text-neutral-900 mb-4">Built for the modern farmer</h2>
            <p className="text-lg text-neutral-500 max-w-2xl md:mx-auto">
              From AI disease detection to market price tracking — every tool you need in one unified platform.
            </p>
          </div>

          <motion.div
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-100px' }}
          >
            {features.map((feature) => (
              <motion.div key={feature.title} variants={itemVariants} className="bg-white rounded-2xl p-8 border border-neutral-200 shadow-sm hover:shadow-md transition-shadow">
                <div className="h-12 w-12 rounded-xl bg-neutral-100 text-neutral-900 flex items-center justify-center mb-6">
                  <feature.icon size={24} />
                </div>
                <h3 className="text-xl font-bold text-neutral-900 mb-3">{feature.title}</h3>
                <p className="text-neutral-500 leading-relaxed">{feature.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="px-6 py-32" id="cta">
        <motion.div
          className="max-w-4xl mx-auto bg-neutral-900 rounded-[2rem] p-12 text-center text-white relative overflow-hidden"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="relative z-10">
            <h2 className="text-4xl font-bold tracking-tight mb-6">Ready to transform your farm?</h2>
            <p className="text-lg text-neutral-400 max-w-xl mx-auto mb-10">
              Join modern farmers already using AgriBrain to boost yields, cut costs, and
              make data-driven decisions.
            </p>
            <Link to="/register">
              <button className="h-12 px-8 bg-white text-neutral-900 font-medium rounded-md hover:bg-neutral-100 transition-colors inline-flex items-center">
                Create Free Account
                <ArrowRight size={18} className="ml-2" />
              </button>
            </Link>
          </div>
          
          {/* Abstract decorative elements */}
          <div className="absolute top-0 right-0 -mt-24 -mr-24 w-96 h-96 bg-white/5 rounded-full blur-3xl pointer-events-none"></div>
          <div className="absolute bottom-0 left-0 -mb-24 -ml-24 w-64 h-64 bg-white/5 rounded-full blur-2xl pointer-events-none"></div>
        </motion.div>
      </section>

      <footer className="border-t border-neutral-100 py-12 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-neutral-500">
          <div className="flex items-center gap-2 font-semibold text-neutral-900">
            <Leaf size={16} /> AgriBrain
          </div>
          <p>© {new Date().getFullYear()} AgriBrain Inc. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

const Demo = () => {
  const [mediaType, setMediaType] = useState('video');
  const currentMedia = sampleMediaContent[mediaType];

  useEffect(() => {
    window.scrollTo(0, 0);

    const resetEvent = new Event('resetSection');
    window.dispatchEvent(resetEvent);
  }, [mediaType]);

  return (
    <div className='min-h-screen bg-black'>
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 h-16 border-b border-neutral-800 bg-black/50 backdrop-blur-md z-50 flex items-center justify-between px-6 lg:px-12 text-white">
        <div className="flex items-center gap-2 font-bold text-lg tracking-tight">
          <div className="h-8 w-8 rounded bg-white text-black flex items-center justify-center">
            <Leaf size={18} />
          </div>
          AgriBrain
        </div>
        <div className="hidden md:flex items-center gap-8 text-sm font-medium text-neutral-300">
          <a href="#features" className="hover:text-white transition-colors">Features</a>
          <a href="#cta" className="hover:text-white transition-colors">Pricing</a>
          <a href="#cta" className="hover:text-white transition-colors">About</a>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/login" className="text-sm font-medium text-neutral-300 hover:text-white transition-colors px-3">
            Sign In
          </Link>
          <Link to="/register">
            <Button className="bg-white text-black hover:bg-neutral-200">Get Started</Button>
          </Link>
        </div>
      </nav>



      <ScrollExpandMedia
        mediaType={mediaType}
        mediaSrc={currentMedia.src}
        posterSrc={mediaType === 'video' ? currentMedia.poster : undefined}
        bgImageSrc={currentMedia.background}
        title={currentMedia.title}
        date={currentMedia.date}
        scrollToExpand={currentMedia.scrollToExpand}
        textBlend={false}
      >
        <LandingContent />
      </ScrollExpandMedia>
    </div>
  );
};

export default Demo;
