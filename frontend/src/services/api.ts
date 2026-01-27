import axios from 'axios';
import { Project, CreateProjectRequest, Template, ProjectListResponse } from '../types/project';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const projectsApi = {
  async createProject(data: CreateProjectRequest): Promise<Project> {
    const response = await api.post<Project>('/api/v1/projects', data);
    return response.data;
  },

  async listProjects(): Promise<ProjectListResponse> {
    const response = await api.get<ProjectListResponse>('/api/v1/projects');
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

export default api;
