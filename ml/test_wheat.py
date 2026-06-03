import sys
sys.path.insert(0, '/home/howtoquitvivek/aicyp/backend')
from app.services.yield_ml_service import yield_ml_service

tests = [
    {"crop": "wheat", "state": "Punjab", "area": 5, "temperature": 22, "rainfall": 75, "humidity": 55, "nitrogen": 120, "phosphorus": 60, "potassium": 40, "ph": 6.5, "soil": "alluvial", "irrigation": "canal", "season": "Rabi"},
    {"crop": "wheat", "state": "Uttar Pradesh", "area": 10, "temperature": 24, "rainfall": 80, "humidity": 60, "nitrogen": 100, "phosphorus": 50, "potassium": 35, "ph": 7.0, "soil": "loam", "irrigation": "drip", "season": "Rabi"},
    {"crop": "wheat", "state": "Madhya Pradesh", "area": 8, "temperature": 26, "rainfall": 60, "humidity": 50, "nitrogen": 90, "phosphorus": 45, "potassium": 30, "ph": 6.8, "soil": "black", "irrigation": "rainfed", "season": "Rabi"},
    {"crop": "wheat", "state": "Rajasthan", "area": 15, "temperature": 28, "rainfall": 40, "humidity": 45, "nitrogen": 80, "phosphorus": 40, "potassium": 25, "ph": 7.5, "soil": "sandy", "irrigation": "sprinkler", "season": "Rabi"},
    {"crop": "wheat", "state": "Haryana", "area": 12, "temperature": 21, "rainfall": 70, "humidity": 58, "nitrogen": 130, "phosphorus": 65, "potassium": 45, "ph": 6.3, "soil": "alluvial", "irrigation": "drip", "season": "Rabi"},
]

for i, t in enumerate(tests, 1):
    result = yield_ml_service.predict_yield(t)
    state = t['state']
    area = t['area']
    print(f"\n--- Test {i}: {state} ({area} acres) ---")
    print(f"  Base:       {result['base_prediction']} t/ha")
    print(f"  Final:      {result['predicted_yield']} t/ha")
    print(f"  Range:      {result['prediction_range']}")
    print(f"  Confidence: {result['confidence_level']} ({result['confidence_score']}%)")
    print(f"  Reasons:    {result['confidence_reasons']}")
    print(f"  Factors:    {result['top_factors']}")
