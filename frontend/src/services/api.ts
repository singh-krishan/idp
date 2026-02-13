import axios from 'axios';
import { Project, CreateProjectRequest, Template, ProjectListResponse } from '../types/project';
import { DashboardStats, PlatformOverview, ProjectsOverTime, TemplateUsage } from '../types/analytics';

const API_BASE_URL = import.meta.env.VITE_API_URL || '';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor to include auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor to handle 401 errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Clear tokens and reload (will trigger login screen)
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      window.location.reload();
    }
    return Promise.reject(error);
  }
);

export const projectsApi = {
  async createProject(data: CreateProjectRequest): Promise<Project> {
    const response = await api.post<Project>('/api/v1/projects', data);
    return response.data;
  },

  async createProjectFromOpenAPI(data: {
    name: string;
    description?: string;
    port?: string;
    openapi_file: File;
  }): Promise<Project> {
    const formData = new FormData();
    formData.append('name', data.name);
    formData.append('description', data.description || '');
    formData.append('port', data.port || '8000');
    formData.append('openapi_file', data.openapi_file);

    const response = await api.post<Project>('/api/v1/projects/from-openapi', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  async listProjects(params?: {
    search?: string;
    status?: string;
    template_type?: string;
    sort_by?: string;
    sort_order?: string;
    page?: number;
    page_size?: number;
  }): Promise<ProjectListResponse> {
    const response = await api.get<ProjectListResponse>('/api/v1/projects', { params });
    return response.data;
  },

  async getProject(id: string): Promise<Project> {
    const response = await api.get<Project>(`/api/v1/projects/${id}`);
    return response.data;
  },

  async deleteProject(id: string): Promise<void> {
    await api.delete(`/api/v1/projects/${id}`);
  },
};

export const templatesApi = {
  async listTemplates(): Promise<Template[]> {
    const response = await api.get<Template[]>('/api/v1/templates');
    return response.data;
  },

  async getTemplate(name: string): Promise<Template> {
    const response = await api.get<Template>(`/api/v1/templates/${name}`);
    return response.data;
  },
};

export const analyticsApi = {
  async getDashboard(): Promise<DashboardStats> {
    const response = await api.get<DashboardStats>('/api/v1/analytics/dashboard');
    return response.data;
  },

  async getOverview(): Promise<PlatformOverview> {
    const response = await api.get<PlatformOverview>('/api/v1/analytics/overview');
    return response.data;
  },

  async getProjectsOverTime(days: number = 30): Promise<ProjectsOverTime> {
    const response = await api.get<ProjectsOverTime>(`/api/v1/analytics/projects-over-time?days=${days}`);
    return response.data;
  },

  async getTemplateUsage(): Promise<TemplateUsage> {
    const response = await api.get<TemplateUsage>('/api/v1/analytics/template-usage');
    return response.data;
  },
};

export default api;
