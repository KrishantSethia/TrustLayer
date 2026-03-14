from fastapi import APIRouter, Depends
from auth.dependencies import require_any, require_freelancer, require_employer
from users import service

router = APIRouter()


@router.get("/users/{user_id}/pfi")
def get_pfi(user_id: str, current_user: dict = Depends(require_any)):
    return service.get_pfi(user_id, current_user["id"])


@router.get("/users/{user_id}/wallet")
def get_wallet(user_id: str, current_user: dict = Depends(require_any)):
    return service.get_wallet(user_id, current_user["id"])


@router.get("/freelancer/dashboard")
def freelancer_dashboard(freelancer: dict = Depends(require_freelancer)):
    return service.get_freelancer_dashboard(freelancer["id"])


@router.get("/employer/dashboard")
def employer_dashboard(employer: dict = Depends(require_employer)):
    return service.get_employer_dashboard(employer["id"])


@router.get("/freelancer/my-projects")
def my_projects(freelancer: dict = Depends(require_freelancer)):
    return service.get_freelancer_projects(freelancer["id"])


@router.get("/employer/projects")
def employer_projects(employer: dict = Depends(require_employer)):
    return service.get_employer_projects_list(employer["id"])
