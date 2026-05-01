import { useState } from 'react'

const SOIL_TYPES = ['Clay', 'Silt', 'Sandy', 'Loamy']
const CROP_TYPES = ['Cotton', 'Maize', 'Wheat', 'Potato', 'Sugarcane', 'Rice', 'Soybean']
const GROWTH_STAGES = ['Vegetative', 'Sowing', 'Harvest', 'Flowering']
const SEASONS = ['Kharif', 'Zaid', 'Rabi']
const IRRIGATION_TYPES = ['Sprinkler', 'Drip', 'Canal', 'Rainfed']
const REGIONS = ['Central', 'North', 'West', 'South', 'East']
const PREVIOUS_CROPS = ['Wheat', 'Potato', 'Cotton', 'Maize', 'Tomato', 'Rice', 'Soybean']

export default function FertilizerRecommendation() {
  const [form, setForm] = useState({
    soil_type: 'Loamy',
    soil_ph: 6.5,
    soil_moisture: 25.0,
    organic_carbon: 0.5,
    electrical_conductivity: 1.2,
    nitrogen_level: 100,
    phosphorus_level: 40,
    potassium_level: 60,
    temperature: 25.0,
    humidity: 60.0,
    rainfall: 1000.0,
    crop_type: 'Wheat',
    crop_growth_stage: 'Vegetative',
    season: 'Rabi',
    irrigation_type: 'Canal',
    previous_crop: 'Rice',
    region: 'North',
    fertilizer_used_last_season: 150.0,
    yield_last_season: 5.0
  })
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    
    try {
      const response = await fetch('http://localhost:5000/v1/fertilizer/recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      })
      
      if (!response.ok) {
        const errData = await response.json()
        throw new Error(errData.detail || 'Failed to get recommendation')
      }
      
      const data = await response.json()
      setResult(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="page-content">
      <div className="page-header">
        <p className="eyebrow">Module 03</p>
        <h1>Fertilizer Recommendation</h1>
        <p className="subtext">AI-driven fertilizer advisor based on soil health and crop history.</p>
      </div>

      <div className="two-col">
        {/* Form */}
        <div className="panel large">
          <div className="panel-header">
            <div>
              <p className="panel-title">Farming Parameters</p>
              <p className="panel-subtitle">Provide soil test results and environmental data.</p>
            </div>
          </div>
          <form className="form-grid" onSubmit={handleSubmit}>
            <div className="section-title" style={{ gridColumn: '1 / -1', marginTop: 10, fontSize: '0.8rem', opacity: 0.6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Soil Information</div>
            
            <label className="field">
              <span>Soil Type</span>
              <select value={form.soil_type} onChange={e => set('soil_type', e.target.value)}>
                {SOIL_TYPES.map(c => <option key={c}>{c}</option>)}
              </select>
            </label>
            <label className="field">
              <span>Soil pH</span>
              <input type="number" step="0.1" value={form.soil_ph} onChange={e => set('soil_ph', parseFloat(e.target.value))} />
            </label>
            <label className="field">
              <span>Soil Moisture (%)</span>
              <input type="number" step="0.1" value={form.soil_moisture} onChange={e => set('soil_moisture', parseFloat(e.target.value))} />
            </label>
            <label className="field">
              <span>Organic Carbon</span>
              <input type="number" step="0.01" value={form.organic_carbon} onChange={e => set('organic_carbon', parseFloat(e.target.value))} />
            </label>
            <label className="field">
              <span>Elect. Cond. (mS/cm)</span>
              <input type="number" step="0.01" value={form.electrical_conductivity} onChange={e => set('electrical_conductivity', parseFloat(e.target.value))} />
            </label>
            <label className="field">
              <span>Region</span>
              <select value={form.region} onChange={e => set('region', e.target.value)}>
                {REGIONS.map(c => <option key={c}>{c}</option>)}
              </select>
            </label>

            <div className="section-title" style={{ gridColumn: '1 / -1', marginTop: 20, fontSize: '0.8rem', opacity: 0.6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Nutrient Levels (mg/kg)</div>
            <label className="field">
              <span>Nitrogen (N)</span>
              <input type="number" value={form.nitrogen_level} onChange={e => set('nitrogen_level', parseFloat(e.target.value))} />
            </label>
            <label className="field">
              <span>Phosphorus (P)</span>
              <input type="number" value={form.phosphorus_level} onChange={e => set('phosphorus_level', parseFloat(e.target.value))} />
            </label>
            <label className="field">
              <span>Potassium (K)</span>
              <input type="number" value={form.potassium_level} onChange={e => set('potassium_level', parseFloat(e.target.value))} />
            </label>

            <div className="section-title" style={{ gridColumn: '1 / -1', marginTop: 20, fontSize: '0.8rem', opacity: 0.6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Crop & Environment</div>
            <label className="field">
              <span>Target Crop</span>
              <select value={form.crop_type} onChange={e => set('crop_type', e.target.value)}>
                {CROP_TYPES.map(c => <option key={c}>{c}</option>)}
              </select>
            </label>
            <label className="field">
              <span>Growth Stage</span>
              <select value={form.crop_growth_stage} onChange={e => set('crop_growth_stage', e.target.value)}>
                {GROWTH_STAGES.map(s => <option key={s}>{s}</option>)}
              </select>
            </label>
            <label className="field">
              <span>Season</span>
              <select value={form.season} onChange={e => set('season', e.target.value)}>
                {SEASONS.map(s => <option key={s}>{s}</option>)}
              </select>
            </label>
            <label className="field">
              <span>Temp (°C)</span>
              <input type="number" step="0.1" value={form.temperature} onChange={e => set('temperature', parseFloat(e.target.value))} />
            </label>
            <label className="field">
              <span>Humidity (%)</span>
              <input type="number" step="0.1" value={form.humidity} onChange={e => set('humidity', parseFloat(e.target.value))} />
            </label>
            <label className="field">
              <span>Rainfall (mm)</span>
              <input type="number" step="0.1" value={form.rainfall} onChange={e => set('rainfall', parseFloat(e.target.value))} />
            </label>
            <label className="field">
              <span>Irrigation</span>
              <select value={form.irrigation_type} onChange={e => set('irrigation_type', e.target.value)}>
                {IRRIGATION_TYPES.map(s => <option key={s}>{s}</option>)}
              </select>
            </label>
            <label className="field">
              <span>Previous Crop</span>
              <select value={form.previous_crop} onChange={e => set('previous_crop', e.target.value)}>
                {PREVIOUS_CROPS.map(s => <option key={s}>{s}</option>)}
              </select>
            </label>

            <div className="section-title" style={{ gridColumn: '1 / -1', marginTop: 20, fontSize: '0.8rem', opacity: 0.6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Historical Data</div>
            <label className="field">
              <span>Prev. Fertilizer (kg)</span>
              <input type="number" step="0.1" value={form.fertilizer_used_last_season} onChange={e => set('fertilizer_used_last_season', parseFloat(e.target.value))} />
            </label>
            <label className="field">
              <span>Prev. Yield (t/ha)</span>
              <input type="number" step="0.1" value={form.yield_last_season} onChange={e => set('yield_last_season', parseFloat(e.target.value))} />
            </label>

            <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end', marginTop: 10 }}>
              <button type="submit" className="pill-button" disabled={loading}>
                {loading ? 'Analyzing Data…' : 'Get AI Recommendation'}
              </button>
            </div>
          </form>
        </div>

        {/* Results */}
        <div className="panel result-panel">
          <p className="panel-title">AI Output</p>
          <p className="panel-subtitle">Optimal fertilizer and confidence score.</p>
          
          {error && (
            <div className="empty-state error" style={{ color: '#ef5350' }}>
              <div className="empty-icon">⚠️</div>
              <p>{error}</p>
            </div>
          )}

          {!result && !loading && !error && (
            <div className="empty-state">
              <div className="empty-icon">🌱</div>
              <p>Enter field parameters to see AI recommendation.</p>
            </div>
          )}
          
          {loading && (
            <div className="empty-state">
              <div className="loader"></div>
              <p>Analyzing soil health parameters…</p>
            </div>
          )}
          
          {result && !loading && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20, marginTop: 12 }}>
              <div className="result-card accent-green">
                <p className="result-label">Recommended Fertilizer</p>
                <p className="result-big" style={{ fontSize: '1.8rem' }}>{result.recommendation}</p>
                <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ flex: 1, height: 4, background: 'rgba(255,255,255,0.1)', borderRadius: 2 }}>
                    <div style={{ height: '100%', background: '#8bc34a', width: `${result.confidence_percent}%`, borderRadius: 2 }}></div>
                  </div>
                  <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>{result.confidence_percent}% Match</span>
                </div>
              </div>

              <div>
                <p className="panel-title" style={{ fontSize: '0.9rem', marginBottom: 12 }}>Model Probabilities</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {Object.entries(result.all_probabilities).slice(0, 5).map(([name, prob]) => (
                    <div key={name} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
                        <span>{name}</span>
                        <span>{Math.round(prob * 100)}%</span>
                      </div>
                      <div style={{ height: 4, background: 'rgba(255,255,255,0.05)', borderRadius: 2 }}>
                        <div style={{ height: '100%', background: name === result.recommendation ? '#8bc34a' : 'rgba(255,255,255,0.2)', width: `${prob * 100}%`, borderRadius: 2 }}></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ padding: 16, background: 'rgba(255,255,255,0.02)', borderRadius: 12, fontSize: '0.7rem', opacity: 0.6 }}>
                <p><strong>Model:</strong> {result.model_name}</p>
                <p style={{ marginTop: 4 }}>Recommendations are based on historical patterns and current soil condition inputs.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
