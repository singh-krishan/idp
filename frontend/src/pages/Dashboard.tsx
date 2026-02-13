import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { analyticsApi } from '../services/api'
import { DashboardStats } from '../types/analytics'
import StatsCard from '../components/StatsCard'
import { Project } from '../types/project'

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
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800">{error}</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-2">Overview of your projects and activity</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatsCard
            title="Total Projects"
            value={stats?.total_projects || 0}
            icon={<span className="text-2xl">📊</span>}
            bgGradient="from-blue-500 to-cyan-600"
          />
          <StatsCard
            title="Active Projects"
            value={stats?.active_projects || 0}
            icon={<span className="text-2xl">✅</span>}
            bgGradient="from-green-500 to-emerald-600"
          />
          <StatsCard
            title="Building"
            value={stats?.building_projects || 0}
            icon={<span className="text-2xl">🔨</span>}
            bgGradient="from-yellow-500 to-orange-600"
          />
          <StatsCard
            title="Failed"
            value={stats?.failed_projects || 0}
            icon={<span className="text-2xl">❌</span>}
            bgGradient="from-red-500 to-pink-600"
          />
        </div>

        {/* Template Usage Chart */}
        {stats?.template_usage && Object.keys(stats.template_usage).length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Template Usage</h2>
            <div className="space-y-3">
              {Object.entries(stats.template_usage).map(([template, count]) => {
                const percentage = stats.total_projects > 0
                  ? (count / stats.total_projects * 100).toFixed(1)
                  : 0

                return (
                  <div key={template}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-medium text-gray-700">{template}</span>
                      <span className="text-gray-600">{count} projects ({percentage}%)</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-gradient-to-r from-indigo-500 to-purple-600 h-2 rounded-full"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Recent Projects */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Recent Projects</h2>
          {stats?.recent_projects && stats.recent_projects.length > 0 ? (
            <div className="space-y-3">
              {stats.recent_projects.map((project: Project) => (
                <div
                  key={project.id}
                  className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
                  onClick={() => navigate(`/projects/${project.id}`)}
                >
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">{project.name}</h3>
                    <p className="text-sm text-gray-600">{project.template_type}</p>
                  </div>
                  <div className="flex items-center space-x-3">
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(project.status)}`}>
                      {project.status}
                    </span>
                    <span className="text-indigo-600 hover:text-indigo-800 text-sm font-medium">
                      View →
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">No projects yet. Create your first project!</p>
          )}
        </div>
      </div>
    </div>
  )
}

function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    pending: 'bg-gray-100 text-gray-800',
    creating_repo: 'bg-yellow-100 text-yellow-800',
    building: 'bg-blue-100 text-blue-800',
    deploying: 'bg-purple-100 text-purple-800',
    active: 'bg-green-100 text-green-800',
    failed: 'bg-red-100 text-red-800',
  }
  return colors[status] || 'bg-gray-100 text-gray-800'
}
