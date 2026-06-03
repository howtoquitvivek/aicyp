"""
Crop recommendation service.
Fetches crop parameter guidelines dynamically from the crop_dataset MongoDB collection.
"""
from app.core.database import get_db

def _score_range(value, ideal_range):
    """Score how well a value fits within an ideal range (0–100)."""
    low, high = ideal_range
    mid = (low + high) / 2
    span = (high - low) / 2

    if low <= value <= high:
        # Inside range: 80–100 based on closeness to center
        closeness = 1 - abs(value - mid) / span if span > 0 else 1
        return 80 + 20 * closeness
    else:
        # Outside range: decay based on distance
        dist = min(abs(value - low), abs(value - high))
        decay = max(0, 1 - dist / (span * 3 if span > 0 else 50))
        return max(5, 75 * decay)


async def recommend_crops(nitrogen, phosphorus, potassium, ph, rainfall, temperature, humidity):
    """Score all crops dynamically loaded from MongoDB and return top matches sorted by confidence."""
    db = get_db()
    
    # Auto-seed check
    count = await db["crop_dataset"].count_documents({})
    if count == 0:
        from app.api.datasets import CROP_SEED_DATA
        await db["crop_dataset"].insert_many(CROP_SEED_DATA)
        
    crops = await db["crop_dataset"].find({}).to_list(length=100)
    results = []

    for crop in crops:
        ideal = crop["ideal"]
        scores = [
            _score_range(nitrogen, ideal["n"]),
            _score_range(phosphorus, ideal["p"]),
            _score_range(potassium, ideal["k"]),
            _score_range(ph, ideal["ph"]),
            _score_range(temperature, ideal["temp"]),
            _score_range(humidity, ideal["humidity"]),
            _score_range(rainfall, ideal["rain"]),
        ]

        # Weighted average — NPK and climate matter more
        weights = [1.0, 0.9, 0.9, 0.8, 1.0, 0.7, 0.8]
        confidence = sum(s * w for s, w in zip(scores, weights)) / sum(weights)

        results.append({
            "name": crop["name"],
            "confidence": round(confidence, 1),
            "season": crop["season"],
            "water_need": crop["water_need"],
            "growth_period": crop["growth_period"],
            "description": crop["description"],
            "icon": crop["icon"],
            "scores": {
                "nitrogen": round(scores[0], 1),
                "phosphorus": round(scores[1], 1),
                "potassium": round(scores[2], 1),
                "ph": round(scores[3], 1),
                "temperature": round(scores[4], 1),
                "humidity": round(scores[5], 1),
                "rainfall": round(scores[6], 1),
            },
        })

    results.sort(key=lambda x: x["confidence"], reverse=True)
    return results[:6]  # Top 6
