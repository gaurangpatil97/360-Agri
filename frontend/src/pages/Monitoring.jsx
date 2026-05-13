import { useState, useEffect } from 'react'
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'

const API_BASE_URL = 'http://localhost:5000'

export default function Monitoring() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchStats()
    const interval = setInterval(fetchStats, 10000)
    return () => clearInterval(interval)
  }, [])

  const fetchStats = async () => {
    setLoading(false)
    setError(null)
    try {
      const response = await fetch(`${API_BASE_URL}/v1/monitoring/stats`)
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const data = await response.json()
      setStats(data)
    } catch (err) {
      setError(err.message || 'Failed to fetch monitoring stats')
    }
  }

  const calculateAvgResponseTime = (avgMap) => {
    if (!avgMap || Object.keys(avgMap).length === 0) return 0
    const values = Object.values(avgMap)
    return (values.reduce((a, b) => a + b, 0) / values.length).toFixed(2)
  }

  const stripPrefix = (endpoint) => {
    return endpoint.replace(/^\/v1/, '')
  }

  const barChartData =
    stats && stats.requests_per_endpoint
      ? Object.entries(stats.requests_per_endpoint).map(([endpoint, count]) => ({
          endpoint: stripPrefix(endpoint),
          count,
        }))
      : []

  const lineChartData = stats?.requests_last_7_days || []

  const avgResponseTime = stats
    ? calculateAvgResponseTime(stats.avg_response_ms_per_endpoint)
    : 0

  const statusCodeData =
    stats && stats.status_code_breakdown
      ? Object.entries(stats.status_code_breakdown).map(([code, percent]) => ({
          name: `${code}`,
          value: parseFloat(percent),
        }))
      : []

  const methodDistributionData =
    stats && stats.method_distribution
      ? Object.entries(stats.method_distribution).map(([method, count]) => ({
          method,
          count,
        }))
      : []

  const getStatusCodeColor = (code) => {
    const statusCode = parseInt(code)
    if (statusCode >= 200 && statusCode < 300) return 'var(--green)'
    if (statusCode >= 400 && statusCode < 500) return '#f59e0b'
    if (statusCode >= 500) return '#ef4444'
    return '#999'
  }

  if (loading && !stats) {
    return (
      <div className="page-container">
        <div className="page-content">
          <h1>Monitoring</h1>
          <p className="page-subtitle">Loading monitoring statistics...</p>
        </div>
      </div>
    )
  }

  if (error && !stats) {
    return (
      <div className="page-container">
        <div className="page-content">
          <h1>Monitoring</h1>
          <div className="error-box">
            <p>{error}</p>
            <button className="btn btn-primary" onClick={fetchStats}>
              Retry
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="page-container">
      <div className="page-content">
        <h1>Monitoring</h1>
        <p className="page-subtitle">Real-time API performance and usage statistics.</p>

        {/* KPI Cards */}
        <div className="kpi-grid">
          <div className="kpi-card panel">
            <div className="kpi-label">Total Requests</div>
            <div className="kpi-value">{stats?.total_requests || 0}</div>
          </div>

          <div className="kpi-card panel">
            <div className="kpi-label">Avg Response Time</div>
            <div className="kpi-value">{avgResponseTime} ms</div>
          </div>

          <div className="kpi-card panel">
            <div className="kpi-label">Error Rate</div>
            <div className="kpi-value">{stats?.error_rate_percent || 0}%</div>
          </div>
        </div>

        <div className="kpi-grid-2">
          <div className="kpi-card panel">
            <div className="kpi-label">Most Active Endpoint</div>
            <div className="kpi-value-text">{stripPrefix(stats?.most_active_endpoint || 'N/A')}</div>
          </div>

          <div className="kpi-card panel">
            <div className="kpi-label">Slowest Endpoint</div>
            <div className="kpi-value-text">{stripPrefix(stats?.slowest_endpoint?.endpoint || 'N/A')}</div>
            <div className="kpi-subtext">{stats?.slowest_endpoint?.avg_ms || 0} ms</div>
          </div>
        </div>

        {/* Charts Section */}
        <div className="charts-section">
          <div className="chart-wrapper panel">
            <h2>Requests per Endpoint</h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={barChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis
                  dataKey="endpoint"
                  stroke="var(--muted)"
                  tick={{ fontSize: 12 }}
                  angle={-45}
                  textAnchor="end"
                  height={100}
                />
                <YAxis stroke="var(--muted)" tick={{ fontSize: 12 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--panel)',
                    border: `1px solid var(--border)`,
                    borderRadius: '8px',
                  }}
                  labelStyle={{ color: 'var(--text)' }}
                />
                <Bar dataKey="count" fill="var(--green)" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="chart-wrapper panel">
            <h2>Requests (Last 7 Days)</h2>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={lineChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis
                  dataKey="date"
                  stroke="var(--muted)"
                  tick={{ fontSize: 12 }}
                />
                <YAxis stroke="var(--muted)" tick={{ fontSize: 12 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--panel)',
                    border: `1px solid var(--border)`,
                    borderRadius: '8px',
                  }}
                  labelStyle={{ color: 'var(--text)' }}
                />
                <Line
                  type="monotone"
                  dataKey="count"
                  stroke="var(--green)"
                  dot={{ fill: 'var(--green)', r: 4 }}
                  activeDot={{ r: 6 }}
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="chart-wrapper panel">
            <h2>Status Code Breakdown</h2>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={statusCodeData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {statusCodeData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={getStatusCodeColor(entry.name)} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--panel)',
                    border: `1px solid var(--border)`,
                    borderRadius: '8px',
                  }}
                  labelStyle={{ color: 'var(--text)' }}
                  formatter={(value) => `${value}%`}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="chart-wrapper panel">
            <h2>Request Method Distribution</h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={methodDistributionData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis
                  dataKey="method"
                  stroke="var(--muted)"
                  tick={{ fontSize: 12 }}
                />
                <YAxis stroke="var(--muted)" tick={{ fontSize: 12 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--panel)',
                    border: `1px solid var(--border)`,
                    borderRadius: '8px',
                  }}
                  labelStyle={{ color: 'var(--text)' }}
                />
                <Bar dataKey="count" fill="var(--green)" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  )
}
