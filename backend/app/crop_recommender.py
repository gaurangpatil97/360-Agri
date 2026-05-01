"""
Crop Recommendation Model Predictor
Loads trained crop recommendation pipeline and performs predictions with confidence scores
"""

import pickle
import os
from pathlib import Path
from typing import Dict, Tuple, Any


class CropRecommender:
    """Crop recommendation predictor using trained sklearn pipeline and label encoder"""
    
    def __init__(self, model_dir: str = None):
        """
        Initialize crop recommender with saved pipeline and label encoder
        
        Args:
            model_dir: Directory containing agri_pipeline.pkl and label_encoder.pkl
                      Defaults to models-experm/crop_recommendation relative to project root
        """
        if model_dir is None:
            # From backend/app/, go up 3 levels to reach 360-Agri (the project root)
            # backend/app -> backend -> 360-Agri
            backend_dir = Path(__file__).parent.parent  # backend/
            project_root = backend_dir.parent  # 360-Agri/
            model_dir = project_root / "models-experm" / "crop_recommendation"
        
        self.model_dir = Path(model_dir)
        self.pipeline_path = self.model_dir / "agri_pipeline.pkl"
        self.encoder_path = self.model_dir / "label_encoder.pkl"
        self.model_name = "Crop Recommendation (Random Forest + StandardScaler)"
        self.feature_names = ["nitrogen", "phosphorus", "potassium", "temperature", "humidity", "pH", "rainfall"]
        
        self.pipeline = None
        self.label_encoder = None
        self._load_artifacts()
    
    def _load_artifacts(self):
        """Load pipeline and label encoder from disk"""
        try:
            if not self.pipeline_path.exists():
                raise FileNotFoundError(f"Pipeline not found: {self.pipeline_path}")
            if not self.encoder_path.exists():
                raise FileNotFoundError(f"Label encoder not found: {self.encoder_path}")
            
            with open(self.pipeline_path, 'rb') as f:
                self.pipeline = pickle.load(f)
            
            with open(self.encoder_path, 'rb') as f:
                self.label_encoder = pickle.load(f)
            
            print(f"[OK] Crop recommender loaded: {self.pipeline_path}")
            print(f"  Available crops: {len(self.label_encoder.classes_)} ({', '.join(self.label_encoder.classes_[:5])}...)")
        
        except Exception as e:
            raise RuntimeError(f"Failed to load crop recommendation model: {e}")
    
    def predict(self, features: Dict[str, float]) -> Tuple[str, float, Dict[str, float], str]:
        """
        Predict recommended crop with confidence and all crop probabilities
        
        Args:
            features: Dict with keys: nitrogen, phosphorus, potassium, temperature, humidity, pH, rainfall
        
        Returns:
            Tuple of (recommended_crop, confidence, all_probabilities_dict, notes)
        """
        if self.pipeline is None or self.label_encoder is None:
            raise RuntimeError("Model not loaded")
        
        import numpy as np
        
        # Extract features in correct order
        try:
            feature_values = [
                self._to_numeric(features.get("nitrogen"), 60.0),
                self._to_numeric(features.get("phosphorus"), 35.0),
                self._to_numeric(features.get("potassium"), 40.0),
                self._to_numeric(features.get("temperature"), 25.0),
                self._to_numeric(features.get("humidity"), 60.0),
                self._to_numeric(features.get("pH"), 6.5),
                self._to_numeric(features.get("rainfall"), 100.0),
            ]
        except Exception as e:
            raise ValueError(f"Invalid feature values: {e}")
        
        # Check for defaults used
        defaults_used = []
        for i, (key, default) in enumerate([
            ("nitrogen", 60.0), ("phosphorus", 35.0), ("potassium", 40.0),
            ("temperature", 25.0), ("humidity", 60.0), ("pH", 6.5), ("rainfall", 100.0)
        ]):
            if features.get(key) is None or str(features.get(key)).strip() == "":
                defaults_used.append(key)
        
        # Predict
        X = np.array([feature_values])
        
        try:
            pred_class = self.pipeline.predict(X)[0]
            probabilities = self.pipeline.predict_proba(X)[0]
        except Exception as e:
            raise RuntimeError(f"Model prediction failed: {e}")
        
        # Get crop name and confidence
        crop_name = self.label_encoder.inverse_transform([pred_class])[0]
        confidence = float(probabilities.max())
        
        # Build all probabilities dict
        all_probs = {
            crop: float(prob) 
            for crop, prob in zip(self.label_encoder.classes_, probabilities)
            if prob > 0  # Only include non-zero probabilities
        }
        
        # Sort by probability descending
        all_probs = dict(sorted(all_probs.items(), key=lambda x: x[1], reverse=True))
        
        # Notes
        notes = ""
        if defaults_used:
            notes += f"Using default values for: {', '.join(defaults_used)}. "
        if confidence < 0.7:
            notes += f"Low confidence ({confidence:.1%}) - consider other top recommendations."
        
        return crop_name, confidence, all_probs, notes
    
    @staticmethod
    def _to_numeric(value: Any, default: float) -> float:
        """Safely convert value to float with fallback"""
        if value is None or str(value).strip() == "":
            return default
        try:
            return float(value)
        except (ValueError, TypeError):
            return default
