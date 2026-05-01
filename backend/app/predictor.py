from __future__ import annotations

import os
import pickle
from dataclasses import dataclass
from typing import Any

import numpy as np
import pandas as pd


SYSTEM_GEO_COLS = ["system:index", ".geo", "field_id"]
DEFAULT_CROP_MAP = {
    "rice": 0,
    "wheat": 1,
    "maize": 2,
    "cotton": 3,
    "sugarcane": 4,
    "soybean": 5,
    "barley": 6,
    "millet": 7,
    "pulses": 8,
}


@dataclass
class PredictionArtifacts:
    model: Any
    scaler: Any
    selected_features: list[str]
    log_transform: bool
    scaler_features: list[str]


class YieldPredictor:
    """Inference service aligned with the training pipeline shared by the user.

    Expected model package keys from training script:
      - model
      - scaler
      - selected_features
      - log_transform

    Optional (recommended) for strict consistency:
      - crop_type_mapping: dict[str, int]
    """

    def __init__(self) -> None:
        self.model_name = "dataset_aligned_inference_v1"
        self.crop_type_mapping = DEFAULT_CROP_MAP.copy()
        self.artifacts = self._load_artifacts()

    def _load_artifacts(self) -> PredictionArtifacts | None:
        env_path = os.getenv("YIELD_MODEL_PATH")
        if not env_path:  # Handle None or empty string
            model_path = os.path.join(os.path.dirname(__file__), "..", "models", "best_model.pkl")
        else:
            model_path = env_path
            
        model_path = os.path.abspath(model_path)

        if not os.path.exists(model_path) or os.path.isdir(model_path):
            return None

        with open(model_path, "rb") as f:
            package = pickle.load(f)

        model = package["model"]
        scaler = package["scaler"]
        selected_features = list(package["selected_features"])
        log_transform = bool(package.get("log_transform", False))

        if "crop_type_mapping" in package and isinstance(package["crop_type_mapping"], dict):
            self.crop_type_mapping = {str(k).lower(): int(v) for k, v in package["crop_type_mapping"].items()}

        scaler_features = list(getattr(scaler, "feature_names_in_", selected_features))

        return PredictionArtifacts(
            model=model,
            scaler=scaler,
            selected_features=selected_features,
            log_transform=log_transform,
            scaler_features=scaler_features,
        )

    def predict(self, features: dict[str, Any]) -> tuple[float, int, list[str]]:
        if self.artifacts is None:
            raise RuntimeError(
                "Model artifacts not found. Place best_model.pkl at backend/models/best_model.pkl "
                "or set YIELD_MODEL_PATH."
            )

        prepared_df, preprocess_notes = self._preprocess_features(features)

        scaled = self.artifacts.scaler.transform(prepared_df)
        scaled_df = pd.DataFrame(scaled, columns=self.artifacts.scaler_features)

        selected_matrix = scaled_df[self.artifacts.selected_features]
        pred = self.artifacts.model.predict(selected_matrix)
        pred_value = float(pred[0])

        if self.artifacts.log_transform:
            pred_value = float(np.expm1(pred_value))

        # Confidence heuristic: degrade when required features were forced/defaulted.
        defaults_used = sum(1 for note in preprocess_notes if note.startswith("defaulted:"))
        confidence = int(round(max(55.0, min(96.0, 94.0 - 2.0 * defaults_used))))

        return round(pred_value, 4), confidence, preprocess_notes

    def _preprocess_features(self, raw_features: dict[str, Any]) -> tuple[pd.DataFrame, list[str]]:
        row = dict(raw_features)
        notes: list[str] = []

        # Match training: remove system/geo/helper columns.
        for col in SYSTEM_GEO_COLS:
            row.pop(col, None)

        # Match training: date columns -> year/month/day-of-year.
        for key in list(row.keys()):
            if "date" in key.lower() and row.get(key) not in (None, ""):
                dt = pd.to_datetime(str(row[key]), errors="coerce", dayfirst=True)
                if pd.notna(dt):
                    row[f"{key}_year"] = int(dt.year)
                    row[f"{key}_month"] = int(dt.month)
                    row[f"{key}_doy"] = int(dt.dayofyear)
                row.pop(key, None)

        # Match training: crop_type label encoding.
        if "crop_type" in row:
            row["crop_type"] = self._encode_crop_type(row.get("crop_type"), notes)

        prepared = {}
        for col in self.artifacts.scaler_features:
            value = row.get(col, None)
            numeric_value = self._to_numeric(value)
            if numeric_value is None:
                # Training had KNN imputation; inference package does not include imputer.
                # Deterministic fallback uses 0.0 and records an explicit note.
                numeric_value = 0.0
                notes.append(f"defaulted:{col}")
            prepared[col] = numeric_value

        df = pd.DataFrame([prepared], columns=self.artifacts.scaler_features)
        return df, notes

    def _encode_crop_type(self, crop_value: Any, notes: list[str]) -> int:
        if crop_value is None:
            notes.append("defaulted:crop_type")
            return 0

        if isinstance(crop_value, (int, np.integer, float, np.floating)):
            return int(crop_value)

        key = str(crop_value).strip().lower()
        if key in self.crop_type_mapping:
            return self.crop_type_mapping[key]

        notes.append(f"defaulted:crop_type_unknown:{crop_value}")
        return 0

    @staticmethod
    def _to_numeric(value: Any) -> float | None:
        try:
            if value is None or value == "":
                return None
            num = float(value)
            if np.isnan(num):
                return None
            return num
        except Exception:
            return None
