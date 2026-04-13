import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { projectsApi } from '../services/api'
import { Project } from '../types/project'

const statusConfig: Record<string, { bg: string; text: string; border: string }> = {
  pending: { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/20' },
  creating_repo: { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/20' },
  building: { bg: 'bg-purple-500/10', text: 'text-purple-400', border: 'border-purple-500/20' },
  deploying: { bg: 'bg-cyan-500/10', text: 'text-cyan-400', border: 'border-cyan-500/20' },
  active: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20' },
  failed: { bg: 'bg-rose-500/10', text: 'text-rose-400', border: 'border-rose-500/20' },
}

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [project, setProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (id) fetchProject(id)
  }, [id])

  const fetchProject = async (projectId: string) => {
    try {
      setLoading(true)
      const data = await projectsApi.getProject(projectId)
      setProject(data)
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load project')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!project || !confirm(`Delete "${project.name}"? This cannot be undone.`)) return
    try {
      await projectsApi.deleteProject(project.id)
      navigate('/dashboard')
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to delete project')
    }
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center">
        <div className="relative w-10 h-10 mx-auto">
          <div className="absolute inset-0 rounded-full border-2 border-accent-500/20"></div>
          <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-accent-500 animate-spin"></div>
        </div>
      </div>
    )
  }

  if (error || !project) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="px-4 py-3 rounded-xl bg-rose-500/10 border border-rose-500/20">
          <p className="text-rose-400 text-sm">{error || 'Project not found'}</p>
        </div>
      </div>
    )
  }

  const config = statusConfig[project.status] || statusConfig.pending

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Back */}
      <button
        onClick={() => navigate('/dashboard')}
        className="text-accent-400 hover:text-accent-300 text-sm font-medium mb-6 flex items-center gap-1 transition-colors"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
        </svg>
        Back to Dashboard
      </button>

      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="font-display text-3xl font-bold text-white">{project.name}</h1>
          {project.description && (
            <p className="text-gray-400 mt-1">{project.description}</p>
          )}
        </div>
        <span className={`badge ${config.bg} ${config.text} border ${config.border}`}>
          {project.status}
        </span>
      </div>

      {/* Info */}
      <div className="glass-card p-6 mb-6">
        <h2 className="font-display text-lg font-semibold text-white mb-4">Project Information</h2>
        <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            { label: 'Template', value: project.template_type },
            { label: 'Created', value: new Date(project.created_at).toLocaleString() },
            { label: 'Updated', value: new Date(project.updated_at).toLocaleString() },
            { label: 'ID', value: project.id, mono: true },
          ].map(({ label, value, mono }) => (
            <div key={label}>
              <dt className="text-xs font-medium text-gray-500 uppercase tracking-wider">{label}</dt>
              <dd className={`text-sm text-gray-300 mt-1 ${mono ? 'font-mono text-xs' : ''}`}>{value}</dd>
            </div>
          ))}
        </dl>
      </div>

      {/* Links */}
      <div className="glass-card p-6 mb-6">
        <h2 className="font-display text-lg font-semibold text-white mb-4">Quick Links</h2>
        <div className="space-y-2">
          {project.github_repo_url && (
            <a
              href={project.github_repo_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:bg-white/[0.04] hover:border-white/[0.1] transition-all no-underline"
            >
              <span className="font-medium text-white text-sm">GitHub Repository</span>
              <span className="text-accent-400 text-sm">Open →</span>
            </a>
          )}
          {project.argocd_app_name && (
            <a
              href={`http://localhost:8080/applications/${project.argocd_app_name}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:bg-white/[0.04] hover:border-white/[0.1] transition-all no-underline"
            >
              <span className="font-medium text-white text-sm">ArgoCD Application</span>
              <span className="text-accent-400 text-sm">Open →</span>
            </a>
          )}
        </div>
      </div>

      {/* Error */}
      {project.error_message && (
        <div className="mb-6 px-4 py-3 rounded-xl bg-rose-500/10 border border-rose-500/20">
          <h3 className="text-sm font-semibold text-rose-400 mb-1">Error Details</h3>
          <p className="text-sm text-rose-300">{project.error_message}</p>
        </div>
      )}

      {/* Delete */}
      <button onClick={handleDelete} className="btn-danger px-4 py-2 text-sm">
        Delete Project
      </button>
    </div>
  )
}
