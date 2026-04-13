import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { analyticsApi } from '../services/api'
import { DashboardStats } from '../types/analytics'
import StatsCard from '../components/StatsCard'
import { Project } from '../types/project'

const statusConfig: Record<string, { bg: string; text: string; border: string }> = {
  pending: { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/20' },
  creating_repo: { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/20' },
  building: { bg: 'bg-purple-500/10', text: 'text-purple-400', border: 'border-purple-500/20' },
  deploying: { bg: 'bg-cyan-500/10', text: 'text-cyan-400', border: 'border-cyan-500/20' },
  active: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20' },
  failed: { bg: 'bg-rose-500/10', text: 'text-rose-400', border: 'border-rose-500/20' },
}

export default function Dashboard() {
  const navigate = useNavigate()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchDashboard()
  }, [])

  const fetchDashboard = async () => {
    try {
      setLoading(true)
      const data = await analyticsApi.getDashboard()
      setStats(data)
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load dashboard')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
        <div className="relative w-10 h-10 mx-auto">
          <div className="absolute inset-0 rounded-full border-2 border-accent-500/20"></div>
          <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-accent-500 animate-spin"></div>
        </div>
        <p className="mt-4 text-gray-500 text-sm">Loading dashboard...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="px-4 py-3 rounded-xl bg-rose-500/10 border border-rose-500/20">
          <p className="text-rose-400 text-sm">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Header */}
      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold text-white">Dashboard</h1>
        <p className="text-gray-500 mt-1 text-sm">Overview of your projects and activity</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatsCard
          title="Total"
          value={stats?.total_projects || 0}
          icon={<span className="text-lg">📊</span>}
          bgGradient="from-accent-500 to-accent-700"
        />
        <StatsCard
          title="Active"
          value={stats?.active_projects || 0}
          icon={<span className="text-lg">✅</span>}
          bgGradient="from-emerald-500 to-emerald-700"
        />
        <StatsCard
          title="Building"
          value={stats?.building_projects || 0}
          icon={<span className="text-lg">🔨</span>}
          bgGradient="from-amber-500 to-amber-700"
        />
        <StatsCard
          title="Failed"
          value={stats?.failed_projects || 0}
          icon={<span className="text-lg">❌</span>}
          bgGradient="from-rose-500 to-rose-700"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Template Usage */}
        {stats?.template_usage && Object.keys(stats.template_usage).length > 0 && (
          <div className="glass-card p-6">
            <h2 className="font-display text-lg font-semibold text-white mb-5">Template Usage</h2>
            <div className="space-y-4">
              {Object.entries(stats.template_usage).map(([template, count]) => {
                const percentage = stats.total_projects > 0
                  ? (count / stats.total_projects * 100)
                  : 0

                return (
                  <div key={template}>
                    <div className="flex justify-between text-sm mb-1.5">
                      <span className="text-gray-300 font-medium text-xs">{template}</span>
                      <span className="text-gray-500 text-xs font-mono">{count} ({percentage.toFixed(0)}%)</span>
                    </div>
                    <div className="w-full bg-white/[0.04] rounded-full h-1.5 overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-accent-500 to-cyber-cyan h-1.5 rounded-full transition-all duration-700"
                        style={{ width: `${Math.max(percentage, 2)}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Recent Projects */}
        <div className="glass-card p-6">
          <h2 className="font-display text-lg font-semibold text-white mb-5">Recent Projects</h2>
          {stats?.recent_projects && stats.recent_projects.length > 0 ? (
            <div className="space-y-2">
              {stats.recent_projects.map((project: Project) => {
                const config = statusConfig[project.status] || statusConfig.pending
                return (
                  <div
                    key={project.id}
                    className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:bg-white/[0.04] hover:border-white/[0.1] transition-all duration-200 cursor-pointer"
                    onClick={() => navigate(`/projects/${project.id}`)}
                  >
                    <div className="flex-1 min-w-0">
                      <h3 className="font-display font-semibold text-white text-sm truncate">{project.name}</h3>
                      <p className="text-xs text-gray-500 font-mono">{project.template_type}</p>
                    </div>
                    <div className="flex items-center gap-3 ml-3">
                      <span className={`badge ${config.bg} ${config.text} border ${config.border}`}>
                        {project.status}
                      </span>
                      <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                      </svg>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <p className="text-gray-500 text-sm text-center py-6">No projects yet.</p>
          )}
        </div>
      </div>
    </div>
  )
}
