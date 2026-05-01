import { useState } from "react";

const API_BASE_URL = "http://localhost:5000";

function phStatus(ph) {
  if (ph < 6.0) {
    return {
      label: "Acidic",
      color: "#e67e22",
      bg: "#fef9f0",
      rec: "Apply agricultural lime (CaCO₃) to raise pH. Recommended: 1–2 tonnes/ha. Test again after 6 weeks.",
    };
  }

  if (ph <= 7.5) {
    return {
      label: "Neutral",
      color: "#2E7D32",
      bg: "#f0f8f0",
      rec: "Soil pH is in the ideal range for most crops. Maintain organic matter levels. Regular monitoring advised.",
    };
  }

  return {
    label: "Alkaline",
    color: "#8e44ad",
    bg: "#f9f0fe",
    rec: "Apply sulphur or gypsum to lower pH. Use acidifying fertilisers (ammonium sulphate). Avoid excessive liming.",
  };
}

function phMeter(ph) {
  const pct = (ph / 14) * 100;
  return { pct };
}

export default function SoilPHDetection() {
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleImageSelect = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setImage(file);
    setError(null);

    const reader = new FileReader();
    reader.onload = (readerEvent) => {
      setPreview(readerEvent.target?.result || null);
    };
    reader.readAsDataURL(file);
  };

  const handleDetect = async () => {
    if (!image) {
      setError("Please select an image");
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const base64 = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (readerEvent) => {
          const value = readerEvent.target?.result;
          if (typeof value !== "string") {
            reject(new Error("Failed to read image file"));
            return;
          }
          resolve(value.split(",")[1]);
        };
        reader.onerror = () => reject(new Error("Failed to read image file"));
        reader.readAsDataURL(image);
      });

      const response = await fetch(`${API_BASE_URL}/v1/ph/detect`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image_base64: base64,
          roi_x: null,
          roi_y: null,
          roi_w: null,
          roi_h: null,
        }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.detail || `HTTP ${response.status}`);
      }

      const data = await response.json();
      setResult(data);
    } catch (err) {
      setError(err.message || "Failed to detect pH");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setImage(null);
    setPreview(null);
    setResult(null);
    setError(null);
  };

  const meter = result ? phMeter(result.detected_ph) : null;
  const status = result ? phStatus(result.detected_ph) : null;

  return (
    <div className="page-container">
      <div className="page-content">
        <h1>Soil pH Detection</h1>
        <p className="page-subtitle">
          Upload a photo of a pH test strip to determine your soil acidity level.
        </p>

        <div className="form-section">
          <h2>Upload pH Strip Image</h2>
          <p className="section-help">
            Take a clear photo of the pH test strip showing the colored region.
            The system will auto-detect the strip and analyze the color to determine pH.
          </p>

          {!preview && (
            <div className="drop-zone" style={{ position: "relative" }}>
              <div className="drop-placeholder">
                <div className="drop-icon">📸</div>
                <p className="drop-label">Select pH Strip Image</p>
                <p className="drop-sub">PNG or JPG, at least 200x200 pixels</p>
              </div>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageSelect}
                style={{
                  position: "absolute",
                  inset: 0,
                  width: "100%",
                  height: "100%",
                  opacity: 0,
                  cursor: "pointer",
                }}
              />
            </div>
          )}

          {preview && (
            <div style={{ borderRadius: "12px", overflow: "hidden" }}>
              <img
                src={preview}
                alt="pH Strip"
                style={{ maxWidth: "100%", maxHeight: "400px", display: "block" }}
              />
            </div>
          )}

          {preview && (
            <div className="action-row">
              <button className="btn btn-primary" onClick={handleDetect} disabled={loading} type="button">
                {loading ? "Detecting..." : "Detect pH"}
              </button>
              <button className="btn btn-secondary" onClick={handleReset} type="button">
                Change Image
              </button>
            </div>
          )}
        </div>

        {error && (
          <div className="error-box">
            <strong>Error:</strong> {error}
          </div>
        )}

        {result && status && meter && (
          <div className="result-section">
            <h2>pH Analysis Result</h2>

            <div className="result-card" style={{ background: status.bg }}>
              <p className="result-label">Detected pH Value</p>
              <p className="result-big" style={{ color: status.color, fontSize: 44, margin: "8px 0" }}>
                {result.detected_ph.toFixed(1)}
              </p>

              <div className="ph-scale">
                <div className="ph-gradient"></div>
                <div className="ph-marker" style={{ left: `${meter.pct}%` }}></div>
              </div>
              <div className="ph-scale-labels">
                <span>0 — Very Acidic</span>
                <span>7 — Neutral</span>
                <span>14 — Alkaline</span>
              </div>
            </div>

            <div className="result-card" style={{ border: `2px solid ${status.color}44` }}>
              <p className="result-label">Soil Status</p>
              <p className="result-big" style={{ color: status.color, fontSize: 22, margin: "8px 0" }}>
                {status.label}
              </p>
              <p className="result-status good" style={{ color: status.color }}>
                {result.nature} Soil
              </p>
            </div>

            <div className="result-card">
              <p className="result-label">Detected Color</p>
              <p style={{ margin: "8px 0 0", fontSize: "16px", fontWeight: 600 }}>
                {result.color_name}
              </p>
              <p style={{ margin: "4px 0 0", fontSize: "13px", color: "#7d877f" }}>
                Confidence: {result.confidence_percent}%
              </p>
            </div>

            <div className="result-card" style={{ borderLeft: `4px solid ${status.color}` }}>
              <p className="result-label">Soil Correction Advice</p>
              <p style={{ margin: "8px 0 0", fontSize: "14px", lineHeight: 1.6 }}>
                {status.rec}
              </p>
            </div>

            <div className="model-info">
              <small>Model: {result.model_name}</small>
            </div>
          </div>
        )}

        {!result && !loading && preview && (
          <div className="result-section">
            <div style={{ textAlign: "center", color: "#7d877f", padding: "40px 20px" }}>
              <p>Click "Detect pH" to analyze the image</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
