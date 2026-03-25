from sqlalchemy.orm import Session
from sqlalchemy import func, case, and_
from datetime import datetime, timedelta
from app.models.project import Project
from app.models.user import User
from app.schemas.analytics import (
    DashboardStatsResponse,
    PlatformOverviewResponse,
    ProjectsOverTimeResponse,
    ProjectTimeSeriesPoint,
    TemplateUsageResponse,
    TemplateUsageItem
)


class AnalyticsService:
    """Service for analytics aggregations"""

    @staticmethod
    def get_user_dashboard_stats(db: Session, user_id: str) -> DashboardStatsResponse:
        """Get dashboard stats for a specific user"""

        # Count by status
        total = db.query(Project).filter(Project.user_id == user_id).count()
        active = db.query(Project).filter(
            Project.user_id == user_id,
            Project.status == "active"
        ).count()
        failed = db.query(Project).filter(
            Project.user_id == user_id,
            Project.status == "failed"
        ).count()
        building = db.query(Project).filter(
            Project.user_id == user_id,
            Project.status.in_(["pending", "creating_repo", "building", "deploying"])
        ).count()

        # Recent projects (last 5)
        recent = db.query(Project).filter(
            Project.user_id == user_id
        ).order_by(Project.created_at.desc()).limit(5).all()

        # Template usage breakdown
        template_usage_raw = db.query(
            Project.template_type,
            func.count(Project.id).label("count")
        ).filter(
            Project.user_id == user_id
        ).group_by(Project.template_type).all()

        template_usage = {row.template_type: row.count for row in template_usage_raw}

        return DashboardStatsResponse(
            total_projects=total,
            active_projects=active,
            failed_projects=failed,
            building_projects=building,
            recent_projects=recent,
            template_usage=template_usage
        )

    @staticmethod
    def get_platform_overview(db: Session) -> PlatformOverviewResponse:
        """Get platform-wide stats (admin only)"""

        # Total counts
        total_projects = db.query(Project).count()
        total_users = db.query(User).count()

        # Active users (created project in last 30 days)
        thirty_days_ago = datetime.utcnow() - timedelta(days=30)
        active_users = db.query(func.count(func.distinct(Project.user_id))).filter(
            Project.created_at >= thirty_days_ago
        ).scalar()

        # Success rate
        active_count = db.query(Project).filter(Project.status == "active").count()
        success_rate = (active_count / total_projects * 100) if total_projects > 0 else 0

        # Projects by status
        status_counts = db.query(
            Project.status,
            func.count(Project.id).label("count")
        ).group_by(Project.status).all()
        projects_by_status = {row.status: row.count for row in status_counts}

        # Projects by template
        template_counts = db.query(
            Project.template_type,
            func.count(Project.id).label("count")
        ).group_by(Project.template_type).all()
        projects_by_template = {row.template_type: row.count for row in template_counts}

        # Average deployment time (created_at to updated_at for active projects)
        # Using func.extract to get epoch seconds, works for both SQLite and PostgreSQL
        avg_time_query = db.query(
            func.avg(
                func.julianday(Project.updated_at) - func.julianday(Project.created_at)
            ) * 24 * 60  # Convert days to minutes
        ).filter(Project.status == "active")
        avg_minutes = avg_time_query.scalar() or 0

        return PlatformOverviewResponse(
            total_projects=total_projects,
            total_users=total_users,
            active_users_30d=active_users or 0,
            success_rate=round(success_rate, 2),
            projects_by_status=projects_by_status,
            projects_by_template=projects_by_template,
            avg_deployment_time_minutes=round(avg_minutes, 2)
        )

    @staticmethod
    def get_projects_over_time(db: Session, days: int = 30) -> ProjectsOverTimeResponse:
        """Get project creation time series (admin only)"""

        start_date = datetime.utcnow() - timedelta(days=days)

        # Query projects grouped by date
        # Using func.date for SQLite compatibility
        results = db.query(
            func.date(Project.created_at).label("date"),
            func.count(Project.id).label("count")
        ).filter(
            Project.created_at >= start_date
        ).group_by(func.date(Project.created_at)).order_by("date").all()

        data_points = [
            ProjectTimeSeriesPoint(date=str(row.date), count=row.count)
            for row in results
        ]

        total = db.query(Project).count()

        return ProjectsOverTimeResponse(
            data_points=data_points,
            total_projects=total
        )

    @staticmethod
    def get_template_usage(db: Session) -> TemplateUsageResponse:
        """Get detailed template usage statistics (admin only)"""

        total_projects = db.query(Project).count()

        # Template counts with success rates
        template_stats = db.query(
            Project.template_type,
            func.count(Project.id).label("total"),
            func.sum(case((Project.status == "active", 1), else_=0)).label("successful")
        ).group_by(Project.template_type).all()

        templates = []
        for row in template_stats:
            count = row.total
            successful = row.successful or 0
            percentage = (count / total_projects * 100) if total_projects > 0 else 0
            success_rate = (successful / count * 100) if count > 0 else 0

            templates.append(TemplateUsageItem(
                template_type=row.template_type,
                count=count,
                percentage=round(percentage, 2),
                success_rate=round(success_rate, 2)
            ))

        # Sort by count descending
        templates.sort(key=lambda x: x.count, reverse=True)

        return TemplateUsageResponse(
            templates=templates,
            total_projects=total_projects
        )
