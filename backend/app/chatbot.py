import os
from dotenv import load_dotenv
from openai import OpenAI

load_dotenv()
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

SYSTEM_PROMPT = """You are an expert AI agronomist assistant for a smart agriculture platform called 360 Degree Agri.

You help farmers and agricultural professionals with:
- Crop selection and recommendations
- Fertilizer advice and soil nutrition
- Plant disease diagnosis and treatment
- Soil pH management
- General farming best practices

You have access to outputs from 5 ML models:
- Crop Recommendation (99.70% accuracy)
- Fertilizer Recommendation (89.87% accuracy)  
- Plant Disease Detection (98.54% accuracy, 38 classes)
- Soil pH Detection (LAB color matching)
- Yield Prediction (GEE-based feature extraction)

You ONLY answer questions related to agriculture, farming, crops, soil, fertilizers, and plant health. For any other topic, respond with: "I'm an agricultural assistant and can only help with farming and agriculture related questions."

When context from these models is provided, use it to give specific actionable advice.
Keep responses concise, practical, and farmer-friendly.
Always recommend consulting a local agronomist for critical decisions."""

def chat(message: str, history: list = [], context: dict = {}) -> str:
    messages = [{"role": "system", "content": SYSTEM_PROMPT}]

    # Inject model context if available
    if context:
        context_str = "Current analysis context:\n"
        if context.get("crop"):
            context_str += f"- Recommended crop: {context['crop']}\n"
        if context.get("fertilizer"):
            context_str += f"- Recommended fertilizer: {context['fertilizer']}\n"
        if context.get("disease"):
            context_str += f"- Detected disease: {context['disease']}\n"
        if context.get("ph"):
            context_str += f"- Soil pH: {context['ph']} ({context.get('ph_nature', '')})\n"
        messages.append({"role": "system", "content": context_str})

    # Add conversation history
    for msg in history:
        messages.append(msg)

    # Add current message
    messages.append({"role": "user", "content": message})

    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=messages,
        max_tokens=500,
        temperature=0.7,
    )

    return response.choices[0].message.content
