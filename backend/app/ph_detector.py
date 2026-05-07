"""
pH Detection Model via Image Analysis
Analyzes pH strip images using LAB color space matching.
Reference LAB values measured directly from a universal indicator color chart
covering pH 1-14.
"""

import logging
from typing import Any

import cv2
import numpy as np


logger = logging.getLogger(__name__)


class PHDetector:
    """Detect pH from image of pH strip using color analysis."""

    def __init__(self):
        # LAB reference values measured from a real universal indicator chart
        # OpenCV LAB scale: L 0-255, A 0-255, B 0-255
        # Covers pH 1 (deep red) through pH 14 (deep purple)
        self.ph_reference = {
            1:  ("Deep Red",     np.array([116, 199, 181])),
            2:  ("Orange-Red",   np.array([168, 169, 200])),
            3:  ("Orange",       np.array([209, 136, 212])),
            4:  ("Yellow",       np.array([237, 115, 219])),
            5:  ("Yellow-Green", np.array([209, 100, 191])),
            6:  ("Light Green",  np.array([187,  93, 177])),
            7:  ("Green",        np.array([180,  76, 168])),
            8:  ("Dark Green",   np.array([143,  83, 149])),
            9:  ("Teal",         np.array([185,  85, 126])),
            10: ("Cyan-Blue",    np.array([150, 122,  93])),
            11: ("Blue",         np.array([ 95, 144,  78])),
            12: ("Dark Blue",    np.array([ 94, 145,  87])),
            13: ("Indigo",       np.array([ 96, 160,  84])),
            14: ("Deep Purple",  np.array([ 61, 163,  83])),
        }
        self.model_name = "pH Strip Color Detector (LAB Matching)"

    def detect(
        self,
        image_bytes: bytes,
        points: list[dict[str, float]] | None = None,
        x: int = None,
        y: int = None,
        w: int = None,
        h: int = None,
    ) -> tuple[float, float, dict[str, Any]]:
        """
        Detect pH from image bytes.

        ROI priority (highest to lowest):
          1. polygon points — user-drawn 4-point selection
          2. rectangle (x, y, w, h) — bounding box selection
          3. auto — automatic strip detection
        """
        try:
            nparr = np.frombuffer(image_bytes, np.uint8)
            image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            if image is None:
                raise ValueError("Invalid image data")

            roi_mode = "auto"

            if points:
                roi_mode = "polygon"
                avg_lab = self._median_lab_from_polygon(image, points)
            elif x is not None and y is not None and w is not None and h is not None:
                roi_mode = "rectangle"
                avg_lab = self._median_lab_from_rect(image, x, y, w, h)
            else:
                avg_lab = self._median_lab_from_auto(image)

            best_ph, confidence = self._match_ph(avg_lab)
            l_value, a_value, b_value = avg_lab

            if best_ph <= 6:
                nature = "ACIDIC"
            elif best_ph >= 8:
                nature = "BASIC"
            else:
                nature = "NEUTRAL"

            color_label = self.ph_reference[best_ph][0]

            metadata = {
                "color_name": color_label,
                "nature": nature,
                "lab_values": {
                    "L": float(l_value),
                    "A": float(a_value),
                    "B": float(b_value),
                },
                "roi_mode": roi_mode,
                "notes": f"Detected {color_label} color indicating {nature} soil",
            }

            return float(best_ph), float(confidence), metadata

        except ValueError:
            raise
        except Exception as exc:
            logger.exception("Unexpected error during pH detection")
            raise RuntimeError(f"pH detection failed: {exc}")

    def _match_ph(self, avg_lab: np.ndarray) -> tuple[int, float]:
        """
        Match observed LAB to nearest pH reference using weighted Euclidean distance.

        Weights: A and B channels carry hue/chroma (pH-sensitive).
                 L channel carries brightness (lighting-sensitive, down-weighted).

        Confidence: normalised against the spread across all references,
                    so it reflects how unambiguous the match is.
        """
        weights = np.array([0.3, 1.0, 1.0])  # L, A, B

        distances: dict[int, float] = {}
        for ph, (_, ref) in self.ph_reference.items():
            diff = (avg_lab - ref) * weights
            distances[ph] = float(np.linalg.norm(diff))

        best_ph = min(distances, key=distances.get)
        min_dist = distances[best_ph]

        all_dists = np.array(list(distances.values()))
        max_dist = float(all_dists.max())

        if max_dist < 1e-6:
            confidence = 100.0
        else:
            confidence = max(0.0, (1.0 - min_dist / max_dist) * 100.0)

        return best_ph, confidence

    def _median_lab_from_polygon(
        self, image: np.ndarray, points: list[dict[str, float]]
    ) -> np.ndarray:
        if len(points) < 3:
            raise ValueError("Invalid polygon: at least 3 points are required")

        height, width = image.shape[:2]
        polygon: list[list[int]] = []

        for point in points:
            try:
                px = int(round(float(point["x"])))
                py = int(round(float(point["y"])))
            except (KeyError, TypeError, ValueError) as exc:
                raise ValueError(
                    "Invalid polygon: points must be numeric {x, y} values"
                ) from exc

            px = int(np.clip(px, 0, width - 1))
            py = int(np.clip(py, 0, height - 1))
            polygon.append([px, py])

        polygon_np = np.array(polygon, dtype=np.int32)
        if cv2.contourArea(polygon_np) < 1:
            raise ValueError("Invalid polygon: selected area is too small")

        mask = np.zeros((height, width), dtype=np.uint8)
        cv2.fillPoly(mask, [polygon_np], 255)

        blurred = cv2.GaussianBlur(image, (5, 5), 0)
        lab = cv2.cvtColor(blurred, cv2.COLOR_BGR2LAB)
        masked_pixels = lab[mask == 255]

        if masked_pixels.size == 0:
            raise ValueError("Invalid polygon: no pixels found in selected region")

        return np.median(masked_pixels, axis=0)

    def _median_lab_from_rect(
        self, image: np.ndarray, x: int, y: int, w: int, h: int
    ) -> np.ndarray:
        height, width = image.shape[:2]

        x0 = int(np.clip(x, 0, width - 1))
        y0 = int(np.clip(y, 0, height - 1))
        x1 = int(np.clip(x + w, 0, width))
        y1 = int(np.clip(y + h, 0, height))

        if x1 <= x0 or y1 <= y0:
            raise ValueError(
                "Invalid rectangular ROI: width and height must define a non-empty area"
            )

        roi = image[y0:y1, x0:x1]
        blurred = cv2.GaussianBlur(roi, (5, 5), 0)
        lab = cv2.cvtColor(blurred, cv2.COLOR_BGR2LAB)
        return np.median(lab.reshape(-1, 3), axis=0)

    def _median_lab_from_auto(self, image: np.ndarray) -> np.ndarray:
        roi = self._auto_detect_roi(image)
        if roi is None:
            roi = image

        blurred = cv2.GaussianBlur(roi, (5, 5), 0)
        lab = cv2.cvtColor(blurred, cv2.COLOR_BGR2LAB)
        flattened = lab.reshape(-1, 3)

        if flattened.size == 0:
            raise ValueError("No pixels selected for pH detection")

        # Exclude near-white and near-black pixels — likely background
        l_channel = flattened[:, 0]
        valid = flattened[(l_channel > 30) & (l_channel < 230)]

        return np.median(valid, axis=0) if valid.size > 0 else np.median(flattened, axis=0)

    def _auto_detect_roi(self, image: np.ndarray) -> np.ndarray | None:
        """
        Auto-detect the pH strip region.
        Finds the largest area with high colour saturation,
        excluding white/grey backgrounds.
        """
        try:
            hsv = cv2.cvtColor(image, cv2.COLOR_BGR2HSV)
            saturation = hsv[:, :, 1]
            value = hsv[:, :, 2]

            # High saturation + not too dark + not overexposed
            mask = ((saturation > 60) & (value > 40) & (value < 245)).astype(np.uint8) * 255

            kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (15, 15))
            mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, kernel)
            mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN, kernel)

            contours, _ = cv2.findContours(
                mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE
            )
            if not contours:
                return None

            largest = max(contours, key=cv2.contourArea)
            if cv2.contourArea(largest) < 200:
                return None

            x, y, w, h = cv2.boundingRect(largest)
            pad = 5
            y = max(0, y - pad)
            x = max(0, x - pad)
            h = min(image.shape[0] - y, h + 2 * pad)
            w = min(image.shape[1] - x, w + 2 * pad)

            return image[y: y + h, x: x + w]

        except Exception:
            return None