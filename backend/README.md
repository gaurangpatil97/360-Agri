# 360-Agri FastAPI Backend

This backend builds the 20-feature vector for your yield prediction model from a farmer's location + crop input.

## APIs used

- Open-Meteo Archive API (no key): rainfall, temperature, temp_mean, rainfall_total, rainfall_std, soil_moisture
- OpenTopoData SRTM90m (no key): elevation
- SoilGrids v2 (no key): soil_carbon
- Sentinel Hub Statistical API (needs credentials): NDVI/SAVI/NDWI/GNDVI/EVI derived features

## Why Sentinel Hub for vegetation indices?

Your features include derived spectral indices and statistics over time (`NDVI`, `SAVI`, `NDWI`, `GNDVI`, `evi_mean`, `ndvi_max`, `ndvi_std`, etc.).
Those are best fetched from Sentinel-2 reflectance and computed server-side, which this implementation does through Sentinel Hub.

If Sentinel Hub credentials are not configured, the endpoint still works and returns other features while flagging missing index features.

## Prediction model integration (your trained model)

The `/v1/yield/predict` endpoint now uses your serialized model package (`best_model.pkl`) and applies preprocessing aligned to your training script:

- drops `system:index`, `.geo`, `field_id`
- parses date columns into `*_year`, `*_month`, `*_doy`
- label-encodes `crop_type` using mapping
- aligns to scaler feature order
- applies scaler -> selected_features -> model predict
- applies inverse `log1p` transform when `log_transform=True`

Place your model package at:

- `backend/models/best_model.pkl` (default), or
- set `YIELD_MODEL_PATH` in environment

Recommended: include `crop_type_mapping` in your model package to ensure exact label encoding consistency.

## Setup

```bash
cd backend
python -m venv .venv
# Windows bash
source .venv/Scripts/activate
pip install -r requirements.txt
cp .env.example .env
```

## Run

```bash
uvicorn app.main:app --reload --port 8000
```

## Endpoints

- `GET /health`
- `GET /v1/yield/features/providers`
- `POST /v1/yield/features/build`
- `POST /v1/yield/predict`

## Example request

```json
{
  "lat": 28.6139,
  "lon": 77.2090,
  "crop_type": "wheat",
  "window_days": 30,
  "manual_overrides": {
    "soil_carbon": 12.5
  }
}
```

## Example response behavior

- Returns all 20 feature keys in `values`
- Includes per-feature `sources` metadata
- `missing_features` lists values still null
- `manual_overrides` always wins over API-fetched values
