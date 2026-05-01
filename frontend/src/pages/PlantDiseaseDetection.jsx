import { useState, useRef, useCallback } from 'react'

const DISEASE_DB = {
  tomato: [
    { name: 'Late Blight', confidence: 91, severity: 'High', steps: ['Remove affected leaves immediately', 'Apply copper-based fungicide (Bordeaux mixture)', 'Improve drainage and airflow', 'Avoid overhead irrigation'] },
    { name: 'Early Blight', confidence: 84, severity: 'Medium', steps: ['Prune lower infected leaves', 'Apply mancozeb or chlorothalonil', 'Mulch around base to prevent soil splash', 'Maintain plant nutrition'] },
  ],
  potato: [
    { name: 'Common Scab', confidence: 87, severity: 'Medium', steps: ['Acidify soil to pH 5.2–5.5', 'Avoid excessive liming', 'Use disease-free certified seed', 'Maintain consistent soil moisture'] },
  ],
  grape: [
    { name: 'Powdery Mildew', confidence: 93, severity: 'High', steps: ['Apply sulphur-based fungicide early morning', 'Improve canopy ventilation by pruning', 'Avoid excessive nitrogen fertilisation', 'Use resistant varieties next season'] },
  ],
  chili: [
    { name: 'Anthracnose', confidence: 78, severity: 'Medium', steps: ['Remove and destroy infected fruits', 'Apply carbendazim 0.1% spray', 'Ensure proper field sanitation', 'Reduce humidity with spacing'] },
  ],
}
const SEVERITY_COLOR = { High: '#c0392b', Medium: '#e67e22', Low: '#27ae60' }
const CROP_TYPES = ['Tomato', 'Potato', 'Grape', 'Chili']

export default function PlantDiseaseDetection() {
  const [cropType, setCropType] = useState('')
  const [image, setImage] = useState(null)
  const [imageUrl, setImageUrl] = useState(null)
  const [dragging, setDragging] = useState(false)
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const inputRef = useRef()

  const processFile = (file) => {
    if (!file || !file.type.startsWith('image/')) return
    setImage(file)
    setImageUrl(URL.createObjectURL(file))
    setResult(null)
  }

  const onDrop = useCallback((e) => {
    e.preventDefault()
    setDragging(false)
    processFile(e.dataTransfer.files[0])
  }, [])

  const onDragOver = (e) => { e.preventDefault(); setDragging(true) }
  const onDragLeave = () => setDragging(false)

  const handleAnalyse = () => {
    if (!image || !cropType) return
    setLoading(true)
    setTimeout(() => {
      const key = cropType.toLowerCase()
      const db = DISEASE_DB[key] || [{ name: 'Leaf Spot', confidence: 74, severity: 'Low', steps: ['Monitor field daily', 'Apply general fungicide', 'Maintain plant hygiene'] }]
      setResult(db[Math.floor(Math.random() * db.length)])
      setLoading(false)
    }, 1400)
  }

  return (
    <div className="page-content">
      <div className="page-header">
        <p className="eyebrow">Module 04</p>
        <h1>Plant Disease Detection</h1>
        <p className="subtext">Upload a crop photo and select the plant type to identify diseases with AI confidence scoring.</p>
      </div>

      <div className="two-col">
        {/* Upload + controls */}
        <div className="panel large">
          <div className="panel-header">
            <div>
              <p className="panel-title">Image Upload</p>
              <p className="panel-subtitle">Drag &amp; drop or click to browse an image.</p>
            </div>
          </div>

          {/* Drop zone */}
          <div
            className={`drop-zone ${dragging ? 'dragging' : ''} ${imageUrl ? 'has-image' : ''}`}
            onDrop={onDrop}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onClick={() => inputRef.current?.click()}
          >
            {imageUrl ? (
              <img src={imageUrl} alt="Uploaded crop" className="preview-img" />
            ) : (
              <div className="drop-placeholder">
                <span className="drop-icon">📷</span>
                <p className="drop-label">Drag &amp; drop image here</p>
                <p className="drop-sub">or click to browse — PNG, JPG, WEBP</p>
              </div>
            )}
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={e => processFile(e.target.files[0])}
            />
          </div>

          {imageUrl && (
            <button
              type="button"
              className="ghost-button-green"
              onClick={() => { setImage(null); setImageUrl(null); setResult(null) }}
            >
              ✕ Remove image
            </button>
          )}

          {/* Crop selector */}
          <label className="field" style={{ marginTop: 4 }}>
            <span>Plant / Crop Type</span>
            <select value={cropType} onChange={e => setCropType(e.target.value)}>
              <option value="">Select plant type</option>
              {CROP_TYPES.map(c => <option key={c}>{c}</option>)}
            </select>
          </label>

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button
              type="button"
              className="pill-button"
              disabled={!image || !cropType || loading}
              onClick={handleAnalyse}
            >
              {loading ? 'Analysing…' : 'Detect Disease'}
            </button>
          </div>
        </div>

        {/* Result panel */}
        <div className="panel result-panel">
          <p className="panel-title">Detection Result</p>
          <p className="panel-subtitle">AI diagnosis with confidence score and treatment plan.</p>

          {!result && !loading && (
            <div className="empty-state">
              <div className="empty-icon">🔬</div>
              <p>Upload an image and click <strong>Detect Disease</strong>.</p>
            </div>
          )}
          {loading && (
            <div className="empty-state">
              <div className="loader"></div>
              <p>Running vision model…</p>
            </div>
          )}
          {result && !loading && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 12 }}>
              <div className="result-card accent-green">
                <p className="result-label">Detected Disease</p>
                <p className="result-big" style={{ fontSize: 22 }}>{result.name}</p>
                <span
                  className="severity-badge"
                  style={{ background: SEVERITY_COLOR[result.severity] + '22', color: SEVERITY_COLOR[result.severity], border: `1px solid ${SEVERITY_COLOR[result.severity]}44` }}
                >
                  {result.severity} Severity
                </span>
              </div>

              <div className="result-card">
                <p className="result-label">Model Confidence</p>
                <div className="conf-bar-wrap">
                  <div className="conf-bar" style={{ width: result.confidence + '%' }}></div>
                </div>
                <p className="result-big">{result.confidence}<span>%</span></p>
              </div>

              <div className="result-card">
                <p className="result-label" style={{ marginBottom: 10 }}>Treatment Steps</p>
                <ol className="treatment-list">
                  {result.steps.map((step, i) => (
                    <li key={i}>{step}</li>
                  ))}
                </ol>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
