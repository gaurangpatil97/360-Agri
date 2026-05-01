import { useState } from "react";

const API_BASE_URL = "http://localhost:5000";

export default function CropRecommendation() {
  const [form, setForm] = useState({
    nitrogen: "",
    phosphorus: "",
    potassium: "",
    temperature: "",
    humidity: "",
    pH: "",
    rainfall: "",
  });

  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: value === "" ? null : parseFloat(value),
    }));
  };

  const handleRecommend = async (event) => {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // Build payload with null for empty fields (API uses defaults)
      const payload = {
        nitrogen: form.nitrogen,
        phosphorus: form.phosphorus,
        potassium: form.potassium,
        temperature: form.temperature,
        humidity: form.humidity,
        pH: form.pH,
        rainfall: form.rainfall,
      };

      const response = await fetch(`${API_BASE_URL}/v1/crop/recommend`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.detail || `HTTP ${response.status}`);
      }

      const data = await response.json();
      setResult(data);
    } catch (err) {
      setError(err.message || "Failed to get recommendation");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setForm({
      nitrogen: "",
      phosphorus: "",
      potassium: "",
      temperature: "",
      humidity: "",
      pH: "",
      rainfall: "",
    });
    setResult(null);
    setError(null);
  };

  return (
    <div className="page-container">
      <div className="page-content">
        <h1>Crop Recommendation</h1>
        <p className="page-subtitle">
          Get personalized crop recommendations based on soil nutrients, weather conditions, and pH.
        </p>

        <div className="form-section">
          <h2>Soil & Weather Conditions</h2>
          <p className="section-help">
            Enter your soil composition, temperature, humidity, pH, and expected rainfall.
          </p>

          <form onSubmit={handleRecommend}>
            <div className="form-grid">
              <div className="form-group">
                <label htmlFor="nitrogen">Nitrogen (N) - ppm</label>
                <input
                  type="number"
                  id="nitrogen"
                  name="nitrogen"
                  value={form.nitrogen === null ? "" : form.nitrogen}
                  onChange={handleInputChange}
                  step="0.1"
                  required
                />
                <span className="field-hint">Soil nitrogen content (0-200+)</span>
              </div>

              <div className="form-group">
                <label htmlFor="phosphorus">Phosphorus (P) - ppm</label>
                <input
                  type="number"
                  id="phosphorus"
                  name="phosphorus"
                  value={form.phosphorus === null ? "" : form.phosphorus}
                  onChange={handleInputChange}
                  step="0.1"
                  required
                />
                <span className="field-hint">Soil phosphorus content (0-100+)</span>
              </div>

              <div className="form-group">
                <label htmlFor="potassium">Potassium (K) - ppm</label>
                <input
                  type="number"
                  id="potassium"
                  name="potassium"
                  value={form.potassium === null ? "" : form.potassium}
                  onChange={handleInputChange}
                  step="0.1"
                  required
                />
                <span className="field-hint">Soil potassium content (0-200+)</span>
              </div>

              <div className="form-group">
                <label htmlFor="temperature">Temperature - °C</label>
                <input
                  type="number"
                  id="temperature"
                  name="temperature"
                  value={form.temperature === null ? "" : form.temperature}
                  onChange={handleInputChange}
                  step="0.1"
                  required
                />
                <span className="field-hint">Average temperature (5-45°C)</span>
              </div>

              <div className="form-group">
                <label htmlFor="humidity">Humidity - %</label>
                <input
                  type="number"
                  id="humidity"
                  name="humidity"
                  value={form.humidity === null ? "" : form.humidity}
                  onChange={handleInputChange}
                  step="0.1"
                  min="0"
                  max="100"
                  required
                />
                <span className="field-hint">Relative humidity (0-100%)</span>
              </div>

              <div className="form-group">
                <label htmlFor="pH">Soil pH</label>
                <input
                  type="number"
                  id="pH"
                  name="pH"
                  value={form.pH === null ? "" : form.pH}
                  onChange={handleInputChange}
                  step="0.1"
                  min="3"
                  max="9"
                  required
                />
                <span className="field-hint">pH value (3-9)</span>
              </div>

              <div className="form-group">
                <label htmlFor="rainfall">Rainfall - mm</label>
                <input
                  type="number"
                  id="rainfall"
                  name="rainfall"
                  value={form.rainfall === null ? "" : form.rainfall}
                  onChange={handleInputChange}
                  step="0.1"
                  required
                />
                <span className="field-hint">Annual rainfall (0-5000+ mm)</span>
              </div>
            </div>

            <div className="action-row">
              <button
                className="btn btn-primary"
                type="submit"
                disabled={loading}
              >
                {loading ? "Recommending..." : "Get Recommendation"}
              </button>
              <button className="btn btn-secondary" type="button" onClick={handleReset}>
                Reset
              </button>
            </div>
          </form>
        </div>

        {error && (
          <div className="error-box">
            <strong>Error:</strong> {error}
          </div>
        )}

        {result && (
          <div className="result-section">
            <h2>Recommended Crop</h2>

            <div className="recommendation-card">
              <div className="crop-name">{result.recommended_crop}</div>
              <div className="confidence-display">
                Confidence: {result.confidence_percent}%
              </div>
            </div>

            <div className="all-recommendations">
              <h3>All Crop Probabilities</h3>
              <div className="probability-list">
                {Object.entries(result.all_probabilities)
                  .slice(0, 10)
                  .map(([crop, probability]) => (
                    <div key={crop} className="probability-item">
                      <div className="probability-label">
                        {crop.charAt(0).toUpperCase() + crop.slice(1)}
                      </div>
                      <div className="probability-bar-container">
                        <div
                          className="probability-bar"
                          style={{
                            width: `${(probability * 100).toFixed(0)}%`,
                            backgroundColor:
                              crop === result.recommended_crop
                                ? "#10b981"
                                : "#3b82f6",
                          }}
                        />
                      </div>
                      <div className="probability-value">
                        {(probability * 100).toFixed(1)}%
                      </div>
                    </div>
                  ))}
              </div>
            </div>

            <div className="model-info">
              <small>Model: {result.model_name}</small>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
