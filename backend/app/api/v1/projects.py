from fastapi import APIRouter, HTTPException, Query, status

from app.core.deps import CurrentUserDep, DBSessionDep
from app.schemas.project import (
    ProjectCreate,
    ProjectResponse,
    ProjectTaskCreate,
    ProjectTaskResponse,
    ProjectTaskUpdate,
    ProjectUpdate,
    TechnicalIssueCreate,
    TechnicalIssueResponse,
    TechnicalIssueUpdate,
)
from app.services.project_service import ProjectService

router = APIRouter(prefix="/projects", tags=["projects"])


# ---- Projects ----

@router.get("")
async def list_projects(
    db: DBSessionDep,
    current_user: CurrentUserDep,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    product_id: str | None = None,
    status: str | None = None,
):
    service = ProjectService(db)
    skip = (page - 1) * page_size
    projects, total = await service.get_projects(
        skip=skip, limit=page_size, product_id=product_id, status=status
    )
    total_pages = (total + page_size - 1) // page_size if total > 0 else 0
    return {
        "success": True,
        "data": [ProjectResponse.model_validate(p) for p in projects],
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": total_pages,
    }


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_project(
    body: ProjectCreate,
    db: DBSessionDep,
    current_user: CurrentUserDep,
):
    service = ProjectService(db)
    project = await service.create_project(body.model_dump(), str(current_user.id))
    return {"success": True, "data": ProjectResponse.model_validate(project)}


@router.get("/{project_id}")
async def get_project(project_id: str, db: DBSessionDep, current_user: CurrentUserDep):
    service = ProjectService(db)
    project = await service.get_project(project_id)
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
    return {"success": True, "data": ProjectResponse.model_validate(project)}


@router.patch("/{project_id}")
async def update_project(project_id: str, body: ProjectUpdate, db: DBSessionDep, current_user: CurrentUserDep):
    service = ProjectService(db)
    try:
        project = await service.update_project(project_id, body.model_dump(exclude_none=True), str(current_user.id))
        return {"success": True, "data": ProjectResponse.model_validate(project)}
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.post("/{project_id}/submit-approval")
async def submit_approval(project_id: str, db: DBSessionDep, current_user: CurrentUserDep):
    """Submit project for Feishu approval. This creates an approval instance in Feishu."""
    service = ProjectService(db)
    project = await service.get_project(project_id)
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")

    from app.integrations.feishu.approval import FeishuApprovalClient

    feishu = FeishuApprovalClient()
    try:
        result = await feishu.create_approval(project)
        await service.update_project(project_id, {"approval_id": result.get("instance_id"), "status": "pending_approval"})
        return {"success": True, "data": {"approval_id": result.get("instance_id")}}
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


# ---- Tasks ----

@router.get("/{project_id}/tasks")
async def get_tasks(project_id: str, db: DBSessionDep, current_user: CurrentUserDep):
    service = ProjectService(db)
    tree = await service.get_task_tree(project_id)
    return {"success": True, "data": tree}


@router.post("/{project_id}/tasks", status_code=status.HTTP_201_CREATED)
async def create_task(project_id: str, body: ProjectTaskCreate, db: DBSessionDep, current_user: CurrentUserDep):
    service = ProjectService(db)
    task = await service.create_task(project_id, body.model_dump(), str(current_user.id))
    return {"success": True, "data": ProjectTaskResponse.model_validate(task)}


@router.patch("/{project_id}/tasks/{task_id}")
async def update_task(
    project_id: str, task_id: str, body: ProjectTaskUpdate, db: DBSessionDep, current_user: CurrentUserDep
):
    service = ProjectService(db)
    try:
        task = await service.update_task(task_id, body.model_dump(exclude_none=True), str(current_user.id))
        return {"success": True, "data": ProjectTaskResponse.model_validate(task)}
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


# ---- Technical Issues ----

@router.get("/{project_id}/issues")
async def get_issues(project_id: str, db: DBSessionDep, current_user: CurrentUserDep):
    service = ProjectService(db)
    issues = await service.get_issues(project_id)
    return {"success": True, "data": [TechnicalIssueResponse.model_validate(i) for i in issues]}


@router.post("/{project_id}/issues", status_code=status.HTTP_201_CREATED)
async def create_issue(project_id: str, body: TechnicalIssueCreate, db: DBSessionDep, current_user: CurrentUserDep):
    service = ProjectService(db)
    issue = await service.create_issue(project_id, body.model_dump(), str(current_user.id))
    return {"success": True, "data": TechnicalIssueResponse.model_validate(issue)}


@router.patch("/{project_id}/issues/{issue_id}")
async def update_issue(
    project_id: str, issue_id: str, body: TechnicalIssueUpdate, db: DBSessionDep, current_user: CurrentUserDep
):
    service = ProjectService(db)
    try:
        issue = await service.update_issue(issue_id, body.model_dump(exclude_none=True), str(current_user.id))
        return {"success": True, "data": TechnicalIssueResponse.model_validate(issue)}
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
