import { Project } from './project'

export interface DashboardStats {
  total_projects: number
  active_projects: number
  failed_projects: number
  building_projects: number
  recent_projects: Project[]
  template_usage: Record<string, number>
}

export interface PlatformOverview {
  total_projects: number
  total_users: number
  active_users_30d: number
  success_rate: number
  projects_by_status: Record<string, number>
  projects_by_template: Record<string, number>
  avg_deployment_time_minutes: number
}

export interface ProjectTimeSeriesPoint {
  date: string
  count: number
}

export interface ProjectsOverTime {
  data_points: ProjectTimeSeriesPoint[]
  total_projects: number
}

export interface TemplateUsageItem {
  template_type: string
  count: number
  percentage: number
  success_rate: number
}

export interface TemplateUsage {
  templates: TemplateUsageItem[]
  total_projects: number
}

export interface ProjectListResponse {
  total: number
  page: number
  page_size: number
  total_pages: number
  projects: Project[]
}
