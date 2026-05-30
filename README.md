# 360 Degree Agri

> AI-powered smart farming suite

[![Python 3.13](https://img.shields.io/badge/python-3.13-blue?logo=python&logoColor=white)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-%2300ACC1.svg?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/React-%2320232a.svg?logo=react&logoColor=%2361DAFB)](https://reactjs.org/)
[![Docker](https://img.shields.io/badge/Docker-%230db7ed.svg?logo=docker&logoColor=white)](https://www.docker.com/)
[![CI](https://github.com/gaurangpatil97/360-Agri/actions/workflows/ci.yml/badge.svg)](https://github.com/gaurangpatil97/360-Agri/actions)

---

## Overview

360 Degree Agri is a full-stack, open-source smart agriculture platform that brings together machine learning, computer vision, geospatial data, and a conversational AI assistant to help farmers, agronomists, researchers, and agri-tech teams make better decisions. The system runs modular services for yield forecasting, crop and fertilizer recommendations, plant disease detection, soil pH analysis, and real-time monitoring — all accessible via a REST API and a reactive dashboard.

Built to be deployable locally or in containers, 360 Degree Agri targets production-minded users who need a reproducible, portable toolkit for precision farming experiments, field pilots, and research. The project provides ready-to-use ML models, simple APIs, and an extensible front-end so teams can iterate quickly and integrate additional sensors or data sources.

## Features

- **Yield Prediction** — Geospatial and weather-aware ML models for forecasting crop yield across fields and seasons.
- **Crop Recommendation** — Recommends optimal crops using soil nutrient features and a Random Forest model.
- **Fertilizer Recommendation** — End-to-end ML pipeline to suggest fertilizer mixes based on soil conditions and crop needs.
- **Plant Disease Detection** — CNN-based image classifier for common plant diseases with probabilistic outputs and explainability hooks.
- **Soil pH Detection** — Computer-vision pipeline that analyzes soil color samples to estimate pH values.
- **AI Agronomist Chatbot** — Conversational assistant powered by GPT-4o-mini for agronomy Q&A and step-by-step guidance.
- **Real-time Monitoring Dashboard** — Request logging, runtime metrics, and interactive charts built with Recharts for quick operational visibility.

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | FastAPI, Uvicorn, Python 3.13 |
| Frontend | React + Vite |
| Charts | Recharts |
| ML | TensorFlow / Keras, scikit-learn |
| CV | OpenCV |
| Database | SQLite (lightweight local storage) |
| Packaging | Docker, docker-compose |
| CI | GitHub Actions |

## Project Structure

```
.
├── docker-compose.yml
├── README.md
├── backend/
│   ├── Dockerfile
│   ├── README.md
│   ├── requirements.txt
│   ├── run.sh
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py
│   │   ├── chatbot.py
│   │   ├── crop_recommender.py
│   │   ├── disease_detector.py
│   │   ├── fertilizer_recommender.py
│   │   ├── ph_detector.py
│   │   ├── predictor.py
│   │   ├── providers.py
│   │   ├── schemas.py
│   │   ├── middleware.py
│   │   └── monitoring.py
│   └── backendvenv/ (optional local virtualenv)
├── frontend/
│   ├── Dockerfile
│   ├── package.json
│   ├── vite.config.js
│   ├── index.html
│   └── src/
│       ├── main.jsx
│       ├── App.jsx
│       ├── index.css
│       ├── components/
│       └── pages/
│           ├── ChatBot.jsx
│           ├── CropRecommendation.jsx
│           ├── DiseaseDetection.jsx
│           ├── FertilizerRecommendation.jsx
│           ├── Monitoring.jsx
│           ├── PlantDiseaseDetection.jsx
│           ├── SoilPHDetection.jsx
│           └── YieldPrediction.jsx
├── models/ (trained artifacts)
│   ├── crop_recommendation/
│   ├── fertilizer_recommendation/
│   └── plant_disease_detection/
└── models-experm/ (experiments & notebooks)

```

## Getting Started

Two common development workflows are supported: local development and containerized deployment.

### Local (development)

1. Backend: create and activate a virtual environment, install dependencies, and start Uvicorn.

```bash
python -m venv backendvenv
# Windows
backendvenv\Scripts\activate
# macOS / Linux
# source backendvenv/bin/activate
pip install -r backend/requirements.txt
cd backend
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

2. Frontend: install packages and run Vite dev server.

```bash
cd frontend
npm install
npm run dev
```

Open the frontend URL printed by Vite (typically `http://localhost:5173`) and the API at `http://localhost:8000`.

### Docker (recommended for parity)

Build and start everything with Docker Compose:

```bash
docker compose up --build
```

This builds backend and frontend images, starts the API, and serves the single-page app. Use `docker compose down` to stop and remove containers.

## Environment Variables

| Variable | Required | Description |
|---|---:|---|
| `OPENAI_API_KEY` | Yes | API key for the AI Agronomist chatbot (OpenAI). |
| `DATABASE_URL` | Yes | SQLite or SQLAlchemy URL, e.g. `sqlite:///./data.db` |
| `MODEL_DIR` | Yes | Path to directory containing trained model artifacts (relative to backend). |
| `WEATHER_API_KEY` | No | Optional: API key for weather/geospatial provider used by yield prediction. |
| `SECRET_KEY` | Yes | Application secret for signing tokens or session data. |
| `SENTRY_DSN` | No | Optional: Sentry DSN for error monitoring. |

Place environment variables in a `.env` file at the project root for local runs or provide them in your deployment environment.

## API Endpoints

| Module | Method | Path | Description |
|---|---:|---|---|
| Yield Prediction | POST | `/api/predict/yield` | Submit field geometry + features to get yield forecast and confidence intervals. |
| Crop Recommendation | POST | `/api/recommend/crop` | Send soil nutrient features and context to receive crop ranking and probabilities. |
| Fertilizer Recommendation | POST | `/api/recommend/fertilizer` | Request fertilizer mixture suggestions given soil tests and target crop. |
| Plant Disease Detection | POST | `/api/detect/disease` | Upload an image of a plant leaf; returns disease label(s) and scores. |
| Soil pH Detection | POST | `/api/detect/ph` | Upload soil sample image or color patch; returns estimated pH and confidence. |
| AI Agronomist Chatbot | POST | `/api/chat` | Conversational endpoint for agronomy Q&A (context + message → assistant reply). |

Notes:
- All endpoints accept and return JSON unless noted (image endpoints accept `multipart/form-data`).
- See `backend/app/schemas.py` for request/response shapes and validation models.

## Monitoring

The Real-time Monitoring Dashboard provides a quick operational view of request volumes, latency, error counts, and model inference times. The backend includes a lightweight request-logging middleware and aggregates metrics used by the frontend charts (Recharts). Use the dashboard to monitor:

- Request rate and error rate per endpoint
- Average and p50/p95/p99 latencies
- Model inference times and throughput
- Recent request logs and sample payloads

## CI/CD

This repository is configured to use GitHub Actions to validate changes. Typical pipeline stages include:

- Install Python dependencies and run backend linters/tests
- Build and test frontend bundle
- Build Docker images for backend and frontend
- Optionally publish images or create releases on merge to `main`

Adjust `.github/workflows/ci.yml` to match your registry and test matrix.

## License

This project is released under the MIT License. See the `LICENSE` file for details.

---

Contributions welcome — open issues or pull requests to propose features, bug fixes, or model improvements.
