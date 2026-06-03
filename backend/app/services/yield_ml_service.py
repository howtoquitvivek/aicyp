import pandas as pd
import numpy as np
import pickle
import json
import os

MODEL_DIR = os.path.join(os.path.dirname(__file__), '..', 'models')

class YieldMLService:
    def __init__(self):
        self.model = None
        self.encoders = {}
        self.metadata = {}
        self._load_model()

    def _load_model(self):
        try:
            with open(os.path.join(MODEL_DIR, 'yield_model.pkl'), 'rb') as f:
                self.model = pickle.load(f)
            with open(os.path.join(MODEL_DIR, 'encoders.pkl'), 'rb') as f:
                self.encoders = pickle.load(f)
            with open(os.path.join(MODEL_DIR, 'metadata.json'), 'r') as f:
                self.metadata = json.load(f)
        except Exception as e:
            print(f"ML Model failed to load: {e}")

    def predict_yield(self, features):
        if not self.model:
            # Fallback if model not trained yet
            return {"error": "Machine learning model not initialized."}

        # Stage 1: Core Prediction
        input_data = {}
        
        crop = str(features.get('crop', 'rice')).lower().strip()
        if crop not in self.encoders['Crop'].classes_:
            crop = self.encoders['Crop'].classes_[0]
            
        state = str(features.get('state', 'Unknown'))
        if state not in self.encoders['State_Name'].classes_:
            state = 'Unknown'
            
        season = str(features.get('season', 'Kharif'))
        if season not in self.encoders['Season'].classes_:
            season = 'Unknown'

        # Categoricals
        input_data['State_Name'] = [self.encoders['State_Name'].transform([state])[0]]
        input_data['Season'] = [self.encoders['Season'].transform([season])[0]]
        input_data['Crop'] = [self.encoders['Crop'].transform([crop])[0]]

        # Numericals — Area is NOT a model feature (removed during audit)
        # Use crop-specific agronomic defaults (ICAR-based) instead of arbitrary fallbacks
        crop_env_defaults = {
            'wheat':  {'temperature': 22.5, 'humidity': 55, 'rainfall': 75, 'N': 120, 'P': 60, 'K': 40, 'ph': 6.5},
            'rice':   {'temperature': 24.0, 'humidity': 82, 'rainfall': 200, 'N': 80, 'P': 48, 'K': 40, 'ph': 6.0},
            'maize':  {'temperature': 23.0, 'humidity': 65, 'rainfall': 85, 'N': 78, 'P': 48, 'K': 20, 'ph': 6.3},
            'cotton': {'temperature': 24.0, 'humidity': 80, 'rainfall': 80, 'N': 118, 'P': 46, 'K': 20, 'ph': 7.0},
            'banana': {'temperature': 27.0, 'humidity': 80, 'rainfall': 105, 'N': 100, 'P': 75, 'K': 50, 'ph': 6.0},
            'jute':   {'temperature': 25.0, 'humidity': 80, 'rainfall': 175, 'N': 78, 'P': 47, 'K': 40, 'ph': 6.7},
            'lentil': {'temperature': 25.0, 'humidity': 65, 'rainfall': 48, 'N': 20, 'P': 68, 'K': 20, 'ph': 7.0},
        }
        defaults = crop_env_defaults.get(crop, {'temperature': 25, 'humidity': 60, 'rainfall': 100, 'N': 80, 'P': 50, 'K': 40, 'ph': 6.5})
        
        input_data['temperature'] = [float(features.get('temperature', defaults['temperature']))]
        input_data['humidity'] = [float(features.get('humidity', defaults['humidity']))]
        input_data['rainfall'] = [float(features.get('rainfall', defaults['rainfall']))]
        input_data['N'] = [float(features.get('nitrogen', defaults['N']))]
        input_data['P'] = [float(features.get('phosphorus', defaults['P']))]
        input_data['K'] = [float(features.get('potassium', defaults['K']))]
        input_data['ph'] = [float(features.get('ph', defaults['ph']))]

        # Ensure correct column order
        cols = self.metadata['features']['categorical'] + self.metadata['features']['numerical']
        df = pd.DataFrame(input_data)[cols]
        
        base_yield = self.model.predict(df)[0]
        
        # Stage 2: Agronomic Adjustment Layer
        soil_type = str(features.get('soil', '')).lower()
        irrigation = str(features.get('irrigation', '')).lower()
        
        adjustment = 1.0
        
        # Soil Suitability
        if 'loam' in soil_type or 'alluvial' in soil_type:
            adjustment += 0.05
        elif 'sandy' in soil_type and crop in ['rice', 'sugarcane']:
            adjustment -= 0.10
        elif 'black' in soil_type and crop in ['cotton']:
            adjustment += 0.10
            
        # Irrigation Quality
        if 'drip' in irrigation or 'sprinkler' in irrigation:
            adjustment += 0.10
        elif 'flood' in irrigation or 'canal' in irrigation:
            adjustment += 0.02
        elif 'rainfed' in irrigation:
            adjustment -= 0.15 # Higher risk
            
        # Enforce maximum ±15% cap to ensure ML model remains the primary driver
        adjustment = max(0.85, min(1.15, adjustment))
        
        final_yield = base_yield * adjustment
        
        # Phase 3: Confidence Score Audit
        confidence_score = 100
        confidence_reasons = []
        
        # Deduct if crop is completely unknown to the model
        if crop == self.encoders['Crop'].classes_[0] and str(features.get('crop')).lower() not in self.encoders['Crop'].classes_:
            confidence_score -= 30
            confidence_reasons.append("⚠ Crop not present in training data")
        else:
            confidence_reasons.append("✓ Crop well-represented in training data")
            
        # Deduct if state is outside training scope
        if state == 'Unknown':
            confidence_score -= 20
            confidence_reasons.append("⚠ Geographic region (State) lacks training coverage")
        else:
            confidence_reasons.append("✓ State matches historical training patterns")
            
        # Deduct if user didn't explicitly provide soil/weather metrics and we relied on medians
        if features.get('nitrogen') is None or features.get('ph') is None:
            confidence_score -= 15
            confidence_reasons.append("⚠ Missing plot soil chemistry (using regional medians)")
        else:
            confidence_reasons.append("✓ Complete soil chemistry available")
            
        confidence_score = max(0, min(100, confidence_score))
        confidence_level = "High" if confidence_score >= 85 else "Medium" if confidence_score >= 60 else "Low"
        
        # Phase 5: Explainability Upgrade
        factors = []
        
        if 6.0 <= input_data['ph'][0] <= 7.5:
            factors.append("✓ Soil pH is within optimal range (6.0 - 7.5)")
        if 20 <= input_data['temperature'][0] <= 30:
            factors.append("✓ Ambient temperature aligns with crop lifecycle")
        if 'drip' in irrigation:
            factors.append("✓ Micro-irrigation prevents water stress")
            
        if input_data['temperature'][0] > 35:
            factors.append("⚠ Heat stress detected: temperatures exceed ideal range")
        elif input_data['rainfall'][0] < 50:
            factors.append("⚠ Severe moisture deficit: rainfall limits biomass")
            
        if input_data['ph'][0] < 5.5:
            factors.append("⚠ Acidic soil pH inhibits nutrient absorption")
        if 'rainfed' in irrigation:
            factors.append("⚠ High dependency on unpredictable monsoon (Rainfed)")
            
        if not factors:
            factors.append("✓ Weather and soil metrics are generally balanced for this region")

        return {
            "predicted_yield": round(float(final_yield), 2),
            "prediction_range": [round(float(final_yield * 0.9), 2), round(float(final_yield * 1.1), 2)],
            "base_prediction": round(float(base_yield), 2),
            "confidence_score": confidence_score,
            "confidence_level": confidence_level,
            "confidence_reasons": confidence_reasons,
            "top_factors": factors,
            "method": "Random Forest + Agronomic Adjustment"
        }

yield_ml_service = YieldMLService()
