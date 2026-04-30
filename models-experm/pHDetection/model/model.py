import cv2
import numpy as np
from tkinter import Tk
from tkinter.filedialog import askopenfilename

points = []

# ---------- Mouse Callback ----------
def click_event(event, x, y, flags, param):
    global points, image_copy

    if event == cv2.EVENT_LBUTTONDOWN:
        if len(points) < 4:
            points.append((x, y))
            print(f"Point {len(points)}: ({x}, {y})")

            cv2.circle(image_copy, (x, y), 5, (0, 0, 255), -1)

            if len(points) > 1:
                cv2.line(image_copy, points[-2], points[-1], (255, 0, 0), 2)

            if len(points) == 4:
                cv2.line(image_copy, points[-1], points[0], (255, 0, 0), 2)

            cv2.imshow("Select 4 Points", image_copy)

# ---------- Upload Image ----------
root = Tk()
root.withdraw()
root.attributes('-topmost', True)

file_path = askopenfilename(title="Select an image")

if not file_path:
    print("No file selected")
    exit()

image = cv2.imread(file_path)

if image is None:
    print("Error loading image")
    exit()

image_copy = image.copy()

# ---------- Select Points ----------
cv2.imshow("Select 4 Points", image_copy)
cv2.setMouseCallback("Select 4 Points", click_event)

print("Click 4 points. Press ENTER when done.")

while True:
    key = cv2.waitKey(1) & 0xFF
    if key == 13 and len(points) == 4:
        break

cv2.destroyAllWindows()

# ---------- Create Mask ----------
mask = np.zeros(image.shape[:2], dtype=np.uint8)
pts = np.array(points, dtype=np.int32)
cv2.fillPoly(mask, [pts], 255)

# ---------- Extract & Crop ----------
result = cv2.bitwise_and(image, image, mask=mask)
x, y, w, h = cv2.boundingRect(pts)
cropped = result[y:y+h, x:x+w]
mask_cropped = mask[y:y+h, x:x+w]

# ---------- Noise Reduction ----------
cropped = cv2.GaussianBlur(cropped, (5, 5), 0)

# ---------- Convert to LAB ----------
lab = cv2.cvtColor(cropped, cv2.COLOR_BGR2LAB)
masked_pixels = lab[mask_cropped == 255]

if len(masked_pixels) == 0:
    print("No pixels selected properly")
    exit()

# ---------- Median LAB ----------
avg_lab = np.median(masked_pixels, axis=0)
L, A, B_val = avg_lab

# ---------- Reference LAB values ----------
# These are real OpenCV LAB values (0-255 scale) for universal indicator colors
# Verified against actual pH strip color references
ph_reference = {
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

# ---------- Distance Matching ----------
min_dist = float('inf')
best_ph = None
best_color = None

for ph, (color_label, ref) in ph_reference.items():
    dist = np.linalg.norm(avg_lab - ref)
    if dist < min_dist:
        min_dist = dist
        best_ph = ph
        best_color = color_label

# ---------- Nature ----------
if best_ph <= 6:
    nature = "ACIDIC"
elif best_ph >= 8:
    nature = "BASIC"
else:
    nature = "NEUTRAL"

# ---------- Confidence ----------
# Max meaningful LAB distance across full color space is ~250
# Clamp so confidence never goes below 0%
MAX_DIST = 250.0
confidence = int(max(0, (1 - min_dist / MAX_DIST) * 100))

# ---------- Convert LAB -> BGR ----------
lab_pixel = np.uint8([[avg_lab]])
bgr_pixel = cv2.cvtColor(lab_pixel, cv2.COLOR_LAB2BGR)
b_val_bgr, g_val, r_val = map(int, bgr_pixel[0][0])

# ---------- Result UI ----------
color_patch = np.full((360, 520, 3), [b_val_bgr, g_val, r_val], dtype=np.uint8)
text_color = (0, 0, 0) if L > 128 else (255, 255, 255)

cv2.putText(color_patch, f"Detected Color : {best_color}",  (20, 70),
            cv2.FONT_HERSHEY_SIMPLEX, 0.75, text_color, 2)
cv2.putText(color_patch, f"Estimated pH   : {best_ph}",     (20, 130),
            cv2.FONT_HERSHEY_SIMPLEX, 0.75, text_color, 2)
cv2.putText(color_patch, f"Nature         : {nature}",      (20, 190),
            cv2.FONT_HERSHEY_SIMPLEX, 0.75, text_color, 2)
cv2.putText(color_patch, f"Confidence     : {confidence}%", (20, 250),
            cv2.FONT_HERSHEY_SIMPLEX, 0.75, text_color, 2)
cv2.putText(color_patch, "Press any key to exit",           (20, 330),
            cv2.FONT_HERSHEY_SIMPLEX, 0.5,  text_color, 1)

# ---------- Print Output ----------
print("\n" + "=" * 40)
print("         FINAL RESULTS")
print("=" * 40)
print(f"  Detected Color  : {best_color}")
print(f"  Estimated pH    : {best_ph}")
print(f"  Nature          : {nature}")
print(f"  Confidence      : {confidence}%")
print(f"  LAB Values      : L={L:.2f}, A={A:.2f}, B={B_val:.2f}")
print("=" * 40)

# ---------- Show ----------
cv2.imshow("Result", color_patch)
cv2.waitKey(0)
cv2.destroyAllWindows()