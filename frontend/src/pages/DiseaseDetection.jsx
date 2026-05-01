import { useState, useRef } from 'react'

export default function DiseaseDetection() {
  const [image, setImage] = useState(null)
  const [preview, setPreview] = useState(null)
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const fileInputRef = useRef(null)

  const handleFileChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      setImage(file)
      setPreview(URL.createObjectURL(file))
      setResult(null)
      setError(null)
    }
  }

  const handleUpload = async () => {
    if (!image) {
      setError('Please select an image first.')
      return
    }

    setLoading(true)
    setError(null)

    const formData = new FormData()
    formData.append('file', image)

    try {
      const response = await fetch('http://localhost:5000/v1/disease/detect', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const errData = await response.json()
        throw new Error(errData.detail || 'Analysis failed')
      }

      const data = await response.json()
      setResult(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const reset = () => {
    setImage(null)
    setPreview(null)
    setResult(null)
    setError(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  // Format disease name for display (e.g., Tomato___Bacterial_spot -> Tomato: Bacterial Spot)
  const formatName = (name) => {
    if (!name) return ''
    return name.replace(/___/g, ': ').replace(/_/g, ' ')
  }

  return (
    <div className="page-content">
      <div className="page-header">
        <p className="eyebrow">Module 05</p>
        <h1>Plant Disease Detection</h1>
        <p className="subtext">Identify crop diseases instantly using AI-powered vision analysis.</p>
      </div>

      <div className="two-col">
        {/* Upload Panel */}
        <div className="panel large">
          <div className="panel-header">
            <div>
              <p className="panel-title">Upload Leaf Image</p>
              <p className="panel-subtitle">Select a clear photo of the affected plant leaf.</p>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 20, alignItems: 'center', justifyContent: 'center', minHeight: 300, border: '2px dashed rgba(255,255,255,0.05)', borderRadius: 20, background: 'rgba(255,255,255,0.01)', padding: 20 }}>
            {preview ? (
              <div style={{ position: 'relative', width: '100%', maxWidth: 400 }}>
                <img src={preview} alt="Leaf Preview" style={{ width: '100%', borderRadius: 12, boxShadow: '0 10px 30px rgba(0,0,0,0.3)' }} />
                <button 
                  onClick={reset}
                  style={{ position: 'absolute', top: -10, right: -10, background: '#ef5350', color: 'white', border: 'none', borderRadius: '50%', width: 24, height: 24, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 'bold' }}
                >
                  ×
                </button>
              </div>
            ) : (
              <div 
                onClick={() => fileInputRef.current?.click()}
                style={{ textAlign: 'center', cursor: 'pointer', padding: 40 }}
              >
                <div style={{ fontSize: '3rem', marginBottom: 16 }}>📸</div>
                <p style={{ opacity: 0.7, marginBottom: 8 }}>Click to browse or drag and drop</p>
                <p style={{ fontSize: '0.75rem', opacity: 0.4 }}>Supports JPG, PNG (Max 5MB)</p>
              </div>
            )}
            
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileChange} 
              accept="image/*" 
              style={{ display: 'none' }} 
            />

            <button 
              className="pill-button" 
              onClick={handleUpload} 
              disabled={!image || loading}
              style={{ marginTop: 10 }}
            >
              {loading ? 'Analyzing Image...' : 'Run AI Diagnosis'}
            </button>
          </div>
        </div>

        {/* Results Panel */}
        <div className="panel result-panel">
          <p className="panel-title">Diagnosis Report</p>
          <p className="panel-subtitle">AI analysis results and confidence score.</p>

          {error && (
            <div className="empty-state error" style={{ color: '#ef5350' }}>
              <div className="empty-icon">⚠️</div>
              <p>{error}</p>
            </div>
          )}

          {!result && !loading && !error && (
            <div className="empty-state">
              <div className="empty-icon">🔍</div>
              <p>Upload an image to start detection.</p>
            </div>
          )}

          {loading && (
            <div className="empty-state">
              <div className="loader"></div>
              <p>Scanning leaf patterns...</p>
            </div>
          )}

          {result && !loading && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20, marginTop: 12 }}>
              <div className={`result-card ${result.disease.includes('healthy') ? 'accent-green' : 'accent-red'}`}>
                <p className="result-label">Detected Status</p>
                <p className="result-big" style={{ fontSize: '1.4rem' }}>{formatName(result.disease)}</p>
                
                <div style={{ marginTop: 15, display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ flex: 1, height: 6, background: 'rgba(255,255,255,0.1)', borderRadius: 3 }}>
                    <div style={{ height: '100%', background: result.disease.includes('healthy') ? '#8bc34a' : '#ef5350', width: `${result.confidence * 100}%`, borderRadius: 3 }}></div>
                  </div>
                  <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>{Math.round(result.confidence * 100)}% Match</span>
                </div>
              </div>

              <div style={{ padding: 20, background: 'rgba(255,255,255,0.03)', borderRadius: 16 }}>
                <p style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: 12 }}>Recommendations</p>
                <ul style={{ paddingLeft: 18, fontSize: '0.8rem', opacity: 0.8, lineHeight: 1.6, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {result.disease.includes('healthy') ? (
                    <>
                      <li>Continue regular monitoring and maintenance.</li>
                      <li>Maintain current irrigation and fertilization schedules.</li>
                      <li>Keep the field clear of weeds and debris.</li>
                    </>
                  ) : (
                    <>
                      <li>Isolate affected plants if possible to prevent spread.</li>
                      <li>Consult with a local agronomist for specific treatment options.</li>
                      <li>Check irrigation levels; excessive moisture often promotes fungal growth.</li>
                      <li>Consider appropriate fungicides or biological controls after verifying the diagnosis.</li>
                    </>
                  )}
                </ul>
              </div>

              <p style={{ fontSize: '0.7rem', opacity: 0.4, textAlign: 'center' }}>
                Note: AI diagnosis should be used as a guideline. Always verify with field inspection.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
