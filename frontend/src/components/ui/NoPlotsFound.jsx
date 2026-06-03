import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Map, AlertCircle } from 'lucide-react';
import { Card, CardContent } from './Card';
import Button from './Button';

const NoPlotsFound = ({ context = "dashboard" }) => {
  const navigate = useNavigate();

  const getContextualContent = () => {
    switch (context) {
      case "planner":
        return {
          title: "No Plot Selected",
          description: "Create a plot before generating yield projections."
        };
      case "recommendation":
        return {
          title: "No Plot Selected",
          description: "Create a plot to analyze soil conditions and receive recommendations."
        };
      case "market":
        return {
          title: "No Plot Selected",
          description: "Create a plot to track local commodity prices and market trends."
        };
      case "dashboard":
      default:
        return {
          title: "No Plots Created Yet",
          description: "Create your first plot to start monitoring crop health, market prices and yield forecasts."
        };
    }
  };

  const { title, description } = getContextualContent();

  return (
    <motion.div 
      className="max-w-xl mx-auto py-12 px-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Card className="border border-neutral-200 shadow-xl overflow-hidden bg-white/80 backdrop-blur-md">
        <div className="h-2 bg-gradient-to-r from-emerald-500 to-teal-500"></div>
        <CardContent className="p-8 flex flex-col items-center text-center gap-6">
          <div className="h-16 w-16 rounded-full bg-emerald-50 text-emerald-500 flex items-center justify-center border border-emerald-100">
            <Map size={32} />
          </div>
          
          <div className="space-y-2">
            <h2 className="text-2xl font-bold tracking-tight text-neutral-900">{title}</h2>
            <p className="text-sm text-neutral-500 leading-relaxed max-w-md mx-auto">
              {description}
            </p>
          </div>

          <Button onClick={() => navigate('/map')} className="w-full sm:w-auto px-8 shadow-md">
            Open Farm Canvas
          </Button>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default NoPlotsFound;
