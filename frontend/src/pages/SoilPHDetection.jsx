import { useState } from 'react'

const SOIL_TEXTURES = ['Loamy', 'Sandy', 'Clay', 'Peaty', 'Silty']
const MOISTURE_LEVELS = ['Dry', 'Moderate', 'Wet']

function phStatus(ph) {
  if (ph < 6.0) return { label: 'Acidic', color: '#e67e22', bg: '#fef9f0', rec: 'Apply agricultural lime (CaCO₃) to raise pH. Recommended: 1–2 tonnes/ha. Test again after 6 weeks.' }
  if (ph <= 7.5) return { label: 'Neutral', color: '#2E7D32', bg: '#f0f8f0', rec: 'Soil pH is in the ideal range for most crops. Maintain organic matter levels. Regular monitoring advised.' }
  return { label: 'Alkaline', color: '#8e44ad', bg: '#f9f0fe', rec: 'Apply sulphur or gypsum to lower pH. Use acidifying fertilisers (ammonium sulphate). Avoid excessive liming.' }
}

function phMeter(ph) {
  const pct = ((ph - 0) / 14) * 100
  const hue = ph < 6 ? 30 : ph <= 7.5 ? 120 : 270
  return { pct, hue }
}

export default function SoilPHDetection() {
  const [form, setForm] = useState({
    sampleId: '', collectionDate: '', phReading: '',
    soilTexture: '', fieldLocation: '', moistureLevel: ''
  })
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = (e) => {
    e.preventDefault()
    const ph = parseFloat(form.phReading)
    if (isNaN(ph) || ph < 0 || ph > 14) return
    setLoading(true)
    setTimeout(() => {
      setResult({ ph, ...phStatus(ph) })
      setLoading(false)
    }, 900)
  }

  const meter = result ? phMeter(result.ph) : null

  return (
    <div className="page-content">
      <div className="page-header">
        <p className="eyebrow">Module 05</p>
        <h1>Soil pH Detection</h1>
        <p className="subtext">Enter sensor or lab readings to classify soil acidity and receive corrective recommendations.</p>
      </div>

      <div className="two-col">
        {/* Form */}
        <div className="panel large">
          <div className="panel-header">
            <div>
              <p className="panel-title">Sample Details</p>
              <p className="panel-subtitle">Log your soil sample data or sensor reading below.</p>
            </div>
          </div>
          <form className="form-grid" onSubmit={handleSubmit}>
            <label className="field">
              <span>Sample ID</span>
              <input type="text" placeholder="e.g. PH-2026-001" value={form.sampleId} onChange={e => set('sampleId', e.target.value)} />
            </label>
            <label className="field">
              <span>Collection Date</span>
              <input type="date" value={form.collectionDate} onChange={e => set('collectionDate', e.target.value)} />
            </label>
            <label className="field" style={{ gridColumn: '1 / -1' }}>
              <span>pH Reading (0.0 – 14.0)</span>
              <input
                type="number" step="0.1" min="0" max="14"
                placeholder="Enter pH value from sensor or lab"
                value={form.phReading}
                onChange={e => set('phReading', e.target.value)}
                style={{ fontSize: 18 }}
              />
            </label>
            <label className="field">
              <span>Soil Texture</span>
              <select value={form.soilTexture} onChange={e => set('soilTexture', e.target.value)}>
                <option value="">Select texture</option>
                {SOIL_TEXTURES.map(s => <option key={s}>{s}</option>)}
              </select>
            </label>
            <label className="field">
              <span>Moisture Level</span>
              <select value={form.moistureLevel} onChange={e => set('moistureLevel', e.target.value)}>
                <option value="">Select level</option>
                {MOISTURE_LEVELS.map(m => <option key={m}>{m}</option>)}
              </select>
            </label>
            <label className="field" style={{ gridColumn: '1 / -1' }}>
              <span>Field Location / GPS</span>
              <input type="text" placeholder="Farm block, GPS coords, or plot ID" value={form.fieldLocation} onChange={e => set('fieldLocation', e.target.value)} />
            </label>
            <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end' }}>
              <button type="submit" className="pill-button" disabled={loading}>
                {loading ? 'Analysing…' : 'Analyse pH'}
              </button>
            </div>
          </form>
        </div>

        {/* Result */}
        <div className="panel result-panel">
          <p className="panel-title">pH Analysis Result</p>
          <p className="panel-subtitle">Classification, visual gauge, and soil correction advice.</p>

          {!result && !loading && (
            <div className="empty-state">
              <div className="empty-icon">🧫</div>
              <p>Enter a pH reading and click <strong>Analyse pH</strong>.</p>
            </div>
          )}
          {loading && (
            <div className="empty-state">
              <div className="loader"></div>
              <p>Processing sample…</p>
            </div>
          )}
          {result && !loading && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 12 }}>
              {/* pH value card */}
              <div className="result-card" style={{ background: result.bg }}>
                <p className="result-label">pH Value</p>
                <p className="result-big" style={{ color: result.color, fontSize: 44 }}>
                  {result.ph.toFixed(1)}
                </p>

                {/* pH scale bar */}
                <div className="ph-scale">
                  <div className="ph-gradient"></div>
                  <div className="ph-marker" style={{ left: meter.pct + '%' }}></div>
                </div>
                <div className="ph-scale-labels">
                  <span>0 — Very Acidic</span>
                  <span>7 — Neutral</span>
                  <span>14 — Alkaline</span>
                </div>
              </div>

              {/* Status */}
              <div className="result-card" style={{ border: `2px solid ${result.color}44` }}>
                <p className="result-label">Soil Status</p>
                <p className="result-big" style={{ color: result.color, fontSize: 22 }}>
                  {result.label}
                </p>
              </div>

              {/* Recommendation */}
              <div className="result-card">
                <p className="result-label" style={{ marginBottom: 8 }}>Corrective Recommendation</p>
                <p style={{ fontSize: 14, lineHeight: '1.6', color: '#3c443e' }}>{result.rec}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
