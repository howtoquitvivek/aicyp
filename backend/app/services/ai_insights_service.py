import os
import json
import httpx
from typing import Dict, Any

class AIInsightsService:
    def __init__(self):
        self.groq_api_key = os.getenv('GROQ_API_KEY')
        self.base_url = "https://api.groq.com/openai/v1/chat/completions"

    async def get_plot_insights(self, plot_data: Dict[str, Any]) -> Dict[str, list]:
        if not self.groq_api_key:
            return self._get_fallback_insights(plot_data)

        prompt = self._build_prompt(plot_data)
        
        headers = {
            "Authorization": f"Bearer {self.groq_api_key}",
            "Content-Type": "application/json"
        }
        
        payload = {
            "model": "llama-3.3-70b-versatile",
            "messages": [
                {"role": "system", "content": "You are a concise agricultural intelligence AI. Return ONLY a valid JSON object with an 'insights' array containing 3-5 short, single-sentence string insights. Use no markdown formatting (e.g. no ```json). Follow the prompt rules exactly."},
                {"role": "user", "content": prompt}
            ],
            "temperature": 0.3,
            "max_tokens": 300,
            "response_format": { "type": "json_object" }
        }

        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.post(self.base_url, headers=headers, json=payload)
                response.raise_for_status()
                result = response.json()
                content = result['choices'][0]['message']['content']
                data = json.loads(content)
                if 'insights' in data and isinstance(data['insights'], list):
                    return data
                return self._get_fallback_insights(plot_data)
        except Exception as e:
            print(f"Groq API Error: {str(e)}")
            return self._get_fallback_insights(plot_data)

    def _build_prompt(self, plot_data: Dict[str, Any]) -> str:
        return f"""
Analyze this specific agricultural plot and generate 3-5 short, actionable insights.

Plot Data:
{json.dumps(plot_data, indent=2)}

Rules:
* Maximum 1 sentence each.
* No markdown.
* No bullet nesting.
* No disclaimers or conversational text.
* No hallucinated statistics.
* Use only supplied data.
* Mention actual numbers whenever available (e.g., temperatures, acres, percentages, Rs/qtl).
* Avoid repeating dashboard KPI labels verbatim.
* Focus on actionable or context-aware observations about this specific plot.
* Mention data freshness when stale (e.g., if price is 30 days old).
* Mention market spread when meaningful (e.g., if another market is offering significantly more).
* Do not invent future prices.
* Do not predict markets.
* Do not provide financial guarantees.

Output strictly as JSON:
{{
  "insights": [
    "Insight 1",
    "Insight 2",
    "Insight 3"
  ]
}}
"""

    def _get_fallback_insights(self, plot_data: Dict[str, Any]) -> Dict[str, list]:
        insights = []
        crop = plot_data.get('crop', 'the crop')
        
        temp = plot_data.get('temperature')
        if temp is not None:
            if temp > 35:
                insights.append(f"Current temperature ({temp}°C) is above the ideal range for {crop}.")
            elif temp < 15:
                insights.append(f"Current temperature ({temp}°C) is quite low for optimal {crop} growth.")
            else:
                insights.append(f"Current temperature ({temp}°C) is favorable for {crop} cultivation.")
                
        area_share = plot_data.get('areaSharePercent')
        if area_share:
            insights.append(f"This plot contributes {area_share}% of total farm acreage.")
            
        soil = plot_data.get('soilType')
        if soil:
            insights.append(f"{soil} soil is generally suitable for {crop} cultivation.")
            
        price = plot_data.get('marketPrice')
        if price:
            insights.append(f"Current market price for {crop} is ₹{price}/qtl.")
            
        yield_est = plot_data.get('expectedYield')
        if yield_est:
            insights.append(f"Estimated yield is {yield_est} tons for this parcel.")

        # Ensure we return 3-5 insights
        return {
            "insights": insights[:5] if insights else ["No specific insights available at this time."]
        }

ai_insights_service = AIInsightsService()
