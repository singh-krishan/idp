import { useEffect, useState } from 'react';
import { Project } from '../types/project';
import { projectsApi } from '../services/api';

interface ProjectListProps {
  refreshTrigger: number;
}

const statusConfig: Record<string, { bg: string; text: string; border: string; label: string }> = {
  pending: { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/20', label: 'PENDING' },
  creating_repo: { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/20', label: 'CREATING' },
  building: { bg: 'bg-purple-500/10', text: 'text-purple-400', border: 'border-purple-500/20', label: 'BUILDING' },
  deploying: { bg: 'bg-cyan-500/10', text: 'text-cyan-400', border: 'border-cyan-500/20', label: 'DEPLOYING' },
  active: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20', label: 'ACTIVE' },
  failed: { bg: 'bg-rose-500/10', text: 'text-rose-400', border: 'border-rose-500/20', label: 'FAILED' },
};

export default function ProjectList({ refreshTrigger }: ProjectListProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    loadProjects();
  }, [refreshTrigger]);

  const loadProjects = async () => {
    try {
      setLoading(true);
      const data = await projectsApi.listProjects();
      setProjects(data.projects);
      setError(null);
    } catch (err: any) {
      setError('Failed to load projects: ' + (err.response?.data?.detail || err.message));
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (project: Project) => {
    const confirmMessage = `Delete "${project.name}"?\n\nThis removes the GitHub repo, ArgoCD app, and k8s resources. This cannot be undone.`;
    if (!window.confirm(confirmMessage)) return;

    try {
      setDeletingId(project.id);
      await projectsApi.deleteProject(project.id);
      setProjects(projects.filter(p => p.id !== project.id));
      setError(null);
    } catch (err: any) {
      setError('Failed to delete: ' + (err.response?.data?.detail || err.message));
    } finally {
      setDeletingId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    const config = statusConfig[status] || statusConfig.pending;
    return (
      <span className={`badge ${config.bg} ${config.text} border ${config.border}`}>
        {config.label}
      </span>
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-GB', {
      day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  };

  if (loading && projects.length === 0) {
    return (
      <div className="glass-card p-8 text-center">
        <div className="relative w-8 h-8 mx-auto">
          <div className="absolute inset-0 rounded-full border-2 border-accent-500/20"></div>
          <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-accent-500 animate-spin"></div>
        </div>
        <p className="mt-3 text-gray-500 text-sm">Loading projects...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="glass-card p-6">
        <div className="px-4 py-3 rounded-lg bg-rose-500/10 border border-rose-500/20">
          <p className="text-rose-400 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <div className="glass-card p-10 text-center">
        <div className="w-12 h-12 rounded-xl bg-white/[0.04] flex items-center justify-center mx-auto mb-3">
          <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
          </svg>
        </div>
        <p className="text-gray-400 text-sm font-medium">No projects yet</p>
        <p className="text-gray-600 text-xs mt-1">Create your first project using the form</p>
      </div>
    );
  }

  return (
    <div className="glass-card p-6">
      <div className="flex justify-between items-center mb-5">
        <h2 className="font-display text-xl font-bold text-white">Your Projects</h2>
        <button
          onClick={loadProjects}
          disabled={loading}
          className="btn-ghost text-xs"
        >
          {loading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      <div className="space-y-3 relative">
        {loading && (
          <div className="absolute inset-0 bg-surface-950/60 backdrop-blur-sm flex items-center justify-center z-10 rounded-lg">
            <div className="relative w-6 h-6">
              <div className="absolute inset-0 rounded-full border-2 border-accent-500/20"></div>
              <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-accent-500 animate-spin"></div>
            </div>
          </div>
        )}

        {projects.map((project) => (
          <div
            key={project.id}
            className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:bg-white/[0.04] hover:border-white/[0.1] transition-all duration-200"
          >
            <div className="flex justify-between items-start mb-2">
              <div className="flex-1 min-w-0">
                <h3 className="font-display font-semibold text-white text-sm truncate">{project.name}</h3>
                {project.description && (
                  <p className="text-xs text-gray-500 mt-0.5 truncate">{project.description}</p>
                )}
              </div>
              <div className="flex items-center gap-2 ml-3 flex-shrink-0">
                {getStatusBadge(project.status)}
                <button
                  onClick={() => handleDelete(project)}
                  disabled={deletingId === project.id}
                  className="btn-danger"
                  aria-label={`Delete ${project.name}`}
                >
                  {deletingId === project.id ? '...' : 'Delete'}
                </button>
              </div>
            </div>

            <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
              <span className="font-mono">{project.template_type}</span>
              <span>{formatDate(project.created_at)}</span>
            </div>

            {project.github_repo_url && (
              <a
                href={project.github_repo_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 mt-2.5 text-xs text-accent-400 hover:text-accent-300 transition-colors no-underline"
              >
                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 0C4.477 0 0 4.484 0 10.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0110 4.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.203 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.942.359.31.678.921.678 1.856 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0020 10.017C20 4.484 15.522 0 10 0z" clipRule="evenodd" />
                </svg>
                GitHub
              </a>
            )}

            {project.error_message && (
              <div className="mt-3 px-3 py-2 rounded-lg bg-rose-500/10 border border-rose-500/20">
                <p className="text-xs text-rose-400">
                  <span className="font-semibold">Error:</span> {project.error_message}
                </p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
