import { useState } from 'react'

const CROP_TYPES = ['Wheat', 'Rice', 'Maize', 'Cotton', 'Soybean', 'Sugarcane']
const GROWTH_STAGES = ['Seedling', 'Vegetative', 'Flowering', 'Grain Fill', 'Harvest']
const IRRIGATION_TYPES = ['Drip', 'Flood', 'Sprinkler', 'Furrow']

const SCHEDULE = [
  { week: 'Week 1–2', action: 'Basal application', type: 'NPK blend' },
  { week: 'Week 3–4', action: 'Top dressing N', type: 'Urea 46%' },
  { week: 'Week 6–7', action: 'Micronutrient spray', type: 'Zn + B foliar' },
  { week: 'Week 9', action: 'Potassium boost', type: 'MOP 60%' },
]

export default function FertilizerRecommendation() {
  const [form, setForm] = useState({
    cropType: '', growthStage: '', targetYield: '',
    soilN: '', soilP: '', soilK: '',
    farmArea: '', irrigationType: ''
  })
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = (e) => {
    e.preventDefault()
    setLoading(true)
    setTimeout(() => {
      const area = parseFloat(form.farmArea) || 1
      setResult({
        N: Math.round((120 - parseFloat(form.soilN || 30)) * area),
        P: Math.round((60 - parseFloat(form.soilP || 20)) * area),
        K: Math.round((80 - parseFloat(form.soilK || 25)) * area),
        totalCost: Math.round(area * 4200),
      })
      setLoading(false)
    }, 1100)
  }

  return (
    <div className="page-content">
      <div className="page-header">
        <p className="eyebrow">Module 03</p>
        <h1>Fertilizer Recommendation</h1>
        <p className="subtext">Compute optimal NPK doses and application schedule based on soil tests.</p>
      </div>

      <div className="two-col">
        {/* Form */}
        <div className="panel large">
          <div className="panel-header">
            <div>
              <p className="panel-title">Crop &amp; Soil Inputs</p>
              <p className="panel-subtitle">Enter current soil nutrient levels and crop details.</p>
            </div>
          </div>
          <form className="form-grid" onSubmit={handleSubmit}>
            <label className="field">
              <span>Crop Type</span>
              <select value={form.cropType} onChange={e => set('cropType', e.target.value)}>
                <option value="">Select crop</option>
                {CROP_TYPES.map(c => <option key={c}>{c}</option>)}
              </select>
            </label>
            <label className="field">
              <span>Growth Stage</span>
              <select value={form.growthStage} onChange={e => set('growthStage', e.target.value)}>
                <option value="">Select stage</option>
                {GROWTH_STAGES.map(s => <option key={s}>{s}</option>)}
              </select>
            </label>
            <label className="field">
              <span>Target Yield (tons/ha)</span>
              <input type="number" placeholder="e.g. 5.5" value={form.targetYield} onChange={e => set('targetYield', e.target.value)} />
            </label>
            <label className="field">
              <span>Farm Area (ha)</span>
              <input type="number" placeholder="e.g. 2.0" value={form.farmArea} onChange={e => set('farmArea', e.target.value)} />
            </label>
            <label className="field">
              <span>Soil N — Nitrogen (kg/ha)</span>
              <input type="number" placeholder="Current level" value={form.soilN} onChange={e => set('soilN', e.target.value)} />
            </label>
            <label className="field">
              <span>Soil P — Phosphorus (kg/ha)</span>
              <input type="number" placeholder="Current level" value={form.soilP} onChange={e => set('soilP', e.target.value)} />
            </label>
            <label className="field">
              <span>Soil K — Potassium (kg/ha)</span>
              <input type="number" placeholder="Current level" value={form.soilK} onChange={e => set('soilK', e.target.value)} />
            </label>
            <label className="field">
              <span>Irrigation Type</span>
              <select value={form.irrigationType} onChange={e => set('irrigationType', e.target.value)}>
                <option value="">Select type</option>
                {IRRIGATION_TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
            </label>
            <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end' }}>
              <button type="submit" className="pill-button" disabled={loading}>
                {loading ? 'Computing…' : 'Get Fertilizer Plan'}
              </button>
            </div>
          </form>
        </div>

        {/* Results */}
        <div className="panel result-panel">
          <p className="panel-title">Fertilizer Output</p>
          <p className="panel-subtitle">NPK values, cost estimate, and application schedule.</p>
          {!result && !loading && (
            <div className="empty-state">
              <div className="empty-icon">🧪</div>
              <p>Submit the form to generate a fertilizer plan.</p>
            </div>
          )}
          {loading && (
            <div className="empty-state">
              <div className="loader"></div>
              <p>Computing optimal doses…</p>
            </div>
          )}
          {result && !loading && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 12 }}>
              {/* NPK cards */}
              <div className="npk-grid">
                {[
                  { label: 'Nitrogen (N)', value: result.N, unit: 'kg', color: '#2E7D32' },
                  { label: 'Phosphorus (P)', value: result.P, unit: 'kg', color: '#558B2F' },
                  { label: 'Potassium (K)', value: result.K, unit: 'kg', color: '#33691E' },
                ].map(n => (
                  <div key={n.label} className="npk-card" style={{ '--npk-color': n.color }}>
                    <p className="npk-label">{n.label}</p>
                    <p className="npk-value">{n.value} <span>{n.unit}</span></p>
                  </div>
                ))}
              </div>

              {/* Cost */}
              <div className="result-card accent-green">
                <p className="result-label">Estimated Input Cost</p>
                <p className="result-big">₹{result.totalCost.toLocaleString()}</p>
              </div>

              {/* Schedule */}
              <div>
                <p className="panel-title" style={{ marginBottom: 10 }}>Application Schedule</p>
                {SCHEDULE.map(s => (
                  <div key={s.week} className="schedule-row">
                    <span className="schedule-week">{s.week}</span>
                    <div>
                      <p className="schedule-action">{s.action}</p>
                      <p className="schedule-type">{s.type}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
