import { useState } from 'react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts'

const ndviData = [
  { month: 'Nov', ndvi: 0.31 },
  { month: 'Dec', ndvi: 0.44 },
  { month: 'Jan', ndvi: 0.62 },
  { month: 'Feb', ndvi: 0.75 },
  { month: 'Mar', ndvi: 0.81 },
  { month: 'Apr', ndvi: 0.69 },
  { month: 'May', ndvi: 0.52 },
]

const SEASONS = ['Kharif', 'Rabi', 'Zaid']
const PEST_LEVELS = ['Low', 'Medium', 'High']
const FIELDS = ['Field A – North Block', 'Field B – South Block', 'Field C – East Wing']
  
export default function YieldPrediction() {
  const [form, setForm] = useState({
    field: '', cropVariety: '', area: '', season: '', sowingDate: '',
    rainfall: '', temperature: '', irrigationCycles: '', pestRisk: ''
  })
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = (e) => {
    e.preventDefault()
    setLoading(true)
    setTimeout(() => {
      const yieldVal = (Math.random() * 2 + 3.2).toFixed(2)
      const conf = Math.floor(Math.random() * 10 + 84)
      setResult({ yield: yieldVal, confidence: conf })
      setLoading(false)
    }, 1200)
  }

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <p className="eyebrow">Module 01</p>
          <h1>Yield Prediction</h1>
          <p className="subtext">Estimate harvest output using agronomic and environmental inputs.</p>
        </div>
      </div>

      {/* NDVI Chart */}
      <div className="panel">
        <p className="panel-title">NDVI Trend — Vegetation Index</p>
        <p className="panel-subtitle">Normalised Difference Vegetation Index over the last 7 months</p>
        <div style={{ height: 200, marginTop: 16 }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={ndviData}>
              <defs>
                <linearGradient id="ndviGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#4caf50" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#4caf50" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e3e9d2" />
              <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#7d877f' }} />
              <YAxis domain={[0, 1]} tick={{ fontSize: 12, fill: '#7d877f' }} />
              <Tooltip
                contentStyle={{ borderRadius: 10, border: '1px solid #e3e9d2', fontSize: 13 }}
                formatter={(v) => [v.toFixed(2), 'NDVI']}
              />
              <Area
                type="monotone" dataKey="ndvi"
                stroke="#2E7D32" strokeWidth={2.5}
                fill="url(#ndviGrad)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Weather summary */}
      <div className="cards-row">
        {[
          { label: 'Temperature', value: '34 °C', note: 'Avg next 30 days' },
          { label: 'Rainfall Forecast', value: '112 mm', note: 'Next 30 days' },
          { label: 'Humidity', value: '72%', note: 'Current reading' },
          { label: 'Wind Speed', value: '14 km/h', note: 'Average' },
        ].map(c => (
          <div key={c.label} className="stat-card">
            <p className="stat-title">{c.label}</p>
            <p className="stat-value">{c.value}</p>
            <p className="stat-chip">{c.note}</p>
          </div>
        ))}
      </div>

      <div className="two-col">
        {/* Input form */}
        <div className="panel large">
          <div className="panel-header">
            <div>
              <p className="panel-title">Input Parameters</p>
              <p className="panel-subtitle">Fill all fields and run the prediction model.</p>
            </div>
          </div>
          <form className="form-grid" onSubmit={handleSubmit}>
            <label className="field">
              <span>Field Selector</span>
              <select value={form.field} onChange={e => set('field', e.target.value)}>
                <option value="">Select field</option>
                {FIELDS.map(f => <option key={f}>{f}</option>)}
              </select>
            </label>
            <label className="field">
              <span>Crop Variety</span>
              <input type="text" placeholder="e.g. HD-2967, PUSA Basmati" value={form.cropVariety} onChange={e => set('cropVariety', e.target.value)} />
            </label>
            <label className="field">
              <span>Cultivation Area (ha)</span>
              <input type="number" placeholder="Total area in hectares" value={form.area} onChange={e => set('area', e.target.value)} />
            </label>
            <label className="field">
              <span>Season</span>
              <select value={form.season} onChange={e => set('season', e.target.value)}>
                <option value="">Select season</option>
                {SEASONS.map(s => <option key={s}>{s}</option>)}
              </select>
            </label>
            <label className="field">
              <span>Sowing Date</span>
              <input type="date" value={form.sowingDate} onChange={e => set('sowingDate', e.target.value)} />
            </label>
            <label className="field">
              <span>Rainfall Forecast (mm)</span>
              <input type="number" placeholder="Expected next 30 days" value={form.rainfall} onChange={e => set('rainfall', e.target.value)} />
            </label>
            <label className="field">
              <span>Avg Temperature (°C)</span>
              <input type="number" placeholder="Next 30 days average" value={form.temperature} onChange={e => set('temperature', e.target.value)} />
            </label>
            <label className="field">
              <span>Irrigation Cycles / week</span>
              <input type="number" placeholder="Times per week" value={form.irrigationCycles} onChange={e => set('irrigationCycles', e.target.value)} />
            </label>
            <label className="field" style={{ gridColumn: '1 / -1' }}>
              <span>Pest Risk Level</span>
              <select value={form.pestRisk} onChange={e => set('pestRisk', e.target.value)}>
                <option value="">Select risk level</option>
                {PEST_LEVELS.map(p => <option key={p}>{p}</option>)}
              </select>
            </label>
            <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end' }}>
              <button type="submit" className="pill-button" disabled={loading}>
                {loading ? 'Predicting…' : 'Run Prediction'}
              </button>
            </div>
          </form>
        </div>

        {/* Result */}
        <div className="panel result-panel">
          <p className="panel-title">Prediction Result</p>
          <p className="panel-subtitle">Submit the form to generate yield output.</p>
          {!result && !loading && (
            <div className="empty-state">
              <div className="empty-icon">🌾</div>
              <p>Awaiting input — fill the form and click <strong>Run Prediction</strong>.</p>
            </div>
          )}
          {loading && (
            <div className="empty-state">
              <div className="loader"></div>
              <p>Running model…</p>
            </div>
          )}
          {result && !loading && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 12 }}>
              <div className="result-card accent-green">
                <p className="result-label">Predicted Yield</p>
                <p className="result-big">{result.yield} <span>tons / ha</span></p>
              </div>
              <div className="result-card">
                <p className="result-label">Model Confidence</p>
                <div className="conf-bar-wrap">
                  <div className="conf-bar" style={{ width: result.confidence + '%' }}></div>
                </div>
                <p className="result-big">{result.confidence}<span>%</span></p>
              </div>
              <div className="result-card">
                <p className="result-label">Status</p>
                <p className="result-status good">✓ High Confidence Estimate</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
