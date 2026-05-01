import os
import io
import numpy as np
import tensorflow as tf
from PIL import Image
import keras

class DiseaseDetector:
    def __init__(self):
        self.model_path = r"c:\Users\tanvi\Desktop\gp\360-Agri\models-experm\plant disease detection\plant_disease_model.keras"
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
        
        print(f"[INFO] Keras version: {keras.__version__}")
        
        if os.path.exists(self.model_path):
            try:
                # Use keras directly for V3 models
                self.model = keras.models.load_model(self.model_path)
                print(f"[OK] Plant disease model loaded: {self.model_path}")
            except Exception as e:
                print(f"[ERROR] Failed to load plant disease model.")
                print(f"Error details: {e}")
                if "Permission denied" in str(e) and os.path.isdir(self.model_path):
                    print("TIP: This often happens if you are using an older version of Keras/TensorFlow to load a Keras 3 directory model. Upgrading to Keras 3+ should fix this.")
        else:
            print(f"[WARNING] Plant disease model not found at {self.model_path}")

    def predict(self, image_bytes):
        if self.model is None:
            return "Model not loaded", 0.0

        # Preprocess image
        img = Image.open(io.BytesIO(image_bytes)).convert('RGB')
        img = img.resize(self.img_size)
        img_array = tf.keras.preprocessing.image.img_to_array(img)
        img_array = np.expand_dims(img_array, axis=0)
        
        # The model in notebook uses:
        # x = layers.Rescaling(1./127.5, offset=-1)(x)
        # This is handled INSIDE the model if it was part of the Sequential/Functional definition.
        # Looking at the notebook:
        # inputs = tf.keras.Input(shape=(224, 224, 3))
        # x = data_augmentation(inputs)
        # x = layers.Rescaling(1./127.5, offset=-1)(x)
        # x = base_model(x, training=False)
        # ...
        # Yes, Rescaling is part of the model. We just pass raw 0-255 pixels.

        predictions = self.model.predict(img_array)
        score = tf.nn.softmax(predictions[0])
        
        # Actually, the model uses 'softmax' activation in the last Dense layer:
        # outputs = layers.Dense(NUM_CLASSES, activation='softmax', dtype='float32')(x)
        # So 'predictions[0]' is already probabilities.
        
        class_idx = np.argmax(predictions[0])
        confidence = float(predictions[0][class_idx])
        
        return self.class_names[class_idx], confidence
