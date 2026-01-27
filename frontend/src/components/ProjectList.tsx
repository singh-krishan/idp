import { useEffect, useState } from 'react';
import { Project } from '../types/project';
import { projectsApi } from '../services/api';

interface ProjectListProps {
  refreshTrigger: number;
}

export default function ProjectList({ refreshTrigger }: ProjectListProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'bg-gray-200 text-gray-800',
      creating_repo: 'bg-yellow-200 text-yellow-800',
      building: 'bg-blue-200 text-blue-800',
      deploying: 'bg-purple-200 text-purple-800',
      active: 'bg-green-200 text-green-800',
      failed: 'bg-red-200 text-red-800',
    };

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[status] || colors.pending}`}>
        {status.replace('_', ' ').toUpperCase()}
      </span>
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  if (loading && projects.length === 0) {
    return (
      <div className="bg-white shadow-md rounded-lg p-6">
        <div className="text-center text-gray-500">Loading projects...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white shadow-md rounded-lg p-6">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <div className="bg-white shadow-md rounded-lg p-6">
        <div className="text-center text-gray-500">
          <p className="text-lg mb-2">No projects yet</p>
          <p className="text-sm">Create your first project using the form above</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white shadow-md rounded-lg p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Your Projects</h2>
        <button
          onClick={loadProjects}
          disabled={loading}
          className={`px-4 py-2 text-sm rounded-md transition-colors ${
            loading
              ? 'bg-gray-300 cursor-not-allowed text-gray-500'
              : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
          }`}
        >
          {loading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      <div className="space-y-4 relative">
        {loading && (
          <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-10 rounded-lg">
            <div className="text-gray-600 flex items-center">
              <svg className="animate-spin h-5 w-5 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Refreshing...
            </div>
          </div>
        )}
        {projects.map((project) => (
          <div
            key={project.id}
            className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
          >
            <div className="flex justify-between items-start mb-2">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">{project.name}</h3>
                {project.description && (
                  <p className="text-sm text-gray-600 mt-1">{project.description}</p>
                )}
              </div>
              {getStatusBadge(project.status)}
            </div>

            <div className="grid grid-cols-2 gap-4 mt-3 text-sm">
              <div>
                <span className="font-medium text-gray-700">Template:</span>{' '}
                <span className="text-gray-600">{project.template_type}</span>
              </div>
              <div>
                <span className="font-medium text-gray-700">Created:</span>{' '}
                <span className="text-gray-600">{formatDate(project.created_at)}</span>
              </div>
            </div>

            {project.github_repo_url && (
              <div className="mt-3">
                <a
                  href={project.github_repo_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center text-sm text-blue-600 hover:text-blue-800"
                >
                  <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 0C4.477 0 0 4.484 0 10.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0110 4.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.203 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.942.359.31.678.921.678 1.856 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0020 10.017C20 4.484 15.522 0 10 0z" clipRule="evenodd" />
                  </svg>
                  View on GitHub
                </a>
              </div>
            )}

            {project.error_message && (
              <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                <span className="font-medium">Error:</span> {project.error_message}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
