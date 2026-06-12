from typing import Sequence

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.event_bus import Topics, event_bus
from app.core.utils import update_entity_attrs
from app.middleware.audit import AuditLogger
from app.models.project import Project, ProjectTask, TechnicalIssue
from app.repositories.project_repo import ProjectRepository, ProjectTaskRepository, TechnicalIssueRepository


class ProjectService:
    VALID_TRANSITIONS = {
        "pending_approval": ["approved", "closed"],  # approved via feishu, closed if cancelled
        "approved": ["in_progress", "closed"],
        "in_progress": ["completed", "closed"],
        "completed": ["closed"],
        "closed": [],  # terminal state
    }

    def __init__(self, db: AsyncSession):
        self.db = db
        self.project_repo = ProjectRepository(db)
        self.task_repo = ProjectTaskRepository(db)
        self.issue_repo = TechnicalIssueRepository(db)

    async def create_project(self, data: dict, created_by: str) -> Project:
        project = Project(
            product_id=data["product_id"],
            name=data["name"],
            type=data.get("type", "new_product"),
            feasibility_doc_url=data.get("feasibility_doc_url"),
            created_by=created_by,
            status="pending_approval",
        )
        project = await self.project_repo.create(project)
        await AuditLogger.log(self.db, user_id=created_by, action="project.create", resource_type="project", resource_id=str(project.id), new_value={"name": project.name})
        return project

    async def get_projects(
        self, *, skip: int = 0, limit: int = 20, product_id: str | None = None, status: str | None = None
    ) -> tuple[Sequence[Project], int]:
        return await self.project_repo.get_all(skip=skip, limit=limit, product_id=product_id, status=status)

    async def get_project(self, project_id: str) -> Project | None:
        return await self.project_repo.get_by_id(project_id)

    async def update_project(self, project_id: str, data: dict, updated_by: str | None = None) -> Project:
        project = await self.project_repo.get_by_id(project_id)
        if not project:
            raise ValueError("Project not found")
        old_values = {"name": project.name, "status": project.status}
        # Validate status transition
        new_status = data.get("status")
        if new_status and new_status != project.status:
            valid_next = self.VALID_TRANSITIONS.get(project.status, [])
            if new_status not in valid_next:
                raise ValueError(
                    f"Invalid project transition: {project.status} -> {new_status}. "
                    f"Allowed: {valid_next}"
                )
        update_entity_attrs(project, data)
        project = await self.project_repo.update(project)
        await AuditLogger.log(self.db, user_id=updated_by, action="project.update", resource_type="project", resource_id=str(project.id), old_value=old_values, new_value={"name": project.name, "status": project.status})
        return project

    # ---- Tasks ----

    async def create_task(self, project_id: str, data: dict, created_by: str | None = None) -> ProjectTask:
        task = ProjectTask(
            project_id=project_id,
            name=data["name"],
            parent_task_id=data.get("parent_task_id"),
            responsible_role=data.get("responsible_role"),
            assignee_feishu_id=data.get("assignee_feishu_id"),
            supplier_id=data.get("supplier_id"),
            planned_start=data.get("planned_start"),
            planned_end=data.get("planned_end"),
            deliverables=data.get("deliverables", []),
            sort_order=data.get("sort_order", 0),
        )
        task = await self.task_repo.create(task)
        await AuditLogger.log(self.db, user_id=created_by, action="task.create", resource_type="project_task", resource_id=str(task.id), new_value={"name": task.name, "project_id": str(task.project_id)})
        if task.assignee_feishu_id:
            await event_bus.publish(Topics.TASK_ASSIGNED, {"task_id": str(task.id), "task_name": task.name, "assignee_feishu_id": task.assignee_feishu_id})
        return task

    async def get_tasks(self, project_id: str) -> Sequence[ProjectTask]:
        return await self.task_repo.get_by_project(project_id)

    async def get_task_tree(self, project_id: str) -> list[dict]:
        """Build WBS task tree from flat list."""
        tasks = await self.task_repo.get_by_project(project_id)
        # Build dict entries indexed by task id string
        task_dicts: dict[str, dict] = {}
        for t in tasks:
            task_dicts[str(t.id)] = {
                "id": str(t.id),
                "project_id": str(t.project_id),
                "parent_task_id": str(t.parent_task_id) if t.parent_task_id else None,
                "name": t.name,
                "responsible_role": t.responsible_role,
                "assignee_feishu_id": t.assignee_feishu_id,
                "supplier_id": str(t.supplier_id) if t.supplier_id else None,
                "planned_start": t.planned_start.isoformat() if t.planned_start else None,
                "planned_end": t.planned_end.isoformat() if t.planned_end else None,
                "actual_end": t.actual_end.isoformat() if t.actual_end else None,
                "deliverables": t.deliverables,
                "status": t.status,
                "sort_order": t.sort_order,
                "children": [],
            }

        roots: list[dict] = []
        for t in tasks:
            entry = task_dicts[str(t.id)]
            parent_id = str(t.parent_task_id) if t.parent_task_id else None
            if parent_id and parent_id in task_dicts:
                task_dicts[parent_id]["children"].append(entry)
            else:
                roots.append(entry)

        return roots

    async def update_task(self, task_id: str, data: dict, updated_by: str | None = None) -> ProjectTask:
        task = await self.task_repo.get_by_id(task_id)
        if not task:
            raise ValueError("Task not found")
        old_values = {"name": task.name, "status": task.status}
        update_entity_attrs(task, data)
        task = await self.task_repo.update(task)
        await AuditLogger.log(self.db, user_id=updated_by, action="task.update", resource_type="project_task", resource_id=str(task.id), old_value=old_values, new_value={"name": task.name, "status": task.status})
        return task

    # ---- Technical Issues ----

    async def create_issue(self, project_id: str, data: dict, created_by: str | None = None) -> TechnicalIssue:
        issue = TechnicalIssue(
            project_id=project_id,
            title=data["title"],
            description=data.get("description"),
            severity=data.get("severity", "minor"),
            assigned_to=data.get("assigned_to"),
        )
        issue = await self.issue_repo.create(issue)
        await AuditLogger.log(self.db, user_id=created_by, action="issue.create", resource_type="technical_issue", resource_id=str(issue.id), new_value={"title": issue.title, "severity": issue.severity})
        return issue

    async def get_issues(self, project_id: str) -> Sequence[TechnicalIssue]:
        return await self.issue_repo.get_by_project(project_id)

    async def update_issue(self, issue_id: str, data: dict, updated_by: str | None = None) -> TechnicalIssue:
        issue = await self.issue_repo.get_by_id(issue_id)
        if not issue:
            raise ValueError("Issue not found")
        old_values = {"title": issue.title, "status": issue.status, "severity": issue.severity}
        update_entity_attrs(issue, data)
        issue = await self.issue_repo.update(issue)
        await AuditLogger.log(self.db, user_id=updated_by, action="issue.update", resource_type="technical_issue", resource_id=str(issue.id), old_value=old_values, new_value={"title": issue.title, "status": issue.status, "severity": issue.severity})
        return issue
