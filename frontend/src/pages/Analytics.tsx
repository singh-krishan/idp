import React, { useEffect, useState } from 'react'
import { analyticsApi } from '../services/api'
import { PlatformOverview, ProjectsOverTime, TemplateUsage } from '../types/analytics'

export default function Analytics() {
  const [overview, setOverview] = useState<PlatformOverview | null>(null)
  const [timeSeries, setTimeSeries] = useState<ProjectsOverTime | null>(null)
  const [templateUsage, setTemplateUsage] = useState<TemplateUsage | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchAnalytics()
  }, [])

  const fetchAnalytics = async () => {
    try {
      setLoading(true)
      const [overviewData, timeSeriesData, templateData] = await Promise.all([
        analyticsApi.getOverview(),
        analyticsApi.getProjectsOverTime(30),
        analyticsApi.getTemplateUsage()
      ])

      setOverview(overviewData)
      setTimeSeries(timeSeriesData)
      setTemplateUsage(templateData)
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load analytics')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading analytics...</p>
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
          <h1 className="text-3xl font-bold text-gray-900">Platform Analytics</h1>
          <p className="text-gray-600 mt-2">Admin view - Platform-wide metrics and insights</p>
        </div>

        {/* Overview Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-md p-6">
            <p className="text-sm font-medium text-gray-600">Total Projects</p>
            <p className="text-3xl font-bold text-gray-900 mt-2">{overview?.total_projects}</p>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6">
            <p className="text-sm font-medium text-gray-600">Total Users</p>
            <p className="text-3xl font-bold text-gray-900 mt-2">{overview?.total_users}</p>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6">
            <p className="text-sm font-medium text-gray-600">Active Users (30d)</p>
            <p className="text-3xl font-bold text-gray-900 mt-2">{overview?.active_users_30d}</p>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6">
            <p className="text-sm font-medium text-gray-600">Success Rate</p>
            <p className="text-3xl font-bold text-green-600 mt-2">{overview?.success_rate}%</p>
          </div>
        </div>

        {/* Projects by Status */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Projects by Status</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {overview?.projects_by_status && Object.entries(overview.projects_by_status).map(([status, count]) => (
              <div key={status} className="p-4 border border-gray-200 rounded-lg">
                <p className="text-sm text-gray-600 capitalize">{status}</p>
                <p className="text-2xl font-bold text-gray-900">{count}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Template Usage Table */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Template Performance</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Template</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Projects</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Usage %</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Success Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {templateUsage?.templates.map(template => (
                  <tr key={template.template_type}>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{template.template_type}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{template.count}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{template.percentage}%</td>
                    <td className="px-6 py-4 text-sm">
                      <span className={`font-medium ${template.success_rate > 80 ? 'text-green-600' : template.success_rate > 50 ? 'text-yellow-600' : 'text-red-600'}`}>
                        {template.success_rate}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Time Series Chart */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Projects Created (Last 30 Days)</h2>
          <div className="h-64 flex items-end space-x-2">
            {timeSeries?.data_points.map((point, index) => {
              const maxCount = Math.max(...(timeSeries.data_points.map(p => p.count) || [1]))
              const heightPercent = (point.count / maxCount) * 100

              return (
                <div key={index} className="flex-1 flex flex-col items-center">
                  <div
                    className="w-full bg-gradient-to-t from-indigo-500 to-purple-600 rounded-t"
                    style={{ height: `${heightPercent}%` }}
                    title={`${point.date}: ${point.count} projects`}
                  />
                  {index % 5 === 0 && (
                    <p className="text-xs text-gray-500 mt-2 transform rotate-45">
                      {new Date(point.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </p>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Average Deployment Time */}
        {overview && (
          <div className="bg-white rounded-lg shadow-md p-6 mt-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Average Deployment Time</h2>
            <p className="text-3xl font-bold text-indigo-600">{overview.avg_deployment_time_minutes.toFixed(1)} minutes</p>
            <p className="text-sm text-gray-600 mt-2">From project creation to active status</p>
          </div>
        )}
      </div>
    </div>
  )
}
