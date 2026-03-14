from datetime import datetime, timedelta
from database import get_db
from config import settings
from exceptions import NotFoundError, ForbiddenError, BadRequestError, ConflictError
from ai.handlers.registry import get_handler
from ai.llm_client import chat_completion_json, LLMError, LLMParseError
from payments.banking import deposit_to_escrow, transfer_money
from payments import razorpay_client


async def decompose_project(raw_requirement: str, category: str, total_duration_days: int = 14, source_text: str = None) -> dict:
    if not raw_requirement or not raw_requirement.strip():
        raise BadRequestError("raw_requirement cannot be empty")

    try:
        handler = get_handler(category)
    except ValueError as e:
        raise BadRequestError(str(e))

    system_prompt = handler.get_decomposer_prompt(total_duration_days)
    user_message = f"Project requirement:\n\n{raw_requirement}"
    if source_text and category == "TRANSLATION":
        word_count = len(source_text.split())
        user_message += f"\n\n--- SOURCE TEXT ({word_count} words) ---\n\n{source_text}"

    try:
        result = await chat_completion_json(system_prompt, user_message)
    except LLMError as e:
        raise BadRequestError(f"AI service error: {str(e)}")
    except LLMParseError as e:
        from fastapi import HTTPException
        raise HTTPException(status_code=502, detail=f"AI returned invalid response: {str(e)}")

    # Validate response shape
    if not result.get("project_title") or not result.get("milestones"):
        from fastapi import HTTPException
        raise HTTPException(status_code=502, detail="AI response missing required fields")

    milestones = result["milestones"]
    if not (3 <= len(milestones) <= 5):
        from fastapi import HTTPException
        raise HTTPException(status_code=502, detail=f"AI returned {len(milestones)} milestones (expected 3-5)")

    total_weight = sum(m.get("weight_percentage", 0) for m in milestones)
    if abs(total_weight - 100) > 1:
        from fastapi import HTTPException
        raise HTTPException(status_code=502, detail=f"Milestone weights sum to {total_weight} (expected 100)")

    return result


def create_project(employer_id: str, body: dict) -> dict:
    db = get_db()
    ai_output = body["ai_output"]
    total_budget = int(body["total_budget"])
    category = body.get("category", "WRITING")

    if total_budget < 10000:
        raise BadRequestError("Minimum budget is ₹100 (10,000 paise)")

    milestone_pool = total_budget // 2
    success_fee = total_budget - milestone_pool

    # Insert project
    proj_data: dict = {
        "employer_id": employer_id,
        "title": ai_output["project_title"],
        "project_summary": ai_output.get("project_summary", ""),
        "raw_requirement": body["raw_requirement"],
        "category": category,
        "total_budget": total_budget,
        "milestone_pool": milestone_pool,
        "success_fee": success_fee,
        "status": "OPEN",
    }
    if body.get("source_text"):
        proj_data["source_text"] = body["source_text"]
    proj_result = db.table("projects").insert(proj_data).execute()
    project = proj_result.data[0]
    project_id = project["id"]

    # Insert milestones — cumulative deadlines (each milestone starts after the previous ends)
    now = datetime.now()
    cumulative_days = 0
    for ms in sorted(ai_output["milestones"], key=lambda m: m["sequence"]):
        deadline_days = max(1, int(ms.get("suggested_deadline_days", 3)))
        cumulative_days += deadline_days
        deadline = now + timedelta(days=cumulative_days)
        payout_amount = int((ms["weight_percentage"] / 100) * milestone_pool)
        db.table("milestones").insert({
            "project_id": project_id,
            "sequence_number": ms["sequence"],
            "title": ms["title"],
            "description": ms["description"],
            "ai_success_criteria": ms["ai_success_criteria"],
            "weight_percentage": ms["weight_percentage"],
            "payout_amount": payout_amount,
            "deadline": deadline.isoformat(),
            "status": "LOCKED",
        }).execute()

    return get_project(project_id, employer_id)


def fund_project(project_id: str, employer_id: str) -> dict:
    db = get_db()
    project = db.table("projects").select("*").eq("id", project_id).single().execute().data
    if not project:
        raise NotFoundError("Project")
    if project["employer_id"] != employer_id:
        raise ForbiddenError("Not your project")
    if project["status"] != "DRAFT":
        raise BadRequestError(f"Project is not in DRAFT status (current: {project['status']})")

    total_budget = project["total_budget"]

    # Create Razorpay order
    try:
        order = razorpay_client.create_order(
            amount_paise=total_budget,
            receipt=f"proj_{project_id[:8]}",
        )
    except Exception as e:
        raise BadRequestError(f"Razorpay order creation failed: {str(e)}")

    db.table("projects").update({
        "razorpay_order_id": order["id"],
        "status": "FUNDED",
        "updated_at": datetime.now().isoformat(),
    }).eq("id", project_id).execute()

    return {
        "razorpay_order_id": order["id"],
        "razorpay_key_id": settings.RAZORPAY_KEY_ID,
        "amount": total_budget,
        "currency": "INR",
        "project_id": project_id,
    }


def activate_project_after_payment(project_id: str, razorpay_payment_id: str) -> dict:
    """Called by webhook or simulate-payment. Sets up escrow and opens project."""
    db = get_db()
    project = db.table("projects").select("*").eq("id", project_id).single().execute().data
    if not project:
        raise NotFoundError("Project")
    if project["status"] in ("OPEN", "IN_PROGRESS", "COMPLETED"):
        return project  # idempotent

    total_budget = project["total_budget"]
    milestone_pool = project["milestone_pool"]

    # Banking: credit escrow account
    deposit_to_escrow(total_budget)

    # Set payout_amount, payout_floor, penalty_rate on milestones
    milestones = db.table("milestones").select("*").eq("project_id", project_id).order("sequence_number").execute().data
    for ms in milestones:
        payout_amount = int((ms["weight_percentage"] / 100) * milestone_pool)
        payout_floor = payout_amount // 2
        if settings.DEMO_MODE:
            penalty_rate = payout_amount / 300   # paise/sec
        else:
            penalty_rate = payout_amount / 50    # paise/hr

        db.table("milestones").update({
            "payout_amount": payout_amount,
            "payout_floor": payout_floor,
            "penalty_rate": penalty_rate,
            "updated_at": datetime.now().isoformat(),
        }).eq("id", ms["id"]).execute()

    db.table("projects").update({
        "status": "OPEN",
        "escrow_held": total_budget,
        "razorpay_payment_id": razorpay_payment_id,
        "updated_at": datetime.now().isoformat(),
    }).eq("id", project_id).execute()

    return db.table("projects").select("*").eq("id", project_id).single().execute().data


def get_project(project_id: str, requesting_user_id: str = None) -> dict:
    db = get_db()
    result = db.table("projects").select("*, users!projects_employer_id_fkey(id,name,employer_trust_score)").eq("id", project_id).single().execute()
    if not result.data:
        raise NotFoundError("Project")
    project = result.data

    milestones = db.table("milestones").select("*").eq("project_id", project_id).order("sequence_number").execute().data
    project["milestones"] = milestones
    return project


def get_marketplace(category: str = None, page: int = 1, limit: int = 20) -> list:
    db = get_db()
    query = db.table("projects").select(
        "id, title, project_summary, category, total_budget, milestone_pool, success_fee, created_at, status, "
        "users!projects_employer_id_fkey(id, name, employer_trust_score)"
    ).eq("status", "OPEN")

    if category:
        query = query.eq("category", category)

    offset = (page - 1) * limit
    result = query.order("created_at", desc=True).range(offset, offset + limit - 1).execute()
    projects = result.data or []

    # Attach milestone count + bid count
    for proj in projects:
        ms_count = db.table("milestones").select("id", count="exact").eq("project_id", proj["id"]).execute()
        bid_count = db.table("bids").select("id", count="exact").eq("project_id", proj["id"]).execute()
        proj["milestone_count"] = ms_count.count or 0
        proj["bid_count"] = bid_count.count or 0

    return projects


def get_marketplace_project(project_id: str, freelancer_id: str) -> dict:
    """Marketplace detail view — project + milestones + my_bid for this freelancer."""
    project = get_project(project_id)
    if project["status"] not in ("OPEN", "IN_PROGRESS"):
        raise NotFoundError("Project")

    db = get_db()
    bid_result = db.table("bids").select("status, proposed_rate").eq("project_id", project_id).eq("freelancer_id", freelancer_id).execute()
    project["my_bid"] = bid_result.data[0] if bid_result.data else None
    return project


def get_employer_projects(employer_id: str, status: str = None) -> list:
    db = get_db()
    query = db.table("projects").select("*").eq("employer_id", employer_id)
    if status:
        query = query.eq("status", status)
    result = query.order("created_at", desc=True).execute()
    return result.data or []


def cancel_project(project_id: str, employer_id: str) -> dict:
    db = get_db()
    project = db.table("projects").select("*").eq("id", project_id).single().execute().data
    if not project:
        raise NotFoundError("Project")
    if project["employer_id"] != employer_id:
        raise ForbiddenError("Not your project")
    if project["status"] not in ("DRAFT", "OPEN"):
        raise BadRequestError("Can only cancel DRAFT or OPEN projects")

    # Refund escrow if funded
    if project["escrow_held"] > 0:
        from payments.banking import withdraw_from_escrow
        withdraw_from_escrow(project["escrow_held"])

    db.table("projects").update({
        "status": "CANCELLED",
        "escrow_held": 0,
        "updated_at": datetime.now().isoformat(),
    }).eq("id", project_id).execute()

    return {"message": f"Project cancelled. Refund of ₹{project['total_budget']//100:,} initiated.", "project_id": project_id}
