from __future__ import annotations

from datetime import date
from typing import Any, Literal

from pydantic import BaseModel, Field, field_validator


FEATURE_NAMES = [
    "rainfall",
    "NDVI",
    "SAVI",
    "soil_moisture",
    "NDWI",
    "GNDVI",
    "ndwi_mean",
    "temp_mean",
    "evi_mean",
    "crop_type",
    "elevation",
    "ndvi_mean",
    "savi_mean",
    "ndvi_max",
    "rainfall_total",
    "ndvi_std",
    "gndvi_mean",
    "rainfall_std",
    "temperature",
    "date_of_image",
    "soil_carbon",
]


class FeatureRequest(BaseModel):
    lat: float = Field(ge=-90, le=90, description="Field latitude")
    lon: float = Field(ge=-180, le=180, description="Field longitude")
    crop_type: str = Field(min_length=1, description="Crop type provided by farmer")
    start_date: date | None = Field(default=None, description="Feature window start date")
    end_date: date | None = Field(default=None, description="Feature window end date")
    window_days: int = Field(default=30, ge=7, le=180, description="Lookback days if dates omitted")
    manual_overrides: dict[str, Any] = Field(
        default_factory=dict,
        description="Any feature values manually entered by farmer override provider values.",
    )

    @field_validator("manual_overrides")
    @classmethod
    def validate_manual_override_keys(cls, value: dict[str, Any]) -> dict[str, Any]:
        unknown = sorted(set(value).difference(FEATURE_NAMES))
        if unknown:
            raise ValueError(f"Unknown override keys: {unknown}")
        return value


class FeatureSource(BaseModel):
    provider: str
    status: Literal["ok", "missing", "manual", "error"]
    note: str | None = None


class FeatureResponse(BaseModel):
    values: dict[str, Any]
    sources: dict[str, FeatureSource]
    missing_features: list[str]
    warnings: list[str]
    used_window: dict[str, str]


class PredictionRequest(BaseModel):
    features: dict[str, Any]


class PredictionResponse(BaseModel):
    predicted_yield_ton_per_ha: float
    confidence_percent: int
    model_name: str
    notes: list[str]


class CropRecommendationRequest(BaseModel):
    nitrogen: float | None = Field(default=None, description="Nitrogen (N) content in soil ppm")
    phosphorus: float | None = Field(default=None, description="Phosphorus (P) content in soil ppm")
    potassium: float | None = Field(default=None, description="Potassium (K) content in soil ppm")
    temperature: float | None = Field(default=None, description="Average temperature in Celsius")
    humidity: float | None = Field(default=None, description="Average humidity in percentage")
    pH: float | None = Field(default=None, description="Soil pH value")
    rainfall: float | None = Field(default=None, description="Rainfall in mm")


class CropRecommendationResponse(BaseModel):
    recommended_crop: str
    confidence_percent: float
    all_probabilities: dict[str, float]
    model_name: str
    notes: str


class PolygonPoint(BaseModel):
    x: float = Field(ge=0, description="X coordinate in original image pixels")
    y: float = Field(ge=0, description="Y coordinate in original image pixels")


class PHDetectionRequest(BaseModel):
    image_base64: str = Field(description="Base64-encoded image of pH strip")
    points: list[PolygonPoint] | None = Field(
        default=None,
        min_length=4,
        max_length=4,
        description="Optional 4-point polygon ROI in original image coordinates",
    )
    roi_x: int | None = Field(default=None, description="Optional ROI x coordinate")
    roi_y: int | None = Field(default=None, description="Optional ROI y coordinate")
    roi_w: int | None = Field(default=None, description="Optional ROI width")
    roi_h: int | None = Field(default=None, description="Optional ROI height")


class PHDetectionResponse(BaseModel):
    detected_ph: float = Field(description="Detected pH value (1-13)")
    confidence_percent: float = Field(description="Confidence score (0-100)")
    color_name: str = Field(description="Detected color name")
    nature: str = Field(description="Soil nature: ACIDIC, NEUTRAL, or BASIC")
    lab_values: dict[str, float] = Field(description="LAB color space values")
    model_name: str
    notes: str


class FertilizerRecommendationRequest(BaseModel):
    soil_type: str = Field(description="Type of soil (Clay, Silt, Sandy, etc.)")
    soil_ph: float = Field(description="Soil pH level")
    soil_moisture: float = Field(description="Soil moisture content")
    organic_carbon: float = Field(description="Organic carbon content")
    electrical_conductivity: float = Field(description="Electrical conductivity")
    nitrogen_level: float = Field(description="Nitrogen (N) level")
    phosphorus_level: float = Field(description="Phosphorus (P) level")
    potassium_level: float = Field(description="Potassium (K) level")
    temperature: float = Field(description="Ambient temperature in Celsius")
    humidity: float = Field(description="Ambient humidity in percentage")
    rainfall: float = Field(description="Rainfall in mm")
    crop_type: str = Field(description="Target crop type")
    crop_growth_stage: str = Field(description="Current growth stage of crop")
    season: str = Field(description="Current farming season")
    irrigation_type: str = Field(description="Method of irrigation")
    previous_crop: str = Field(description="Crop grown in previous cycle")
    region: str = Field(description="Geographic region")
    fertilizer_used_last_season: float = Field(description="Amount of fertilizer used previously")
    yield_last_season: float = Field(description="Yield obtained in previous cycle")


class FertilizerRecommendationResponse(BaseModel):
    recommendation: str
    confidence_percent: float
    all_probabilities: dict[str, float]
    input_received: dict[str, Any]
    model_name: str = "Fertilizer Recommendation (Improved Voting Ensemble)"
    notes: str | None = None


class DiseaseDetectionResponse(BaseModel):
    disease: str
    confidence: float
    status: str = "ok"


class ChatMessage(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    message: str
    history: list[ChatMessage] = []
    context: dict = {}


class ChatResponse(BaseModel):
    reply: str
    model_name: str = "gpt-4o-mini"
