import { NavLink, Routes, Route, Navigate } from 'react-router-dom'
import YieldPrediction from './pages/YieldPrediction'
import CropRecommendation from './pages/CropRecommendation'
import FertilizerRecommendation from './pages/FertilizerRecommendation'
import PlantDiseaseDetection from './pages/PlantDiseaseDetection'
import SoilPHDetection from './pages/SoilPHDetection'
import ChatBot from './pages/ChatBot'

const NAV = [
  { to: '/yield-prediction',         icon: '🌾', label: 'Yield Prediction' },
  { to: '/crop-recommendation',      icon: '🌱', label: 'Crop Recommendation' },
  { to: '/fertilizer-recommendation',icon: '🧪', label: 'Fertilizer Recommendation' },
  { to: '/plant-disease-detection',  icon: '🔬', label: 'Plant Disease Detection' },
  { to: '/soil-ph-detection',        icon: '🧫', label: 'Soil pH Detection' },
  { to: '/ai-agronomist',             icon: '🤖', label: 'AI Agronomist' },
]

export default function App() {
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-dot" aria-hidden="true"></span>
          <div>
            <p className="brand-name">360° Agri</p>
            <p className="brand-tag">smart farming suite</p>
          </div>
        </div>

        <nav className="nav">
          {NAV.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
            >
              <span className="nav-icon">{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <p className="sidebar-version">v1.0 · 2026</p>
        </div>
      </aside>

      <main className="main">
        <Routes>
          <Route path="/" element={<Navigate to="/yield-prediction" replace />} />
          <Route path="/yield-prediction"          element={<YieldPrediction />} />
          <Route path="/crop-recommendation"       element={<CropRecommendation />} />
          <Route path="/fertilizer-recommendation" element={<FertilizerRecommendation />} />
          <Route path="/plant-disease-detection"   element={<PlantDiseaseDetection />} />
          <Route path="/soil-ph-detection"         element={<SoilPHDetection />} />
          <Route path="/ai-agronomist"             element={<ChatBot />} />
        </Routes>
      </main>
    </div>
  )
}
