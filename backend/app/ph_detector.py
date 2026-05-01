"""
pH Detection Model via Image Analysis
Analyzes pH strip images using LAB color space matching
"""

import io
import cv2
import numpy as np
from typing import Tuple, Dict, Any


class PHDetector:
    """Detect pH from image of pH strip using color analysis"""

    def __init__(self):
        """Initialize pH detector with reference LAB values"""
        # Real OpenCV LAB values (0-255 scale) for universal indicator colors
        self.ph_reference = {
            1:  ("Red",          np.array([76,  172, 141])),
            2:  ("Red-Orange",   np.array([90,  165, 148])),
            3:  ("Orange",       np.array([120, 158, 158])),
            4:  ("Orange",       np.array([140, 152, 162])),
            5:  ("Yellow",       np.array([180, 138, 158])),
            6:  ("Yellow-Green", np.array([190, 125, 140])),
            7:  ("Green",        np.array([170, 118, 128])),
            8:  ("Green-Blue",   np.array([155, 118, 118])),
            9:  ("Blue",         np.array([130, 122, 108])),
            10: ("Blue",         np.array([110, 128,  98])),
            11: ("Violet",       np.array([90,  140,  98])),
            12: ("Purple",       np.array([75,  150,  98])),
            13: ("Deep Purple",  np.array([60,  158,  98])),
        }
        self.model_name = "pH Strip Color Detector (LAB Matching)"
    
    def detect(self, image_bytes: bytes, x: int = None, y: int = None, 
               w: int = None, h: int = None) -> Tuple[float, float, Dict[str, Any]]:
        """
        Detect pH from image bytes
        
        Args:
            image_bytes: Image file bytes (PNG/JPG)
            x, y, w, h: Optional ROI coordinates (if None, auto-detect)
        
        Returns:
            Tuple of (ph_value, confidence_percent, metadata_dict)
        """
        try:
            # Decode image
            nparr = np.frombuffer(image_bytes, np.uint8)
            image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            
            if image is None:
                raise ValueError("Invalid image data")
            
            # Get ROI - either use provided coords or auto-detect
            if x is not None and y is not None and w is not None and h is not None:
                roi = image[y:y+h, x:x+w]
            else:
                # Auto-detect: find the largest colorful region (pH strip)
                roi = self._auto_detect_roi(image)
                if roi is None:
                    roi = image  # fallback to full image
            
            # Extract color from ROI
            lab = cv2.cvtColor(roi, cv2.COLOR_BGR2LAB)
            
            # Apply Gaussian blur to reduce noise
            roi_blurred = cv2.GaussianBlur(roi, (5, 5), 0)
            lab = cv2.cvtColor(roi_blurred, cv2.COLOR_BGR2LAB)
            
            # Get median LAB (more robust than mean)
            avg_lab = np.median(lab.reshape(-1, 3), axis=0)
            L, A, B_val = avg_lab
            
            # Match to nearest pH reference
            min_dist = float('inf')
            best_ph = 7
            best_color = "Unknown"
            
            for ph, (color_label, ref) in self.ph_reference.items():
                # Use only A and B channels for matching (L is brightness)
                dist = np.linalg.norm(avg_lab[1:] - ref[1:])
                if dist < min_dist:
                    min_dist = dist
                    best_ph = ph
                    best_color = color_label
            
            # Calculate confidence (distance-based)
            MAX_DIST = 250.0
            confidence = max(0, (1 - min_dist / MAX_DIST) * 100)
            
            # Determine nature
            if best_ph <= 6:
                nature = "ACIDIC"
            elif best_ph >= 8:
                nature = "BASIC"
            else:
                nature = "NEUTRAL"
            
            metadata = {
                "color_name": best_color,
                "nature": nature,
                "lab_values": {"L": float(L), "A": float(A), "B": float(B_val)},
                "min_distance": float(min_dist),
                "notes": f"Detected {best_color} color indicating {nature} soil"
            }
            
            return float(best_ph), confidence, metadata
        
        except Exception as e:
            raise RuntimeError(f"pH detection failed: {e}")
    
    def _auto_detect_roi(self, image: np.ndarray) -> np.ndarray:
        """Auto-detect the pH strip region (largest colorful area)"""
        try:
            # Convert to HSV for saturation-based detection
            hsv = cv2.cvtColor(image, cv2.COLOR_BGR2HSV)
            
            # High saturation = colored region (pH strip)
            saturation = hsv[:, :, 1]
            
            # Threshold to find colored regions
            _, mask = cv2.threshold(saturation, 50, 255, cv2.THRESH_BINARY)
            
            # Find contours
            contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
            
            if not contours:
                return None
            
            # Get largest contour
            largest = max(contours, key=cv2.contourArea)
            x, y, w, h = cv2.boundingRect(largest)
            
            # Expand ROI slightly for better color extraction
            pad = 5
            y = max(0, y - pad)
            x = max(0, x - pad)
            h = min(image.shape[0] - y, h + 2*pad)
            w = min(image.shape[1] - x, w + 2*pad)
            
            return image[y:y+h, x:x+w]
        
        except Exception:
            return None
