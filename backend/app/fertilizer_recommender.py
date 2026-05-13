
import pickle
import pandas as pd
import numpy as np
from pathlib import Path
from typing import Dict, Tuple, Any

class FertilizerRecommender:
    """Fertilizer recommendation predictor using trained sklearn pipeline and label encoder"""
    
    def __init__(self, model_dir: str = None):
        """
        Initialize fertilizer recommender with saved pipeline and label encoder
        
        Args:
            model_dir: Directory containing fertilizer_pipeline.pkl and label_encoder.pkl
        """
        if model_dir is None:
            model_dir = Path(__file__).parent.parent / "models" / "fertilizer_recommendation"

        self.model_dir = Path(model_dir)
        self.pipeline_path = self.model_dir / "fertilizer_pipeline.pkl"
        self.encoder_path = self.model_dir / "label_encoder.pkl"
        
        self.categorical_cols = [
            'soil_type', 'crop_type', 'crop_growth_stage', 'season',
            'irrigation_type', 'previous_crop', 'region'
        ]
        self.base_numeric_features = [
            'soil_ph', 'soil_moisture', 'organic_carbon', 'electrical_conductivity',
            'nitrogen_level', 'phosphorus_level', 'potassium_level',
            'temperature', 'humidity', 'rainfall',
            'fertilizer_used_last_season', 'yield_last_season'
        ]
        self.engineered_features = ['npk_ratio', 'n_p_ratio', 'p_k_ratio']
        
        # Order must match training exactly: categorical + numeric (including engineered)
        self.feature_order = self.categorical_cols + self.base_numeric_features + self.engineered_features
        
        self.pipeline = None
        self.label_encoder = None
        self._load_artifacts()
    
    def _load_artifacts(self):
        """Load pipeline and label encoder from disk"""
        try:
            if not self.pipeline_path.exists():
                print(f"[ERROR] Fertilizer pipeline not found: {self.pipeline_path}")
                return
            if not self.encoder_path.exists():
                print(f"[ERROR] Fertilizer label encoder not found: {self.encoder_path}")
                return
            
            with open(self.pipeline_path, 'rb') as f:
                self.pipeline = pickle.load(f)
            
            with open(self.encoder_path, 'rb') as f:
                self.label_encoder = pickle.load(f)
            
            print(f"[OK] Fertilizer recommender loaded: {self.pipeline_path}")
        except Exception as e:
            print(f"[ERROR] Failed to load fertilizer recommendation model: {e}")

    def predict(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Recommend fertilizer based on input features
        """
        if self.pipeline is None or self.label_encoder is None:
            return {"error": "Model not loaded"}
        
        try:
            # Prepare numeric features with defaults
            processed_data = {}
            for feat in self.base_numeric_features:
                val = input_data.get(feat)
                try:
                    processed_data[feat] = float(val) if val is not None else 0.0
                except (ValueError, TypeError):
                    processed_data[feat] = 0.0
            
            # Add categorical features
            for feat in self.categorical_cols:
                processed_data[feat] = input_data.get(feat, "Unknown")
            
            # Feature engineering
            n = processed_data['nitrogen_level']
            p = processed_data['phosphorus_level']
            k = processed_data['potassium_level']
            
            processed_data['npk_ratio'] = n / (p + k + 1e-6)
            processed_data['n_p_ratio'] = n / (p + 1e-6)
            processed_data['p_k_ratio'] = p / (k + 1e-6)
            
            # Create DataFrame with correct column order
            X = pd.DataFrame([processed_data])[self.feature_order]
            
            # Inference
            pred_idx = self.pipeline.predict(X)[0]
            fertilizer = self.label_encoder.inverse_transform([pred_idx])[0]
            
            # Confidence
            try:
                probs = self.pipeline.predict_proba(X)[0]
                confidence = float(np.max(probs))
                
                # All probabilities
                all_probs = {
                    self.label_encoder.classes_[i]: float(probs[i])
                    for i in range(len(probs))
                    if probs[i] > 0
                }
                # Sort by prob
                all_probs = dict(sorted(all_probs.items(), key=lambda x: x[1], reverse=True))
                
            except (AttributeError, Exception):
                confidence = 1.0
                all_probs = {fertilizer: 1.0}
            
            return {
                "recommendation": fertilizer,
                "confidence": confidence,
                "probabilities": all_probs,
                "input_received": {k: v for k, v in input_data.items() if k in self.feature_order}
            }
            
        except Exception as e:
            return {"error": str(e)}
