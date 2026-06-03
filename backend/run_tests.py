import requests
import time

API_BASE = "http://localhost:8000/api/market/current"

tests = [
    {"Commodity": "Wheat", "District": "Jabalpur", "State": "Madhya Pradesh"},
    {"Commodity": "Rice", "District": "Jabalpur", "State": "Madhya Pradesh"},
    {"Commodity": "Cotton", "District": "Nashik", "State": "Maharashtra"},
    {"Commodity": "Soybean", "District": "Indore", "State": "Madhya Pradesh"},
]

for t in tests:
    print(f"--- TEST: {t['Commodity']} in {t['District']}, {t['State']} ---")
    start = time.time()
    resp = requests.get(API_BASE, params={"crop": t['Commodity'], "district": t['District'], "state": t['State']})
    end = time.time()
    print(f"Response Time: {end - start:.2f}s")
    print(f"Status Code: {resp.status_code}")
    data = resp.json()
    if data.get("available"):
        print(f"Latest Arrival Date: {data.get('arrival_date')}")
        print(f"Confidence (Fallback Level): {data.get('confidence')}")
        print(f"Modal Price: {data.get('modal_price')}")
    else:
        print("Data Not Available")
    print()
