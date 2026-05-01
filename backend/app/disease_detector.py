import os
import io
import numpy as np
import tensorflow as tf
from PIL import Image
import keras
import shutil

class DiseaseDetector:
    def __init__(self):
        # The target file path
        self.model_file = r"c:\Users\tanvi\Desktop\gp\360-Agri\models-experm\plant disease detection\plant_disease_model.keras"
        # If it happens to be a directory (common on some saves), we'll zip it to a file
        self.model_dir = self.model_file
        
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
        
        # Windows fix: If it's a directory, Keras load_model often fails with Permission Denied.
        # We'll zip it into a .keras file (which is just a zip of the contents).
        if os.path.exists(self.model_dir) and os.path.isdir(self.model_dir):
            temp_zip = self.model_dir + "_temp"
            if not os.path.exists(self.model_file + ".bak"): # Don't redo if already handled or file exists
                print(f"[INFO] Detected model directory. Converting to Keras V3 archive file...")
                try:
                    # Zip the CONTENTS of the directory
                    shutil.make_archive(temp_zip, 'zip', self.model_dir)
                    # Move the folder aside and put the zip in its place with .keras extension
                    os.rename(self.model_dir, self.model_dir + ".bak")
                    os.rename(temp_zip + ".zip", self.model_file)
                    print(f"[OK] Converted directory to archive: {self.model_file}")
                except Exception as e:
                    print(f"[ERROR] Failed to convert model directory: {e}")

        if os.path.exists(self.model_file) and os.path.isfile(self.model_file):
            try:
                self.model = keras.models.load_model(self.model_file, compile=False)
                print(f"[OK] Plant disease model loaded successfully.")
            except Exception as e:
                print(f"[ERROR] Failed to load plant disease model.")
                print(f"Error details: {e}")
        else:
            print(f"[WARNING] Model file not found at {self.model_file}")

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
