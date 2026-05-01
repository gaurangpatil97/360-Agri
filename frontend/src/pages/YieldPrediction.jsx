import { useMemo, useState } from 'react'
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

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'

const FEATURE_FIELDS = [
  'rainfall',
  'NDVI',
  'SAVI',
  'soil_moisture',
  'NDWI',
  'GNDVI',
  'ndwi_mean',
  'temp_mean',
  'evi_mean',
  'elevation',
  'ndvi_mean',
  'savi_mean',
  'ndvi_max',
  'rainfall_total',
  'ndvi_std',
  'gndvi_mean',
  'rainfall_std',
  'temperature',
  'date_of_image',
  'soil_carbon',
]

const FEATURE_METADATA = {
  rainfall: { label: 'Rainfall', unit: 'mm', icon: '🌧️' },
  NDVI: { label: 'NDVI', unit: 'unitless', icon: '🌱' },
  SAVI: { label: 'SAVI', unit: 'unitless', icon: '🌿' },
  soil_moisture: { label: 'Soil Moisture', unit: '%', icon: '💧' },
  NDWI: { label: 'NDWI', unit: 'unitless', icon: '🌊' },
  GNDVI: { label: 'GNDVI', unit: 'unitless', icon: '🍃' },
  ndwi_mean: { label: 'NDWI Mean', unit: 'unitless', icon: '📊' },
  temp_mean: { label: 'Temp Mean', unit: '°C', icon: '🌡️' },
  evi_mean: { label: 'EVI Mean', unit: 'unitless', icon: '🌱' },
  elevation: { label: 'Elevation', unit: 'm', icon: '⛰️' },
  ndvi_mean: { label: 'NDVI Mean', unit: 'unitless', icon: '📊' },
  savi_mean: { label: 'SAVI Mean', unit: 'unitless', icon: '🌿' },
  ndvi_max: { label: 'NDVI Max', unit: 'unitless', icon: '📈' },
  rainfall_total: { label: 'Total Rainfall', unit: 'mm', icon: '🌧️' },
  ndvi_std: { label: 'NDVI Std Dev', unit: 'unitless', icon: '📉' },
  gndvi_mean: { label: 'GNDVI Mean', unit: 'unitless', icon: '🍃' },
  rainfall_std: { label: 'Rainfall Std Dev', unit: 'mm', icon: '📉' },
  temperature: { label: 'Temperature', unit: '°C', icon: '🌡️' },
  date_of_image: { label: 'Observation Date', unit: '', icon: '📅' },
  soil_carbon: { label: 'Soil Carbon', unit: '%', icon: '🪵' },
}

const CROPS = ['Wheat', 'Rice', 'Maize', 'Cotton', 'Sugarcane', 'Soybean', 'Barley', 'Millet', 'Pulses']
  
export default function YieldPrediction() {
  const [form, setForm] = useState({
    lat: '',
    lon: '',
    cropType: 'Wheat',
    referenceDate: new Date().toISOString().slice(0, 10),
    windowDays: 30,
  })
  const [featureValues, setFeatureValues] = useState({})
  const [sources, setSources] = useState({})
  const [warnings, setWarnings] = useState([])
  const [missingFeatures, setMissingFeatures] = useState([])
  const [fetchingFeatures, setFetchingFeatures] = useState(false)
  const [result, setResult] = useState(null)
  const [predicting, setPredicting] = useState(false)
  const [error, setError] = useState('')

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const filledFeatureCount = useMemo(() => {
    return FEATURE_FIELDS.reduce((acc, key) => (featureValues[key] == null || featureValues[key] === '' ? acc : acc + 1), 0)
  }, [featureValues])

  const applyCurrentLocation = () => {
    setError('')
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser.')
      return
    }
    navigator.geolocation.getCurrentPosition(
      pos => {
        set('lat', pos.coords.latitude.toFixed(6))
        set('lon', pos.coords.longitude.toFixed(6))
      },
      () => setError('Could not fetch your current location. Please enter latitude and longitude manually.')
    )
  }

  const fetchFeatures = async () => {
    setError('')
    setResult(null)
    const lat = Number(form.lat)
    const lon = Number(form.lon)
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
      setError('Please enter a valid latitude and longitude.')
      return
    }

    try {
      setFetchingFeatures(true)
      const response = await fetch(`${API_BASE_URL}/v1/yield/features/build`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lat,
          lon,
          crop_type: form.cropType,
          start_date: new Date(new Date(form.referenceDate).getTime() - ((Number(form.windowDays) || 30) - 1) * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
          end_date: form.referenceDate,
          window_days: Number(form.windowDays) || 30,
        }),
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data?.detail || 'Failed to fetch location-based features.')
      }

      setFeatureValues(data.values || {})
      setSources(data.sources || {})
      setWarnings(data.warnings || [])
      setMissingFeatures(data.missing_features || [])
    } catch (err) {
      setError(err.message || 'Failed to fetch features from backend.')
    } finally {
      setFetchingFeatures(false)
    }
  }

  const handleFeatureValueChange = (featureKey, value) => {
    setFeatureValues(prev => ({ ...prev, [featureKey]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (Object.keys(featureValues).length === 0) {
      setError('Fetch location-based features first, then run prediction.')
      return
    }

    setError('')
    try {
      setPredicting(true)
      const payloadFeatures = {
        ...featureValues,
        crop_type: form.cropType,
      }
      const response = await fetch(`${API_BASE_URL}/v1/yield/predict`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ features: payloadFeatures }),
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data?.detail || 'Prediction failed.')
      }

      setResult({
        yield: data.predicted_yield_ton_per_ha,
        confidence: data.confidence_percent,
        modelName: data.model_name,
        notes: data.notes || [],
      })
    } catch (err) {
      setError(err.message || 'Prediction failed.')
    } finally {
      setPredicting(false)
    }
  }

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <p className="eyebrow">Yield Intelligence</p>
          <h1>Yield Prediction Pipeline</h1>
          <p className="subtext">
            Our AI engine integrates satellite imagery, soil grids, and historical weather data 
            to estimate crop yields with high precision.
          </p>
        </div>
      </div>

      <div className="cards-row">
        {[
          {
            label: 'Temperature',
            value: featureValues.temperature != null ? `${Number(featureValues.temperature).toFixed(1)}°C` : '—',
            note: 'Latest reading',
          },
          {
            label: 'Rainfall (Total)',
            value: featureValues.rainfall_total != null ? `${Number(featureValues.rainfall_total).toFixed(1)}mm` : '—',
            note: 'Window sum',
          },
          {
            label: 'Soil Moisture',
            value: featureValues.soil_moisture != null ? `${Number(featureValues.soil_moisture).toFixed(1)}%` : '—',
            note: 'Surface layer',
          },
          {
            label: 'Data Integrity',
            value: `${filledFeatureCount}/${FEATURE_FIELDS.length}`,
            note: 'Features loaded',
          },
        ].map(c => (
          <div key={c.label} className="stat-card">
            <p className="stat-title">{c.label}</p>
            <p className="stat-value">{c.value}</p>
            <p className="stat-chip">{c.note}</p>
          </div>
        ))}
      </div>

      <div className="two-col">
        {/* Left Col: Setup and Inputs */}
        <div className="panel large">
          <div className="panel-header">
            <div>
              <p className="panel-title">1. Location & Environment</p>
              <p className="panel-subtitle">Define the field location and observation period.</p>
            </div>
          </div>
          
          <form className="form-grid" onSubmit={e => e.preventDefault()}>
            <label className="field">
              <span>Latitude</span>
              <input type="number" placeholder="e.g. 28.6139" value={form.lat} onChange={e => set('lat', e.target.value)} />
            </label>
            <label className="field">
              <span>Longitude</span>
              <input type="number" placeholder="e.g. 77.2090" value={form.lon} onChange={e => set('lon', e.target.value)} />
            </label>
            <label className="field">
              <span>Crop Type</span>
              <select value={form.cropType} onChange={e => set('cropType', e.target.value)}>
                {CROPS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </label>
            <label className="field">
              <span>Observation Date</span>
              <input type="date" value={form.referenceDate} onChange={e => set('referenceDate', e.target.value)} />
            </label>
            
            <div className="action-row" style={{ gridColumn: '1 / -1', marginTop: 8 }}>
              <button type="button" className="ghost-button-green" onClick={applyCurrentLocation}>
                📍 Use Current Location
              </button>
              <button type="button" className="pill-button" onClick={fetchFeatures} disabled={fetchingFeatures}>
                {fetchingFeatures ? '🛰️ Fetching Data...' : '📡 Fetch Environmental Values'}
              </button>
            </div>

            {error && <p className="inline-error" style={{ gridColumn: '1 / -1' }}>{error}</p>}
          </form>

          {/* Feature Verification Table */}
          {Object.keys(featureValues).length > 0 && (
            <div className="feature-table-wrap" style={{ marginTop: 12 }}>
              <p className="panel-title" style={{ marginBottom: 12 }}>2. Verify Fetched Features</p>
              <div className="feature-table-head">
                <span>Agronomic Input</span>
                <span>Value & Unit</span>
                <span>Data Source</span>
              </div>
              <div style={{ maxHeight: 400, overflowY: 'auto', paddingRight: 4 }}>
                {FEATURE_FIELDS.map((key) => {
                  const meta = FEATURE_METADATA[key] || { label: key, unit: '', icon: '🔹' }
                  const source = sources[key]
                  const status = source?.status || 'missing'
                  return (
                    <div key={key} className="feature-row">
                      <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 16 }}>{meta.icon}</span>
                        <span>{meta.label}</span>
                      </span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <input
                          type="text"
                          value={featureValues[key] ?? ''}
                          onChange={e => handleFeatureValueChange(key, e.target.value)}
                          placeholder="—"
                          style={{ width: '100%' }}
                        />
                        <span style={{ fontSize: 11, color: '#999', whiteSpace: 'nowrap', width: 50 }}>{meta.unit}</span>
                      </div>
                      <span className={`source-tag ${status}`} title={source?.note}>
                        {source?.provider || 'unassigned'}
                      </span>
                    </div>
                  )
                })}
              </div>
              
              <div className="action-row" style={{ marginTop: 20 }}>
                <button 
                  type="button" 
                  className="pill-button" 
                  style={{ width: '100%', padding: '16px' }}
                  onClick={handleSubmit} 
                  disabled={predicting}
                >
                  {predicting ? '🤖 Analyzing with ML Model...' : '🌾 Run Yield Prediction'}
                </button>
              </div>
            </div>
          )}

          {warnings.length > 0 && (
            <div className="inline-error" style={{ background: '#fff9e6', borderColor: '#ffe58f', color: '#856404' }}>
              <strong>Quality Warnings:</strong> {warnings.join(' | ')}
            </div>
          )}
        </div>

        {/* Right Col: Prediction results & Insights */}
        <div className="panel result-panel">
          <div className="panel-header">
            <div>
              <p className="panel-title">Prediction Insights</p>
              <p className="panel-subtitle">Results from the optimized regression ensemble.</p>
            </div>
          </div>

          {!result && !predicting && (
            <div className="empty-state">
              <div className="empty-icon">🌾</div>
              <p>Awaiting inputs. Fill the location details and fetch satellite/weather data to see the prediction here.</p>
            </div>
          )}

          {predicting && (
            <div className="empty-state">
              <div className="loader"></div>
              <p>Processing {FEATURE_FIELDS.length} spatial features...</p>
            </div>
          )}

          {result && !predicting && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20, marginTop: 12 }}>
              <div className="result-card accent-green">
                <p className="result-label">Estimated Harvest Yield</p>
                <p className="result-big">{result.yield.toFixed(2)} <span>tons / hectare</span></p>
              </div>

              <div className="result-card">
                <p className="result-label">Model Confidence Score</p>
                <div className="conf-bar-wrap">
                  <div className="conf-bar" style={{ width: result.confidence + '%' }}></div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                   <p className="result-big" style={{ fontSize: 24 }}>{result.confidence}<span>%</span></p>
                   <p className={`result-status ${result.confidence > 80 ? 'good' : ''}`}>
                     {result.confidence > 80 ? 'High Reliability' : 'Moderate Reliability'}
                   </p>
                </div>
              </div>

              <div className="panel-alt" style={{ padding: 16, borderRadius: 12, border: '1px solid var(--border)' }}>
                <p className="panel-title" style={{ fontSize: 13 }}>NDVI Historical Context</p>
                <div style={{ height: 140, marginTop: 12 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={ndviData}>
                      <defs>
                        <linearGradient id="ndviGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#4caf50" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#4caf50" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e3e9d2" />
                      <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#7d877f' }} />
                      <Tooltip />
                      <Area type="monotone" dataKey="ndvi" stroke="#2E7D32" strokeWidth={2} fill="url(#ndviGrad)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="result-card">
                <p className="result-label">Model Metadata</p>
                <p className="result-status" style={{ fontSize: 13, color: '#555' }}>
                  Architecture: <strong>{result.modelName}</strong>
                </p>
                {result.notes?.length > 0 && (
                  <div style={{ marginTop: 10 }}>
                    <p className="panel-subtitle" style={{ fontSize: 11, color: '#888' }}>
                      {result.notes.join(' • ')}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
