from __future__ import annotations

import os
from dotenv import load_dotenv
from datetime import date, timedelta

load_dotenv()

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

try:
    from .predictor import YieldPredictor
    from .crop_recommender import CropRecommender
    from .ph_detector import PHDetector
    from .fertilizer_recommender import FertilizerRecommender
    from .providers import FeatureProviders
    from .schemas import (
        FEATURE_NAMES,
        FeatureRequest,
        FeatureResponse,
        FeatureSource,
        PredictionRequest,
        PredictionResponse,
        CropRecommendationRequest,
        CropRecommendationResponse,
        PHDetectionRequest,
        PHDetectionResponse,
        FertilizerRecommendationRequest,
        FertilizerRecommendationResponse,
    )
except ImportError:
    # Allows running this file directly via `python main.py` from the app directory.
    import sys
    from pathlib import Path

    current_dir = Path(__file__).resolve().parent
    backend_dir = current_dir.parent
    if str(current_dir) not in sys.path:
        sys.path.insert(0, str(current_dir))
    if str(backend_dir) not in sys.path:
        sys.path.insert(0, str(backend_dir))

    from app.predictor import YieldPredictor
    from app.crop_recommender import CropRecommender
    from app.ph_detector import PHDetector
    from app.fertilizer_recommender import FertilizerRecommender
    from app.providers import FeatureProviders
    from app.schemas import (
        FEATURE_NAMES,
        FeatureRequest,
        FeatureResponse,
        FeatureSource,
        PredictionRequest,
        PredictionResponse,
        CropRecommendationRequest,
        CropRecommendationResponse,
        PHDetectionRequest,
        PHDetectionResponse,
        FertilizerRecommendationRequest,
        FertilizerRecommendationResponse,
    )


app = FastAPI(
    title="360-Agri Yield Feature Service",
    version="0.1.0",
    description="Fetches yield-model input features from geospatial and weather APIs for a given field location.",
)

origins_raw = os.getenv("ALLOW_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173")
allow_origins = [o.strip() for o in origins_raw.split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=allow_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

providers = FeatureProviders()
predictor = YieldPredictor()
recommender = CropRecommender()
ph_detector = PHDetector()
fertilizer_recommender = FertilizerRecommender()


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/v1/yield/features/providers")
async def list_providers() -> dict[str, dict[str, str]]:
    return {
        "rainfall": {"provider": "open-meteo-archive", "note": "Daily precipitation"},
        "temperature": {"provider": "open-meteo-archive", "note": "Daily mean temperature"},
        "temp_mean": {"provider": "open-meteo-archive", "note": "Mean temp in date window"},
        "rainfall_total": {"provider": "open-meteo-archive", "note": "Total rain in date window"},
        "rainfall_std": {"provider": "open-meteo-archive", "note": "Rainfall variation"},
        "soil_moisture": {"provider": "open-meteo-archive", "note": "0-7cm mean soil moisture"},
        "elevation": {"provider": "opentopodata-srtm90m", "note": "Elevation at location"},
        "soil_carbon": {"provider": "soilgrids-v2", "note": "0-5cm organic carbon density"},
        "NDVI": {"provider": "sentinel-hub-statistical-api", "note": "Optional creds required"},
        "SAVI": {"provider": "sentinel-hub-statistical-api", "note": "Optional creds required"},
        "NDWI": {"provider": "sentinel-hub-statistical-api", "note": "Optional creds required"},
        "GNDVI": {"provider": "sentinel-hub-statistical-api", "note": "Optional creds required"},
        "ndvi_mean": {"provider": "sentinel-hub-statistical-api", "note": "Optional creds required"},
        "savi_mean": {"provider": "sentinel-hub-statistical-api", "note": "Optional creds required"},
        "ndwi_mean": {"provider": "sentinel-hub-statistical-api", "note": "Optional creds required"},
        "gndvi_mean": {"provider": "sentinel-hub-statistical-api", "note": "Optional creds required"},
        "evi_mean": {"provider": "sentinel-hub-statistical-api", "note": "Optional creds required"},
        "ndvi_max": {"provider": "sentinel-hub-statistical-api", "note": "Optional creds required"},
        "ndvi_std": {"provider": "sentinel-hub-statistical-api", "note": "Optional creds required"},
        "crop_type": {"provider": "farmer_input", "note": "Required manual field"},
        "date_of_image": {"provider": "system_date", "note": "Observation date used to derive month and day-of-year"},
    }


@app.post("/v1/yield/features/build", response_model=FeatureResponse)
async def build_features(payload: FeatureRequest) -> FeatureResponse:
    end = payload.end_date or date.today()
    start = payload.start_date or (end - timedelta(days=payload.window_days - 1))

    collected = await providers.collect_all(
        lat=payload.lat,
        lon=payload.lon,
        start_date=start,
        end_date=end,
        crop_type=payload.crop_type,
    )

    collected.values["date_of_image"] = end.isoformat()
    collected.sources["date_of_image"] = {
        "provider": "system_date",
        "status": "ok",
        "note": "Selected observation date used for date-derived features",
    }

    values = {name: collected.values.get(name) for name in FEATURE_NAMES}
    sources: dict[str, FeatureSource] = {}

    for name in FEATURE_NAMES:
        src = collected.sources.get(name)
        if src is None:
            sources[name] = FeatureSource(provider="unassigned", status="missing", note="No provider returned value")
        else:
            sources[name] = FeatureSource(**src)

    for key, value in payload.manual_overrides.items():
        values[key] = value
        sources[key] = FeatureSource(provider="farmer_override", status="manual", note="Farmer provided manual value")

    missing_features = [k for k, v in values.items() if v is None]

    return FeatureResponse(
        values=values,
        sources=sources,
        missing_features=missing_features,
        warnings=collected.warnings,
        used_window={"start_date": start.isoformat(), "end_date": end.isoformat()},
    )


@app.post("/v1/yield/predict", response_model=PredictionResponse)
async def predict_yield(payload: PredictionRequest) -> PredictionResponse:
    try:
        predicted, confidence, notes = predictor.predict(payload.features)
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc

    return PredictionResponse(
        predicted_yield_ton_per_ha=predicted,
        confidence_percent=confidence,
        model_name=predictor.model_name,
        notes=notes,
    )


@app.post("/v1/crop/recommend", response_model=CropRecommendationResponse)
async def recommend_crop(payload: CropRecommendationRequest) -> CropRecommendationResponse:
    """
    Recommend suitable crop based on soil nutrients, temperature, humidity, pH, and rainfall.
    
    Input features:
    - nitrogen: N content in soil (ppm), default 60
    - phosphorus: P content in soil (ppm), default 35
    - potassium: K content in soil (ppm), default 40
    - temperature: Average temperature (°C), default 25
    - humidity: Relative humidity (%), default 60
    - pH: Soil pH value, default 6.5
    - rainfall: Rainfall (mm), default 100
    
    Returns recommended crop with confidence (0-100%) and probabilities for all crops.
    """
    try:
        features = payload.dict()
        crop_name, confidence, all_probs, notes = recommender.predict(features)
    except (ValueError, RuntimeError) as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    return CropRecommendationResponse(
        recommended_crop=crop_name,
        confidence_percent=round(confidence * 100, 2),
        all_probabilities=all_probs,
        model_name=recommender.model_name,
        notes=notes,
    )


@app.post("/v1/ph/detect", response_model=PHDetectionResponse)
async def detect_ph(payload: PHDetectionRequest) -> PHDetectionResponse:
    """
    Detect soil pH from image of pH strip.
    
    The image should show a pH indicator strip with a clear colored region.
    The API will auto-detect the colored region and analyze the color in LAB space
    to determine the pH value (1-13).
    
    Input:
    - image_base64: Base64-encoded image (PNG/JPG)
    - roi_x, roi_y, roi_w, roi_h: Optional region of interest coordinates
    
    Returns detected pH, confidence, color name, and soil nature (acidic/neutral/basic)
    """
    try:
        import base64
        image_bytes = base64.b64decode(payload.image_base64)
        
        ph_value, confidence, metadata = ph_detector.detect(
            image_bytes=image_bytes,
            x=payload.roi_x,
            y=payload.roi_y,
            w=payload.roi_w,
            h=payload.roi_h
        )
    except (ValueError, RuntimeError) as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    
    return PHDetectionResponse(
        detected_ph=ph_value,
        confidence_percent=round(confidence, 2),
        color_name=metadata.get("color_name", "Unknown"),
        nature=metadata.get("nature", "UNKNOWN"),
        lab_values=metadata.get("lab_values", {}),
        model_name=ph_detector.model_name,
        notes=metadata.get("notes", ""),
    )


@app.post("/v1/fertilizer/recommend", response_model=FertilizerRecommendationResponse)
async def recommend_fertilizer(payload: FertilizerRecommendationRequest) -> FertilizerRecommendationResponse:
    """
    Recommend fertilizer based on soil conditions, crop stage, and history.
    """
    result = fertilizer_recommender.predict(payload.dict())
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    
    return FertilizerRecommendationResponse(
        recommendation=result["recommendation"],
        confidence_percent=round(result["confidence"] * 100, 2),
        all_probabilities=result["probabilities"],
        input_received=result["input_received"],
        notes=result.get("notes")
    )


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=5000)
