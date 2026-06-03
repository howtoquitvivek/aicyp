import os
import json
import httpx
import re
from typing import Dict, Any, List
from dotenv import load_dotenv

from app.services.user_service import get_user
from app.services.weather_service import get_current_weather
from app.services.market_service import get_latest_market_price

load_dotenv()

class AgriBotService:
    def __init__(self):
        self.groq_api_key = os.getenv('GROQ_API_KEY')
        self.base_url = "https://api.groq.com/openai/v1/chat/completions"
        self.knowledge_base = self._load_knowledge_base()

    def _load_knowledge_base(self):
        kb_dir = os.path.join(os.path.dirname(__file__), '..', '..', 'data', 'agri_knowledge')
        chunks = []
        if os.path.exists(kb_dir):
            for filename in os.listdir(kb_dir):
                if filename.endswith('.md'):
                    topic = filename.replace('.md', '')
                    with open(os.path.join(kb_dir, filename), 'r') as f:
                        chunks.append({
                            "topic": topic,
                            "content": f.read()
                        })
        return chunks

    def _extract_keywords(self, query: str) -> set:
        words = re.findall(r'\b\w+\b', query.lower())
        stop_words = {"what", "how", "why", "should", "i", "my", "the", "a", "an", "is", "are", "do", "does", "to", "for", "in", "on", "today", "tomorrow"}
        return set([w for w in words if w not in stop_words])

    def _retrieve_knowledge(self, query: str, active_crop: str) -> str:
        keywords = self._extract_keywords(query)
        if active_crop:
            keywords.add(active_crop.lower())
            
        scored_chunks = []
        for chunk in self.knowledge_base:
            score = 0
            if chunk['topic'].lower() in keywords:
                score += 5
            for word in keywords:
                if word in chunk['content'].lower():
                    score += 1
            if score > 0:
                scored_chunks.append((score, chunk))
                
        scored_chunks.sort(key=lambda x: x[0], reverse=True)
        top_chunks = [c[1] for c in scored_chunks[:2]]
        
        retrieved_text = "\n\n".join([f"--- Knowledge: {c['topic']} ---\n{c['content']}" for c in top_chunks])
        return retrieved_text

    async def _build_farm_context(self, uid: str, active_plot_id: str) -> tuple[str, str]:
        user_doc = await get_user(uid)
        if not user_doc:
            return "No farm data found.", ""
            
        profile = user_doc.get("profile") or {}
        district = profile.get("district", "Unknown")
        state = profile.get("state", "Unknown")
        
        farm = user_doc.get("farm") or {}
        plots = farm.get("plots") or []
        
        active_plot = next((p for p in plots if p.get('id') == active_plot_id), None)
        if not active_plot:
            return f"User Location: {district}, {state}\nNo active plot selected.", ""
            
        crop = active_plot.get('crop', '')
        
        from datetime import date
        current_date = date.today().strftime('%Y-%m-%d')
        
        weather_text = "Unavailable"
        # 1. Try plot coordinates
        coords = active_plot.get('coordinates', {})
        lat = coords.get('lat')
        lon = coords.get('lng') # sometimes stored as lng in google maps
        
        # 2. Try profile coordinates
        if not lat or not lon:
            lat = profile.get('latitude')
            lon = profile.get('longitude')
            
        if lat and lon:
            try:
                w_data = await get_current_weather(lat, lon)
                weather_text = f"{w_data['temp']}°C, {w_data['humidity']}% Humidity, Rain: {w_data.get('rain_1h', 0)}mm"
            except:
                pass
        else:
            # 3. Fallback to geocoding the district
            try:
                from app.services.weather_service import get_coordinates
                geo = await get_coordinates(district)
                w_data = await get_current_weather(geo['lat'], geo['lon'])
                weather_text = f"{w_data['temp']}°C, {w_data['humidity']}% Humidity, Rain: {w_data.get('rain_1h', 0)}mm"
            except:
                pass
                
        market_text = "Unavailable"
        if crop and district and state:
            try:
                m_data = await get_latest_market_price(crop, district, state)
                if m_data and m_data.get('available'):
                    market_text = f"₹{m_data['modal_price']}/qtl (Min: ₹{m_data['min_price']}, Max: ₹{m_data['max_price']}). Freshness: {m_data['data_freshness']}, Confidence: {m_data['confidence']}"
            except:
                pass

        plans = active_plot.get('yieldPlans') or []
        yield_text = "No yield plans created."
        if plans:
            latest = plans[-1]
            metrics = latest.get('metrics') or {}
            yield_text = f"Revenue: ₹{metrics.get('estimatedRevenue', 0)}, Cost: ₹{metrics.get('estimatedCost', 0)}, Profit: ₹{metrics.get('estimatedProfit', 0)}, Yield: {metrics.get('estimatedYield', 0)} Qtl"

        timeline = user_doc.get("timeline") or []
        plot_timeline = [t for t in timeline if t.get('plotId') == active_plot_id]
        
        # Deduplicate activities by summary, keeping the latest timestamp
        unique_activities = {}
        for t in plot_timeline:
            summary = t.get('summary', '')
            ts = t.get('timestamp', '')[:10]
            if summary not in unique_activities:
                unique_activities[summary] = ts

        activities_text = "\n".join([f"- {summary} (Updated: {ts})" for summary, ts in list(unique_activities.items())[:3]]) or "No recent activities."

        context = f"""Current Farm Context:
Date: {current_date}
Location: {district}, {state}
Plot: {active_plot.get('name', 'Unknown')}
Crop: {crop}
Area: {active_plot.get('area', 0)} {active_plot.get('areaUnit', 'Acres')}
Soil: {active_plot.get('soilType', 'Unknown')}
Irrigation: {active_plot.get('irrigationType', 'Unknown')}

Soil Profile:
N: {active_plot.get('soilN', 'Unknown')}
P: {active_plot.get('soilP', 'Unknown')}
K: {active_plot.get('soilK', 'Unknown')}
pH: {active_plot.get('soilPH', 'Unknown')}

Weather:
{weather_text}

Market:
{market_text}

Yield Projection (Latest):
{yield_text}

Recent Activities:
{activities_text}
"""
        return context, crop

    async def chat(self, uid: str, active_plot_id: str, question: str, history: List[Dict[str, str]], action: str = "chat"):
        context_str, crop = await self._build_farm_context(uid, active_plot_id)
        knowledge_str = self._retrieve_knowledge(question, crop)
        
        system_prompt = f"""You are AgriBot, a dashboard-style farm operations assistant.
Use the following farm data and agricultural knowledge to answer the user.

{context_str}

Retrieved Knowledge:
{knowledge_str}

GLOBAL RULES:
- Maximum 6 bullet points unless user explicitly requests detail.
- Maximum 1 recommendation per identified problem.
- No introductory paragraphs. No concluding paragraphs.
- No motivational language. No generic agriculture textbook content.
- No repeating weather/market/plot values in multiple sections.
- Never output "Unknown" more than once. If data is unavailable, state: "Data not available."
- Priority order: 1. Active Plot 2. Weather 3. Market 4. Yield Plans 5. Activity Timeline 6. Knowledge Base.
- RAG RULES: Extract only relevant facts/recommendations. Max 2 retrieved facts per response.
- ANTI-HALLUCINATION: Never invent yields, future prices, rainfall, disease outbreaks, or soil values.
- Make responses feel like a precise operations assistant, not ChatGPT.
"""
        
        messages = [{"role": "system", "content": system_prompt}]
        for msg in history:
            messages.append({"role": msg["role"], "content": msg["content"]})
        
        if action == "briefing":
            messages.append({"role": "user", "content": "Return Farm Briefing. Format:\nFarm Briefing\n\nWeather\n* Single most important weather insight\n\nMarket\n* Current price\n* Opportunity if meaningful\n\nPlot Status\n* Crop\n* Area\n* One operational observation\n\nToday’s Actions\n* Maximum 3 actions"})
        elif action == "audit":
            messages.append({"role": "user", "content": "Return Farm Audit. Format exactly:\nFarm Score: X/100\n\nStrengths\n* Max 3 bullets\n\nRisks\n* Max 3 bullets\n\nRecommended Actions\n* Max 3 actions"})
        elif action == "explain_recommendation":
            messages.append({"role": "user", "content": f"Explain why {crop} is currently growing on this plot based on the soil NPK, pH, and weather. Format exactly:\nSuitability Factors\n✓ Positive factors\n\nLimitations\n⚠ Issues\n\nConfidence\nHigh / Medium / Low\n\nDo NOT explain crop science unless directly relevant."})
        elif action == "analyze_risks":
            messages.append({"role": "user", "content": "Return Risk Analysis. Format exactly:\nRisk Level: Low/Medium/High\n\nWeather Risk\n* One sentence\n\nMarket Risk\n* One sentence\n\nYield Risk\n* One sentence\n\nOnly mention categories supported by real data."})
        else:
            messages.append({"role": "user", "content": question})

        headers = {
            "Authorization": f"Bearer {self.groq_api_key}",
            "Content-Type": "application/json"
        }
        
        payload = {
            "model": "llama-3.3-70b-versatile",
            "messages": messages,
            "temperature": 0.5,
            "max_tokens": 1024,
        }

        print("MODEL: llama3-8b-8192")
        print("PAYLOAD:")
        print(json.dumps(payload, indent=2))
        print("MESSAGE COUNT:", len(messages))
        print("SYSTEM LENGTH:", len(system_prompt))
        print("USER LENGTH:", len(messages[-1]['content']) if messages else 0)
        
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(self.base_url, headers=headers, json=payload)
                print("STATUS:", response.status_code)
                print("BODY:", response.text)
                response.raise_for_status()
                result = response.json()
                content = result['choices'][0]['message']['content']
                return {
                    "answer": content,
                    "context_used": context_str
                }
        except Exception as e:
            print("EXCEPTION:", repr(e))
            return {
                "answer": f"I apologize, but I am unable to connect to the intelligence layer right now. Error: {str(e)}",
                "context_used": context_str
            }
