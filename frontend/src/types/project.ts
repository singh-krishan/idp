export interface Project {
  id: string;
  name: string;
  description: string | null;
  template_type: string;
  github_repo_url: string | null;
  github_repo_name: string | null;
  argocd_app_name: string | null;
  status: 'pending' | 'creating_repo' | 'building' | 'deploying' | 'active' | 'failed';
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateProjectRequest {
  name: string;
  description?: string;
  template_type: string;
  variables?: Record<string, any>;
}

export interface Template {
  name: string;
  display_name: string;
  description: string;
  variables: TemplateVariable[];
  requires_openapi_upload: boolean;
}

export interface TemplateVariable {
  name: string;
  default: string;
  type: string;
  description: string;
}

export interface ProjectListResponse {
  total: number;
  projects: Project[];
}
