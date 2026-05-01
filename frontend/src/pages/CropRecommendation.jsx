import { useState } from 'react'

const SOIL_TYPES = ['Loamy', 'Sandy', 'Clay', 'Silty', 'Peaty', 'Chalky']
const CROP_DB = [
  { name: 'Wheat', icon: '🌾', base: 88 },
  { name: 'Rice', icon: '🍚', base: 72 },
  { name: 'Maize', icon: '🌽', base: 65 },
  { name: 'Soybean', icon: '🫘', base: 79 },
  { name: 'Cotton', icon: '🌿', base: 58 },
  { name: 'Sugarcane', icon: '🎋', base: 83 },
]

function shuffle(arr, seed) {
  return arr
    .map(c => ({ ...c, score: Math.min(99, Math.max(40, c.base + (seed % 13) - 6)) }))
    .sort((a, b) => b.score - a.score)
}

export default function CropRecommendation() {
  const [form, setForm] = useState({
    soilType: '', nitrogen: '', phosphorus: '', potassium: '',
    rainfall: '', temperature: '', humidity: '', region: ''
  })
  const [results, setResults] = useState(null)
  const [loading, setLoading] = useState(false)

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = (e) => {
    e.preventDefault()
    setLoading(true)
    setTimeout(() => {
      const seed = parseInt(form.nitrogen || '50') + parseInt(form.phosphorus || '40')
      setResults(shuffle(CROP_DB, seed).slice(0, 4))
      setLoading(false)
    }, 1100)
  }

  return (
    <div className="page-content">
      <div className="page-header">
        <p className="eyebrow">Module 02</p>
        <h1>Crop Recommendation</h1>
        <p className="subtext">Enter soil and climate data to find the most suitable crops for your field.</p>
      </div>

      <div className="two-col">
        {/* Form */}
        <div className="panel large">
          <div className="panel-header">
            <div>
              <p className="panel-title">Soil &amp; Climate Inputs</p>
              <p className="panel-subtitle">All values should reflect current field conditions.</p>
            </div>
          </div>
          <form className="form-grid" onSubmit={handleSubmit}>
            <label className="field">
              <span>Soil Type</span>
              <select value={form.soilType} onChange={e => set('soilType', e.target.value)}>
                <option value="">Select soil type</option>
                {SOIL_TYPES.map(s => <option key={s}>{s}</option>)}
              </select>
            </label>
            <label className="field">
              <span>Region / District</span>
              <input type="text" placeholder="e.g. Nashik, Pune" value={form.region} onChange={e => set('region', e.target.value)} />
            </label>
            <label className="field">
              <span>Nitrogen — N (kg/ha)</span>
              <input type="number" placeholder="0 – 140" value={form.nitrogen} onChange={e => set('nitrogen', e.target.value)} />
            </label>
            <label className="field">
              <span>Phosphorus — P (kg/ha)</span>
              <input type="number" placeholder="0 – 120" value={form.phosphorus} onChange={e => set('phosphorus', e.target.value)} />
            </label>
            <label className="field">
              <span>Potassium — K (kg/ha)</span>
              <input type="number" placeholder="0 – 130" value={form.potassium} onChange={e => set('potassium', e.target.value)} />
            </label>
            <label className="field">
              <span>Annual Rainfall (mm)</span>
              <input type="number" placeholder="e.g. 850" value={form.rainfall} onChange={e => set('rainfall', e.target.value)} />
            </label>
            <label className="field">
              <span>Avg Temperature (°C)</span>
              <input type="number" placeholder="e.g. 28" value={form.temperature} onChange={e => set('temperature', e.target.value)} />
            </label>
            <label className="field">
              <span>Avg Humidity (%)</span>
              <input type="number" placeholder="e.g. 65" value={form.humidity} onChange={e => set('humidity', e.target.value)} />
            </label>
            <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end' }}>
              <button type="submit" className="pill-button" disabled={loading}>
                {loading ? 'Analysing…' : 'Get Recommendations'}
              </button>
            </div>
          </form>
        </div>

        {/* Results */}
        <div className="panel result-panel">
          <p className="panel-title">Recommended Crops</p>
          <p className="panel-subtitle">Ranked by suitability for your soil and climate profile.</p>
          {!results && !loading && (
            <div className="empty-state">
              <div className="empty-icon">🌱</div>
              <p>Submit the form to see crop recommendations.</p>
            </div>
          )}
          {loading && (
            <div className="empty-state">
              <div className="loader"></div>
              <p>Analysing soil data…</p>
            </div>
          )}
          {results && !loading && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 12 }}>
              {results.map((crop, i) => (
                <div key={crop.name} className={`crop-card ${i === 0 ? 'top-pick' : ''}`}>
                  <div className="crop-icon">{crop.icon}</div>
                  <div style={{ flex: 1 }}>
                    <div className="crop-name-row">
                      <span className="crop-name">{crop.name}</span>
                      {i === 0 && <span className="badge-top">Top Pick</span>}
                    </div>
                    <div className="conf-bar-wrap" style={{ marginTop: 8 }}>
                      <div className="conf-bar" style={{ width: crop.score + '%' }}></div>
                    </div>
                  </div>
                  <span className="crop-score">{crop.score}%</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
