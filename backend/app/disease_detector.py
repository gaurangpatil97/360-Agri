import io
import logging
import os
from pathlib import Path
import tempfile
import zipfile

import numpy as np
import tensorflow as tf
from PIL import Image
import keras


logger = logging.getLogger(__name__)

class DiseaseDetector:
    def __init__(self):
        self.model_path = self._resolve_model_path()
        self.img_size = (224, 224)
        self.model = None
        self.class_names = [
            'Apple___Apple_scab', 'Apple___Black_rot', 'Apple___Cedar_apple_rust', 'Apple___healthy',
            'Blueberry___healthy', 'Cherry_(including_sour)___Powdery_mildew', 'Cherry_(including_sour)___healthy',
            'Corn_(maize)___Cercospora_leaf_spot Gray_leaf_spot', 'Corn_(maize)___Common_rust_', 'Corn_(maize)___Northern_Leaf_Blight', 'Corn_(maize)___healthy',
            'Grape___Black_rot', 'Grape___Esca_(Black_Measles)', 'Grape___Leaf_blight_(Isariopsis_Leaf_Spot)', 'Grape___healthy',
            'Orange___Haunglongbing_(Citrus_greening)', 'Peach___Bacterial_spot', 'Peach___healthy',
            'Pepper,_bell___Bacterial_spot', 'Pepper,_bell___healthy', 'Potato___Early_blight', 'Potato___Late_blight', 'Potato___healthy',
            'Raspberry___healthy', 'Soybean___healthy', 'Squash___Powdery_mildew', 'Strawberry___Leaf_scorch', 'Strawberry___healthy',
            'Tomato___Bacterial_spot', 'Tomato___Early_blight', 'Tomato___Late_blight', 'Tomato___Leaf_Mold', 'Tomato___Septoria_leaf_spot',
            'Tomato___Spider_mites Two-spotted_spider_mite', 'Tomato___Target_Spot', 'Tomato___Tomato_Yellow_Leaf_Curl_Virus', 'Tomato___Tomato_mosaic_virus', 'Tomato___healthy'
        ]
        
        logger.info("Keras version: %s", keras.__version__)
        logger.info("Resolved plant disease model path: %s", self.model_path if self.model_path is not None else "<missing>")

        if self.model_path is None:
            logger.warning("Plant disease model not found. The disease endpoint will return a clear error until the artifact is present.")
            return

        try:
            self.model = self._load_keras_model(self.model_path)
            logger.info("Plant disease model loaded successfully from %s", self.model_path)
        except Exception:
            logger.exception("Failed to load plant disease model from %s", self.model_path)

    def _load_keras_model(self, model_path: Path):
        if model_path.is_file():
            return keras.saving.load_model(str(model_path), compile=False)

        temp_archive: Path | None = None
        try:
            temp_file = tempfile.NamedTemporaryFile(suffix=".keras", delete=False)
            temp_file.close()
            temp_archive = Path(temp_file.name)

            with zipfile.ZipFile(temp_archive, mode="w", compression=zipfile.ZIP_DEFLATED) as archive:
                for item in model_path.rglob("*"):
                    if item.is_file():
                        archive.write(item, arcname=item.relative_to(model_path).as_posix())

            return keras.saving.load_model(str(temp_archive), compile=False)
        finally:
            if temp_archive is not None and temp_archive.exists():
                try:
                    temp_archive.unlink()
                except OSError:
                    logger.warning("Could not remove temporary Keras archive: %s", temp_archive)

    def _resolve_model_path(self) -> Path | None:
        """Resolve the actual Keras model artifact path.

        The repository stores the disease model as a Keras v3 directory artifact.
        Some exports create a nested folder with the same name, so we look for the
        first directory that actually contains the Keras metadata files.
        """
        env_path = os.getenv("DISEASE_MODEL_PATH") or os.getenv("MODEL_PATH")
        if env_path:
            candidate = Path(env_path).expanduser()
            if self._is_loadable_model_path(candidate):
                return candidate.resolve()
            return None

        project_root = Path(__file__).resolve().parents[2]
        base_dir = project_root / "models-experm" / "plant disease detection"
        direct_candidate = base_dir / "plant_disease_model.keras"
        nested_candidate = direct_candidate / "plant_disease_model.keras"

        for candidate in (direct_candidate, nested_candidate):
            if self._is_loadable_model_path(candidate):
                return candidate.resolve()

        return None

    @staticmethod
    def _is_loadable_model_path(candidate: Path) -> bool:
        if candidate.is_file():
            return True

        if candidate.is_dir():
            required_files = {"config.json", "metadata.json", "model.weights.h5"}
            existing = {item.name for item in candidate.iterdir()}
            if required_files.issubset(existing):
                return True

        return False

    def predict(self, image_bytes):
        if self.model is None:
            raise RuntimeError("Plant disease model is not loaded. Check the model artifact path and startup logs.")

        try:
            img = Image.open(io.BytesIO(image_bytes)).convert('RGB')
        except Exception as exc:
            raise ValueError(f"Invalid image data: {exc}") from exc

        img = img.resize(self.img_size)
        img_array = tf.keras.utils.img_to_array(img)
        img_array = np.expand_dims(img_array, axis=0)

        predictions = self.model.predict(img_array)
        class_idx = np.argmax(predictions[0])
        confidence = float(predictions[0][class_idx])
        
        return self.class_names[class_idx], confidence
