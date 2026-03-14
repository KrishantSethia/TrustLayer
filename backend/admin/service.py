from datetime import datetime, timedelta
from database import get_db
from exceptions import NotFoundError, BadRequestError
from pfi.engine import update_pfi
from payments.banking import transfer_money, deposit_to_escrow, withdraw_from_escrow
from config import settings
import bcrypt


def get_all_users(role: str = None) -> list:
    db = get_db()
    query = db.table("users").select(
        "id, name, email, role, pfi_score, employer_trust_score, abandoned_projects, created_at"
    )
    if role and role != "ALL":
        query = query.eq("role", role)
    else:
        # Exclude the internal escrow/admin system accounts
        query = query.in_("role", ["EMPLOYER", "FREELANCER"])
    return query.order("created_at", desc=True).execute().data or []


def get_all_projects(status: str = None) -> list:
    db = get_db()
    query = db.table("projects").select("*")
    if status:
        query = query.eq("status", status)
    projects = query.order("created_at", desc=True).execute().data

    # Enrich with employer + freelancer info via separate queries
    employer_ids = list({p["employer_id"] for p in projects if p.get("employer_id")})
    freelancer_ids = list({p["freelancer_id"] for p in projects if p.get("freelancer_id")})

    employers_map = {}
    if employer_ids:
        rows = db.table("users").select("id, name, email").in_("id", employer_ids).execute().data
        employers_map = {str(r["id"]): r for r in rows}

    freelancers_map = {}
    if freelancer_ids:
        rows = db.table("users").select("id, name, pfi_score").in_("id", freelancer_ids).execute().data
        freelancers_map = {str(r["id"]): r for r in rows}

    # Enrich with milestones
    project_ids = [p["id"] for p in projects]
    milestones_map: dict[str, list] = {pid: [] for pid in project_ids}
    if project_ids:
        all_ms = db.table("milestones").select(
            "id, project_id, title, status, sequence_number, payout_amount, deadline, auto_release_at, deliverable_text"
        ).in_("project_id", project_ids).order("sequence_number").execute().data or []
        for ms in all_ms:
            milestones_map.setdefault(str(ms["project_id"]), []).append(ms)

    for proj in projects:
        proj["users!projects_employer_id_fkey"] = employers_map.get(str(proj.get("employer_id")))
        proj["users!projects_freelancer_id_fkey"] = freelancers_map.get(str(proj.get("freelancer_id")))
        proj["milestones"] = milestones_map.get(str(proj["id"]), [])

    return projects


def adjust_pfi(freelancer_id: str, delta: int, reason: str) -> dict:
    db = get_db()
    user = db.table("users").select("id, name, pfi_score, role").eq(
        "id", freelancer_id
    ).single().execute().data
    if not user:
        raise NotFoundError("User")
    if user["role"] != "FREELANCER":
        raise BadRequestError("PFI only applies to freelancers")

    old_score = user.get("pfi_score") or 500
    new_score = max(300, min(850, old_score + delta))

    db.table("users").update({
        "pfi_score": new_score,
        "updated_at": datetime.now().isoformat(),
    }).eq("id", freelancer_id).execute()

    return {
        "freelancer_id": freelancer_id,
        "name": user["name"],
        "old_pfi": old_score,
        "new_pfi": new_score,
        "delta": delta,
        "reason": reason,
    }


def ghost_protocol_manual(project_id: str) -> dict:
    """Admin-triggered ghost protocol for demo purposes."""
    from scheduler.ghost_protocol import execute_ghost_protocol
    return execute_ghost_protocol(project_id)


def _ensure_user(db, email: str, name: str, role: str, password: str,
                  pfi_score: int = None, employer_trust_score: int = None,
                  phone: int = 9000000000) -> str:
    """Create or update a demo user. Returns user_id."""
    now = datetime.now().isoformat()
    password_hash = bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()
    existing = db.table("users").select("id").eq("email", email).execute().data
    if existing:
        uid = existing[0]["id"]
        payload: dict = {"updated_at": now, "name": name, "role": role, "password_hash": password_hash}
        if pfi_score is not None:
            payload["pfi_score"] = pfi_score
        if employer_trust_score is not None:
            payload["employer_trust_score"] = employer_trust_score
        db.table("users").update(payload).eq("id", uid).execute()
        return uid

    password_hash = bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()
    user_id = db.rpc("create_user", {
        "p_name": name, "p_email": email,
        "p_phone": phone, "p_account_type": "personal",
    }).execute().data

    update_payload = {"role": role, "password_hash": password_hash, "updated_at": now}
    if pfi_score is not None:
        update_payload["pfi_score"] = pfi_score
    if employer_trust_score is not None:
        update_payload["employer_trust_score"] = employer_trust_score
    db.table("users").update(update_payload).eq("id", user_id).execute()
    return user_id


def ensure_admin() -> dict:
    """Create the admin user if it doesn't exist. Returns admin info."""
    db = get_db()
    existing = db.table("users").select("id, email").eq("email", "admin@trustlayer.demo").execute().data
    if existing:
        return {"email": "admin@trustlayer.demo", "status": "already_exists", "id": existing[0]["id"]}

    admin_id = _ensure_user(db,
        email="admin@trustlayer.demo", name="TrustLayer Admin",
        role="ADMIN", password="admin123", phone=9000000001)
    return {"email": "admin@trustlayer.demo", "status": "created", "id": admin_id, "password": "admin123"}


def bootstrap() -> dict:
    """One-time bootstrap: create admin + seed demo data. Only works if no admin exists."""
    db = get_db()
    existing_admin = db.table("users").select("id").eq("role", "ADMIN").execute().data
    # Allow bootstrap only if no non-system admin exists
    real_admins = [u for u in existing_admin if str(u["id"]) not in (
        "aaaaaaaa-0000-0000-0000-aaaaaaaaaaaa",
        "bbbbbbbb-0000-0000-0000-bbbbbbbbbbbb",
    )]
    if real_admins:
        raise BadRequestError("Bootstrap already completed — admin user exists. Log in as admin to seed data.")

    admin_info = ensure_admin()
    seed_result = seed_demo()
    return {"admin": admin_info, "seed": seed_result}


def seed_demo() -> dict:
    """Create a realistic platform with users, past projects, transactions, and live demo data."""
    db = get_db()
    now = datetime.now()
    from pfi.engine import get_fee_tier

    # Ensure admin exists
    ensure_admin()

    # ──────────────────────────────────────────────
    # 1. USERS
    # ──────────────────────────────────────────────
    users = {}

    # Employers
    users["rajesh"] = _ensure_user(db,
        email="rajesh@trustlayer.demo", name="Rajesh Mehta",
        role="EMPLOYER", password="demo1234", employer_trust_score=750)
    users["ananya"] = _ensure_user(db,
        email="ananya@trustlayer.demo", name="Ananya Gupta",
        role="EMPLOYER", password="demo1234", employer_trust_score=680)
    users["vikram"] = _ensure_user(db,
        email="vikram@trustlayer.demo", name="Vikram Singh",
        role="EMPLOYER", password="demo1234", employer_trust_score=820)

    # Freelancers
    users["priya"] = _ensure_user(db,
        email="priya@trustlayer.demo", name="Priya Sharma",
        role="FREELANCER", password="demo1234", pfi_score=795)
    users["arjun"] = _ensure_user(db,
        email="arjun@trustlayer.demo", name="Arjun Patel",
        role="FREELANCER", password="demo1234", pfi_score=650)
    users["neha"] = _ensure_user(db,
        email="neha@trustlayer.demo", name="Neha Reddy",
        role="FREELANCER", password="demo1234", pfi_score=420)
    users["karthik"] = _ensure_user(db,
        email="karthik@trustlayer.demo", name="Karthik Iyer",
        role="FREELANCER", password="demo1234", pfi_score=550)

    created_projects = []

    def _create_completed_project(
        employer_id, freelancer_id, title, category, total_budget,
        milestones_data, days_ago, project_summary, raw_requirement,
        dispute_on_ms=None, handover_document=None,
    ):
        """Insert a fully completed project with proper escrow accounting."""
        milestone_pool = total_budget // 2
        success_fee = total_budget - milestone_pool
        created_at = (now - timedelta(days=days_ago)).isoformat()

        proj = db.table("projects").insert({
            "employer_id": employer_id,
            "freelancer_id": freelancer_id,
            "title": title,
            "project_summary": project_summary,
            "raw_requirement": raw_requirement,
            "category": category,
            "total_budget": total_budget,
            "milestone_pool": milestone_pool,
            "success_fee": success_fee,
            "escrow_held": 0,
            "milestone_frozen": 0,
            "status": "COMPLETED",
            "razorpay_order_id": f"order_seed_{title[:8].replace(' ', '')}",
            "razorpay_payment_id": f"pay_seed_{title[:8].replace(' ', '')}",
            "handover_document": handover_document,
            "created_at": created_at,
            "updated_at": now.isoformat(),
        }).execute().data[0]
        project_id = proj["id"]

        # Deposit full budget to escrow
        deposit_to_escrow(total_budget)

        # Freelancer's PFI for fee calc
        fl_pfi = db.table("users").select("pfi_score").eq("id", freelancer_id).single().execute().data["pfi_score"] or 500
        fee_rate = get_fee_tier(fl_pfi)["fee_percent"] / 100

        cumulative_days = 0
        for i, ms_data in enumerate(milestones_data, 1):
            payout_amount = int((ms_data["weight"] / 100) * milestone_pool)
            payout_floor = payout_amount // 2
            cumulative_days += ms_data.get("duration_days", 3)
            deadline = (now - timedelta(days=days_ago) + timedelta(days=cumulative_days)).isoformat()
            completed_at = (now - timedelta(days=days_ago) + timedelta(days=cumulative_days - 1)).isoformat()

            platform_fee = int(payout_amount * fee_rate)
            net_payout = payout_amount - platform_fee

            ms_insert = {
                "project_id": project_id,
                "sequence_number": i,
                "title": ms_data["title"],
                "description": ms_data.get("description", ""),
                "ai_success_criteria": ms_data.get("criteria", "Quality deliverable meeting requirements"),
                "weight_percentage": ms_data["weight"],
                "payout_amount": payout_amount,
                "payout_floor": payout_floor,
                "penalty_rate": payout_amount / 300,
                "deadline": deadline,
                "status": "COMPLETED_PAID",
                "deliverable_text": ms_data.get("deliverable", "Delivered as per requirements."),
                "submission_count": 1,
                "ai_evaluation_json": {
                    "status": "FULLY_MET", "score": ms_data.get("score", 92),
                    "summary": f"All criteria met. {ms_data['title']} delivered successfully.",
                    "checklist": [{"criterion": "Quality", "met": True, "comment": "Meets standards"}],
                },
                "final_payout": net_payout,
                "created_at": created_at,
                "updated_at": completed_at,
            }
            ms_row = db.table("milestones").insert(ms_insert).execute().data[0]

            # Banking: escrow → freelancer + platform fee
            if net_payout > 0:
                transfer_money(settings.PLATFORM_ESCROW_USER_ID, freelancer_id, net_payout)
            if platform_fee > 0:
                withdraw_from_escrow(platform_fee)

            # Create dispute if specified
            if dispute_on_ms and dispute_on_ms.get("sequence") == i:
                d_type = dispute_on_ms["type"]
                raised_by = employer_id if d_type == "EMPLOYER_VETO" else freelancer_id
                arb_fee = int(payout_amount * 0.05) if d_type == "EMPLOYER_VETO" else 0
                db.table("disputes").insert({
                    "milestone_id": ms_row["id"],
                    "raised_by": raised_by,
                    "dispute_type": d_type,
                    "arbitration_fee": arb_fee,
                    "ruling": dispute_on_ms.get("ruling", "FREELANCER_WIN"),
                    "admin_notes": dispute_on_ms.get("notes", "Resolved by admin review"),
                    "ruled_by": None,
                    "ruled_at": completed_at,
                    "created_at": completed_at,
                    "updated_at": completed_at,
                }).execute()

        # Success fee payout
        sf_platform_fee = int(success_fee * fee_rate)
        sf_net = success_fee - sf_platform_fee
        if sf_net > 0:
            transfer_money(settings.PLATFORM_ESCROW_USER_ID, freelancer_id, sf_net)
        if sf_platform_fee > 0:
            withdraw_from_escrow(sf_platform_fee)

        created_projects.append({"id": project_id, "title": title, "status": "COMPLETED"})

    # ──────────────────────────────────────────────
    # 2. COMPLETED PROJECTS (history)
    # ──────────────────────────────────────────────

    # Project 1: Rajesh → Priya (WRITING, ₹18,000)
    _create_completed_project(
        employer_id=users["rajesh"], freelancer_id=users["priya"],
        title="Corporate Brand Guidelines Document",
        category="WRITING", total_budget=1800000, days_ago=45,
        project_summary="Comprehensive brand guidelines covering voice, tone, visual identity, and usage rules for TechNova Corp.",
        raw_requirement="Write a complete brand guidelines document for our B2B SaaS company TechNova. Cover brand voice, messaging framework, visual identity rules, and social media guidelines.",
        milestones_data=[
            {"title": "Brand Voice & Messaging Framework", "weight": 30, "duration_days": 5, "score": 95,
             "criteria": "Define brand personality, voice attributes, messaging pillars, and elevator pitch",
             "deliverable": "# Brand Voice & Messaging Framework\n\n## Brand Personality\nTechNova is innovative, trustworthy, and approachable...\n\n## Voice Attributes\n1. Confident but not arrogant\n2. Technical but accessible\n3. Forward-thinking but grounded\n\n## Messaging Pillars\n- Innovation at Scale\n- Enterprise Trust\n- Developer-First\n\n## Elevator Pitch\nTechNova empowers enterprise teams to ship faster with AI-powered development tools that integrate seamlessly into existing workflows."},
            {"title": "Visual Identity Guidelines", "weight": 35, "duration_days": 5, "score": 90,
             "criteria": "Logo usage rules, color palette with hex codes, typography hierarchy, spacing guidelines",
             "deliverable": "# Visual Identity Guidelines\n\n## Logo Usage\n- Minimum size: 32px height\n- Clear space: 1x logo height on all sides\n- Never stretch, rotate, or recolor\n\n## Color Palette\n- Primary: #2563EB (TechNova Blue)\n- Secondary: #10B981 (Growth Green)\n- Neutral: #1E293B (Slate 800)\n- Background: #F8FAFC (Slate 50)\n\n## Typography\n- Headlines: Inter Bold, 24-48px\n- Body: Inter Regular, 14-16px\n- Code: JetBrains Mono, 13px"},
            {"title": "Social Media & Content Templates", "weight": 35, "duration_days": 4, "score": 93,
             "criteria": "Platform-specific guidelines for LinkedIn, Twitter, blog posts. Include 3 template examples each",
             "deliverable": "# Social Media & Content Templates\n\n## LinkedIn\n- Tone: Professional, thought-leadership focused\n- Post length: 150-300 words\n- Template: [Hook question] + [Insight] + [CTA]\n\n## Twitter/X\n- Tone: Concise, developer-friendly\n- Use threads for technical content\n- Template: [Bold claim] → [Evidence] → [Link]\n\n## Blog Posts\n- 1500-2500 words\n- Structure: Problem → Solution → Implementation → Results"},
        ],
    )

    # Project 2: Ananya → Arjun (TRANSLATION, ₹12,000)
    _create_completed_project(
        employer_id=users["ananya"], freelancer_id=users["arjun"],
        title="Hindi to English Legal Contract Translation",
        category="TRANSLATION", total_budget=1200000, days_ago=30,
        project_summary="Professional translation of a 15-page vendor services agreement from Hindi to English, preserving legal terminology.",
        raw_requirement="Translate our vendor services agreement from Hindi to English. The document is 15 pages and contains standard legal clauses. Must preserve legal terminology accurately.",
        milestones_data=[
            {"title": "Sections 1-5: Definitions & Scope", "weight": 30, "duration_days": 3, "score": 88,
             "criteria": "Accurate translation of legal definitions, party obligations, and scope of services",
             "deliverable": "VENDOR SERVICES AGREEMENT\n\nSection 1: Definitions\n1.1 'Service Provider' means the party providing services under this Agreement...\n1.2 'Client' means the party receiving services...\n\nSection 2: Scope of Services\nThe Service Provider shall deliver the following...\n\nSection 3: Term and Termination\nThis Agreement shall be effective from..."},
            {"title": "Sections 6-10: Payment & Liability", "weight": 35, "duration_days": 4, "score": 91,
             "criteria": "Payment terms, limitation of liability, indemnification clauses accurately translated",
             "deliverable": "Section 6: Payment Terms\n6.1 The Client shall pay the Service Provider within 30 days of invoice receipt...\n6.2 Late payments shall attract interest at 1.5% per month...\n\nSection 7: Limitation of Liability\n7.1 Neither party shall be liable for indirect, consequential, or incidental damages..."},
            {"title": "Sections 11-15: Compliance & Signatures", "weight": 35, "duration_days": 3, "score": 94,
             "criteria": "Regulatory compliance clauses, dispute resolution, governing law, and signature blocks",
             "deliverable": "Section 11: Confidentiality\n11.1 Both parties agree to maintain strict confidentiality of all proprietary information...\n\nSection 12: Dispute Resolution\n12.1 Any disputes shall be resolved through arbitration in New Delhi...\n\nSection 13: Governing Law\nThis Agreement shall be governed by the laws of India..."},
        ],
    )

    # Project 3: Vikram → Priya (WRITING, ₹25,000)
    _create_completed_project(
        employer_id=users["vikram"], freelancer_id=users["priya"],
        title="E-commerce Product Descriptions (50 Items)",
        category="WRITING", total_budget=2500000, days_ago=20,
        project_summary="SEO-optimized product descriptions for 50 premium home decor items for an online marketplace.",
        raw_requirement="Write compelling, SEO-optimized product descriptions for 50 premium home decor items. Each should be 100-150 words, include 3-5 keywords, and highlight unique selling points.",
        milestones_data=[
            {"title": "Batch 1: Living Room Collection (15 items)", "weight": 30, "duration_days": 4, "score": 96,
             "criteria": "15 product descriptions, each 100-150 words, with SEO keywords and unique selling points",
             "deliverable": "1. Artisan Ceramic Vase — Handcrafted by skilled artisans in Rajasthan, this ceramic vase brings earthy elegance to any living space. Standing 12 inches tall with a matte sage finish, it pairs beautifully with dried pampas grass or fresh botanicals. The organic curves and hand-painted motifs make each piece uniquely yours.\n\n2. Velvet Throw Pillow Set — Transform your sofa with our premium velvet throw pillows..."},
            {"title": "Batch 2: Bedroom & Kitchen (20 items)", "weight": 40, "duration_days": 5, "score": 93,
             "criteria": "20 product descriptions for bedroom and kitchen categories, SEO-optimized",
             "deliverable": "16. Egyptian Cotton Duvet Cover — Wrap yourself in luxury with our 400-thread-count Egyptian cotton duvet cover. Available in 6 muted tones, this breathable fabric regulates temperature for year-round comfort...\n\n17. Bamboo Cutting Board Set — Sustainably sourced bamboo meets functional design..."},
            {"title": "Batch 3: Outdoor & Décor (15 items)", "weight": 30, "duration_days": 4, "score": 91,
             "criteria": "15 product descriptions for outdoor furniture and decorative items",
             "deliverable": "36. Teak Garden Bench — Weather-resistant and timeless, our solid teak garden bench seats three comfortably. Hand-finished with natural teak oil, it develops a beautiful silver patina over time...\n\n37. Solar-Powered Lantern Set — Illuminate your evenings sustainably..."},
        ],
    )

    # Project 4: Rajesh → Arjun (CODE, ₹15,000) — with a resolved dispute
    _create_completed_project(
        employer_id=users["rajesh"], freelancer_id=users["arjun"],
        title="Python REST API Documentation",
        category="CODE", total_budget=1500000, days_ago=12,
        project_summary="Auto-generated API documentation with Sphinx for a Python FastAPI microservice. Includes endpoint descriptions, request/response schemas, and authentication guide.",
        raw_requirement="Document our FastAPI microservice endpoints using Sphinx. Cover all 25 endpoints, include request/response examples, authentication flow, and error codes.",
        milestones_data=[
            {"title": "API Endpoint Reference (12 endpoints)", "weight": 35, "duration_days": 4, "score": 85,
             "criteria": "Document 12 core endpoints with method, path, parameters, request body, response schema, and example",
             "deliverable": "# API Reference\n\n## Authentication\n\n### POST /auth/login\nAuthenticate a user and receive a JWT token.\n\n**Request Body:**\n```json\n{\"email\": \"user@example.com\", \"password\": \"...\"}\n```\n\n**Response (200):**\n```json\n{\"access_token\": \"eyJ...\", \"token_type\": \"bearer\"}\n```\n\n### POST /auth/register\nCreate a new user account..."},
            {"title": "Remaining Endpoints + Auth Guide", "weight": 35, "duration_days": 4, "score": 90,
             "criteria": "Document remaining 13 endpoints plus complete authentication flow guide with JWT handling",
             "deliverable": "## Projects\n\n### GET /projects\nList all projects with pagination.\n\n**Query Parameters:**\n- `page` (int, default: 1)\n- `limit` (int, default: 20)\n- `status` (string, optional)\n\n**Response (200):**\n```json\n[{\"id\": \"uuid\", \"title\": \"...\", \"status\": \"OPEN\"}]\n```\n\n## Authentication Guide\n\n### JWT Flow\n1. Call POST /auth/login with credentials\n2. Store the access_token\n3. Include in all requests: Authorization: Bearer <token>"},
            {"title": "Error Codes & Sphinx Build", "weight": 30, "duration_days": 3, "score": 88,
             "criteria": "Complete error code reference table, Sphinx configuration, and built HTML documentation",
             "deliverable": "## Error Codes\n\n| Code | Meaning | Example |\n|------|---------|----------|\n| 400 | Bad Request | Missing required field |\n| 401 | Unauthorized | Invalid/expired token |\n| 403 | Forbidden | Insufficient permissions |\n| 404 | Not Found | Resource doesn't exist |\n| 409 | Conflict | Duplicate entry |\n| 502 | Bad Gateway | External service failure |\n\n## Sphinx Configuration\n```python\nproject = 'FastAPI Microservice'\nextensions = ['sphinx.ext.autodoc', 'sphinx.ext.napoleon']\n```"},
        ],
        dispute_on_ms={
            "sequence": 1, "type": "EMPLOYER_VETO", "ruling": "FREELANCER_WIN",
            "notes": "Employer expected Swagger UI format but requirement specified Sphinx. Freelancer's delivery matches the agreed criteria.",
        },
    )

    # ──────────────────────────────────────────────
    # 3. IN-PROGRESS PROJECT (live demo)
    # ──────────────────────────────────────────────
    in_progress_budget = 2000000  # ₹20,000
    ip_milestone_pool = in_progress_budget // 2
    ip_success_fee = in_progress_budget - ip_milestone_pool
    ip_created = (now - timedelta(days=5)).isoformat()

    fl_pfi = db.table("users").select("pfi_score").eq("id", users["priya"]).single().execute().data["pfi_score"] or 500
    ip_fee_rate = get_fee_tier(fl_pfi)["fee_percent"] / 100

    ip_proj = db.table("projects").insert({
        "employer_id": users["ananya"],
        "freelancer_id": users["priya"],
        "title": "SaaS Landing Page Copy & Email Sequence",
        "project_summary": "Conversion-optimized landing page copy and 5-email onboarding drip sequence for a project management SaaS tool.",
        "raw_requirement": "Write landing page copy (hero, features, testimonials, CTA sections) and a 5-email welcome/onboarding drip sequence for our project management tool 'TaskFlow'. Target audience: small team leads, 25-40 age range.",
        "category": "WRITING",
        "total_budget": in_progress_budget,
        "milestone_pool": ip_milestone_pool,
        "success_fee": ip_success_fee,
        "escrow_held": in_progress_budget,
        "milestone_frozen": 0,
        "status": "IN_PROGRESS",
        "razorpay_order_id": f"order_seed_saas",
        "razorpay_payment_id": f"pay_seed_saas",
        "created_at": ip_created,
        "updated_at": now.isoformat(),
    }).execute().data[0]
    ip_project_id = ip_proj["id"]

    # Fund the escrow
    deposit_to_escrow(in_progress_budget)

    ip_milestones = [
        {
            "title": "Landing Page Hero & Feature Sections",
            "weight": 30, "duration_days": 3, "status": "COMPLETED_PAID", "score": 94,
            "criteria": "Hero headline + subheadline, 4 feature sections with benefit-driven copy, social proof section",
            "deliverable": "# TaskFlow Landing Page\n\n## Hero\n**Ship projects, not excuses.**\nThe project management tool that gets out of your way. Track tasks, hit deadlines, and keep your team aligned — without the bloat.\n\n[Start Free Trial] [Watch Demo]\n\n## Features\n\n### Real-time Task Boards\nDrag, drop, done. Visualize your workflow with Kanban boards that update instantly across your team.\n\n### Smart Deadlines\nAI-powered deadline suggestions based on your team's velocity. Never overcommit again.\n\n### One-Click Standups\nAutomated daily summaries sent to Slack. Skip the meeting, keep the alignment.\n\n### Built-in Time Tracking\nKnow where hours go without nagging your team. Passive tracking that respects focus time.",
        },
        {
            "title": "Testimonials, CTA & Pricing Copy",
            "weight": 30, "duration_days": 3, "status": "IN_PROGRESS",
            "criteria": "3 customer testimonial templates, CTA section with urgency copy, pricing page copy for 3 tiers",
            "deliverable": None,
        },
        {
            "title": "5-Email Onboarding Drip Sequence",
            "weight": 40, "duration_days": 4, "status": "LOCKED",
            "criteria": "5 emails: welcome, quick-win tutorial, feature highlight, social proof, upgrade nudge. Each 150-250 words.",
            "deliverable": None,
        },
    ]

    cumulative_days = 0
    for i, ms_d in enumerate(ip_milestones, 1):
        cumulative_days += ms_d["duration_days"]
        deadline = (now - timedelta(days=5) + timedelta(days=cumulative_days))
        payout_amount = int((ms_d["weight"] / 100) * ip_milestone_pool)
        payout_floor = payout_amount // 2
        penalty_rate = payout_amount / 300

        ms_insert: dict = {
            "project_id": ip_project_id,
            "sequence_number": i,
            "title": ms_d["title"],
            "description": "",
            "ai_success_criteria": ms_d["criteria"],
            "weight_percentage": ms_d["weight"],
            "payout_amount": payout_amount,
            "payout_floor": payout_floor,
            "penalty_rate": penalty_rate,
            "deadline": deadline.isoformat(),
            "status": ms_d["status"],
            "submission_count": 1 if ms_d["status"] == "COMPLETED_PAID" else 0,
            "created_at": ip_created,
            "updated_at": now.isoformat(),
        }

        if ms_d["status"] == "COMPLETED_PAID":
            platform_fee = int(payout_amount * ip_fee_rate)
            net_payout = payout_amount - platform_fee
            ms_insert["final_payout"] = net_payout
            ms_insert["deliverable_text"] = ms_d["deliverable"]
            ms_insert["ai_evaluation_json"] = {
                "status": "FULLY_MET", "score": ms_d.get("score", 90),
                "summary": "All criteria met.",
                "checklist": [{"criterion": "Quality", "met": True, "comment": "Excellent work"}],
            }
            ms_row = db.table("milestones").insert(ms_insert).execute().data[0]
            # Banking
            if net_payout > 0:
                transfer_money(settings.PLATFORM_ESCROW_USER_ID, users["priya"], net_payout)
            if platform_fee > 0:
                withdraw_from_escrow(platform_fee)
            # Update project escrow tracking
            db.table("projects").update({
                "escrow_held": max(0, in_progress_budget - payout_amount),
                "milestone_frozen": net_payout,
            }).eq("id", ip_project_id).execute()
        else:
            db.table("milestones").insert(ms_insert).execute()

    created_projects.append({"id": ip_project_id, "title": ip_proj["title"], "status": "IN_PROGRESS"})

    # ──────────────────────────────────────────────
    # 4. OPEN PROJECTS (marketplace)
    # ──────────────────────────────────────────────
    open_projects_data = [
        {
            "employer": "vikram", "title": "Mobile App UI/UX Microcopy",
            "category": "WRITING", "budget": 3000000,
            "summary": "Microcopy for a fitness tracking mobile app — onboarding screens, empty states, error messages, push notifications, and in-app tooltips.",
            "requirement": "Write all UI/UX microcopy for our fitness tracking app 'FitPulse'. Cover 12 onboarding screens, 8 empty states, 15 error messages, 10 push notification templates, and 20 in-app tooltips. Tone: motivational but not cheesy.",
            "milestones": [
                {"title": "Onboarding Screens & Empty States", "weight": 30, "days": 4,
                 "criteria": "12 onboarding screen copy sets (headline + body + CTA) and 8 empty state messages"},
                {"title": "Error Messages & Push Notifications", "weight": 35, "days": 4,
                 "criteria": "15 user-friendly error messages and 10 push notification templates with A/B variants"},
                {"title": "In-App Tooltips & Final Polish", "weight": 35, "days": 3,
                 "criteria": "20 contextual tooltips, consistency review across all copy, and a tone-of-voice cheat sheet"},
            ],
        },
        {
            "employer": "rajesh", "title": "Technical Blog Series: Cloud Architecture",
            "category": "WRITING", "budget": 2200000,
            "summary": "5-part blog series on cloud architecture patterns for a developer-focused publication.",
            "requirement": "Write a 5-part technical blog series on modern cloud architecture patterns: microservices, event-driven, serverless, CQRS, and service mesh. Each article should be 2000-2500 words with code examples and architecture diagrams described in text.",
            "milestones": [
                {"title": "Articles 1-2: Microservices & Event-Driven", "weight": 35, "days": 5,
                 "criteria": "Two 2000-2500 word articles with code examples, pros/cons analysis, and real-world use cases"},
                {"title": "Articles 3-4: Serverless & CQRS", "weight": 35, "days": 5,
                 "criteria": "Two technical articles covering serverless patterns and CQRS with implementation examples"},
                {"title": "Article 5: Service Mesh + Series Summary", "weight": 30, "days": 4,
                 "criteria": "Final article on service mesh, plus a comparison table and decision framework across all 5 patterns"},
            ],
        },
        {
            "employer": "ananya", "title": "Hindi Marketing Brochure Translation",
            "category": "TRANSLATION", "budget": 800000,
            "summary": "Translate a 10-page marketing brochure from English to Hindi while preserving brand voice and cultural nuance.",
            "requirement": "Translate our product marketing brochure from English to Hindi. 10 pages covering product features, customer testimonials, and company story. Must sound natural in Hindi, not like a translation. Preserve formatting structure.",
            "milestones": [
                {"title": "Pages 1-4: Product Features", "weight": 35, "days": 3,
                 "criteria": "Natural Hindi translation of product feature pages, preserving marketing tone and technical terms"},
                {"title": "Pages 5-7: Testimonials & Case Studies", "weight": 30, "days": 3,
                 "criteria": "Culturally adapted testimonials that resonate with Hindi-speaking audience"},
                {"title": "Pages 8-10: Company Story & CTA", "weight": 35, "days": 3,
                 "criteria": "Brand story translation maintaining emotional appeal, plus localized calls-to-action"},
            ],
        },
    ]

    for op in open_projects_data:
        budget = op["budget"]
        ms_pool = budget // 2
        s_fee = budget - ms_pool
        op_created = (now - timedelta(days=2)).isoformat()

        op_proj = db.table("projects").insert({
            "employer_id": users[op["employer"]],
            "title": op["title"],
            "project_summary": op["summary"],
            "raw_requirement": op["requirement"],
            "category": op["category"],
            "total_budget": budget,
            "milestone_pool": ms_pool,
            "success_fee": s_fee,
            "escrow_held": budget,
            "status": "OPEN",
            "razorpay_order_id": f"order_seed_{op['title'][:6].replace(' ', '')}",
            "razorpay_payment_id": f"pay_seed_{op['title'][:6].replace(' ', '')}",
            "created_at": op_created,
            "updated_at": op_created,
        }).execute().data[0]

        # Fund escrow for open projects
        deposit_to_escrow(budget)

        cumul = 0
        for j, ms_d in enumerate(op["milestones"], 1):
            cumul += ms_d["days"]
            payout_amount = int((ms_d["weight"] / 100) * ms_pool)
            db.table("milestones").insert({
                "project_id": op_proj["id"],
                "sequence_number": j,
                "title": ms_d["title"],
                "description": "",
                "ai_success_criteria": ms_d["criteria"],
                "weight_percentage": ms_d["weight"],
                "payout_amount": payout_amount,
                "payout_floor": payout_amount // 2,
                "penalty_rate": payout_amount / 300,
                "deadline": (now + timedelta(days=cumul)).isoformat(),
                "status": "LOCKED",
                "created_at": op_created,
                "updated_at": op_created,
            }).execute()

        # Add some bids on open projects
        created_projects.append({"id": op_proj["id"], "title": op["title"], "status": "OPEN"})

    # ──────────────────────────────────────────────
    # 5. BIDS on open projects
    # ──────────────────────────────────────────────
    # Add bids from freelancers on the open projects
    open_projs = db.table("projects").select("id, total_budget").eq("status", "OPEN").execute().data
    bidders = ["arjun", "neha", "karthik"]
    for op in open_projs[:3]:
        for bidder_key in bidders[:2]:
            bid_existing = db.table("bids").select("id").eq("project_id", op["id"]).eq("freelancer_id", users[bidder_key]).execute().data
            if not bid_existing:
                db.table("bids").insert({
                    "project_id": op["id"],
                    "freelancer_id": users[bidder_key],
                    "proposed_rate": op["total_budget"],
                    "message": f"I'd love to work on this project. I have relevant experience and can deliver quality work within the timeline.",
                    "status": "PENDING",
                }).execute()

    return {
        "demo_users": [{"key": k, "id": v} for k, v in users.items()],
        "projects_created": created_projects,
        "message": "Realistic demo data seeded successfully",
    }


def reset_demo() -> dict:
    """Nuke all demo data — projects, milestones, bids, disputes created by demo accounts."""
    db = get_db()

    # Find ALL demo user IDs (any @trustlayer.demo email)
    from database import _cursor
    from config import settings
    cur = _cursor()
    cur.execute(
        "SELECT id, email FROM users WHERE email LIKE '%%@trustlayer.demo' "
        "AND role != 'ADMIN' AND id != %s",
        [settings.PLATFORM_ESCROW_USER_ID],
    )
    demo_users = [dict(r) for r in cur.fetchall()]
    demo_ids = [u["id"] for u in demo_users]

    deleted = {"projects": 0, "milestones": 0, "bids": 0, "disputes": 0, "users": 0}

    if not demo_ids:
        return {"message": "No demo users found", "deleted": deleted}

    # Find demo projects (employer OR freelancer is a demo user)
    demo_projects = db.table("projects").select("id").in_("employer_id", demo_ids).execute().data
    # Also find projects where freelancer is a demo user
    fl_projects = db.table("projects").select("id").in_("freelancer_id", demo_ids).execute().data
    project_ids = list({p["id"] for p in (demo_projects + fl_projects)})

    if project_ids:
        # Delete disputes → milestones → bids → projects (FK order)
        ms_ids_result = db.table("milestones").select("id").in_("project_id", project_ids).execute().data
        ms_ids = [m["id"] for m in ms_ids_result]

        if ms_ids:
            disputes_deleted = db.table("disputes").delete().in_("milestone_id", ms_ids).execute()
            deleted["disputes"] = len(disputes_deleted.data or [])

        ms_deleted = db.table("milestones").delete().in_("project_id", project_ids).execute()
        deleted["milestones"] = len(ms_deleted.data or [])

        bids_deleted = db.table("bids").delete().in_("project_id", project_ids).execute()
        deleted["bids"] = len(bids_deleted.data or [])

        proj_deleted = db.table("projects").delete().in_("id", project_ids).execute()
        deleted["projects"] = len(proj_deleted.data or [])

    # Also delete bids by demo freelancers on non-demo projects
    for uid in demo_ids:
        db.table("bids").delete().eq("freelancer_id", uid).execute()

    # Reset account balances and clear transactions for demo users + platform escrow
    all_reset_ids = tuple(demo_ids + [settings.PLATFORM_ESCROW_USER_ID])
    # Zero balances
    cur.execute(
        "UPDATE accounts SET balance = 0, updated_at = NOW() WHERE user_id IN %s",
        (all_reset_ids,),
    )
    # Delete transaction history for demo accounts
    cur.execute(
        "SELECT id FROM accounts WHERE user_id IN %s", (all_reset_ids,)
    )
    account_rows = cur.fetchall()
    if account_rows:
        account_ids = tuple(str(r["id"]) for r in account_rows)
        cur.execute(
            "DELETE FROM transactions WHERE from_account IN %s OR to_account IN %s",
            (account_ids, account_ids),
        )

    # Delete demo users themselves (accounts cascade)
    for uid in demo_ids:
        cur.execute("DELETE FROM accounts WHERE user_id = %s", [uid])
        cur.execute("DELETE FROM users WHERE id = %s", [uid])
        deleted["users"] += 1

    # Auto re-seed demo data so quick-login buttons work immediately
    seed_result = seed_demo()

    return {"message": "Demo data reset and re-seeded", "deleted": deleted, "seeded": seed_result}


# ─────────────────────────────────────────────────────────────────────────────
# DEMO HELPER FUNCTIONS
# ─────────────────────────────────────────────────────────────────────────────

def simulate_payment(project_id: str) -> dict:
    """Bypass Razorpay webhook — mark project as OPEN and activate milestones."""
    from projects.service import activate_project_after_payment
    db = get_db()

    proj = db.table("projects").select("id, status").eq("id", project_id).single().execute().data
    if not proj:
        raise NotFoundError("Project")
    if proj["status"] not in ("DRAFT", "FUNDED"):
        raise BadRequestError(f"Project must be DRAFT or FUNDED (current: {proj['status']})")

    # Set to FUNDED first if DRAFT (simulate order creation)
    if proj["status"] == "DRAFT":
        db.table("projects").update({
            "status": "FUNDED",
            "razorpay_order_id": f"demo_order_{project_id[:8]}",
            "updated_at": datetime.now().isoformat(),
        }).eq("id", project_id).execute()

    result = activate_project_after_payment(project_id, f"demo_pay_{project_id[:8]}")
    return {"project_id": project_id, "status": result.get("status", "OPEN")}


def fast_forward_timer(milestone_id: str) -> dict:
    """Set auto_release_at to NOW so the auto-release job fires within seconds."""
    db = get_db()
    ms = db.table("milestones").select("id, status").eq("id", milestone_id).single().execute().data
    if not ms:
        raise NotFoundError("Milestone")
    if ms["status"] != "AI_APPROVED_PENDING":
        raise BadRequestError(f"Milestone must be AI_APPROVED_PENDING (current: {ms['status']})")

    now = datetime.now().isoformat()
    db.table("milestones").update({
        "auto_release_at": now,
        "updated_at": now,
    }).eq("id", milestone_id).execute()

    return {"milestone_id": milestone_id, "auto_release_at": now, "message": "Timer set to NOW — release fires within 5s"}


def fast_forward_approval(milestone_id: str) -> dict:
    """Set milestone to AI_APPROVED_PENDING with a 60-second timer (for demo)."""
    from datetime import timedelta
    from config import settings as cfg
    db = get_db()

    ms = db.table("milestones").select("*").eq("id", milestone_id).single().execute().data
    if not ms:
        raise NotFoundError("Milestone")
    if ms["status"] not in ("IN_PROGRESS", "AI_REJECTED"):
        raise BadRequestError(f"Milestone must be IN_PROGRESS or AI_REJECTED (current: {ms['status']})")

    auto_release_at = datetime.now() + timedelta(seconds=cfg.AUTO_RELEASE_SECONDS)
    now = datetime.now().isoformat()

    db.table("milestones").update({
        "status": "AI_APPROVED_PENDING",
        "auto_release_at": auto_release_at.isoformat(),
        "ai_evaluation_json": {
            "status": "FULLY_MET",
            "score": 95,
            "summary": "Admin fast-forwarded to AI_APPROVED_PENDING for demo.",
            "checklist": [],
            "feedback_for_freelancer": None,
        },
        "updated_at": now,
    }).eq("id", milestone_id).execute()

    return {
        "milestone_id": milestone_id,
        "status": "AI_APPROVED_PENDING",
        "auto_release_at": auto_release_at.isoformat(),
    }


def set_pfi(user_id: str, score: int) -> dict:
    """Set a freelancer's PFI to an exact value (for demo scoreometer)."""
    from pfi.engine import get_fee_tier, PFI_FLOOR, PFI_CEILING
    db = get_db()

    if not (PFI_FLOOR <= score <= PFI_CEILING):
        raise BadRequestError(f"PFI score must be between {PFI_FLOOR} and {PFI_CEILING}")

    user = db.table("users").select("id, name, pfi_score, role").eq("id", user_id).single().execute().data
    if not user:
        raise NotFoundError("User")
    if user["role"] != "FREELANCER":
        raise BadRequestError("PFI only applies to freelancers")

    db.table("users").update({
        "pfi_score": score,
        "updated_at": datetime.now().isoformat(),
    }).eq("id", user_id).execute()

    return {
        "user_id": user_id,
        "name": user["name"],
        "old_pfi": user.get("pfi_score") or 500,
        "pfi_score": score,
        "tier": get_fee_tier(score),
    }


def force_complete_milestone(milestone_id: str, reason: str) -> dict:
    """Admin override — mark milestone COMPLETED_PAID bypassing AI."""
    from milestones.service import complete_milestone_paid
    db = get_db()

    ms = db.table("milestones").select("id, status").eq("id", milestone_id).single().execute().data
    if not ms:
        raise NotFoundError("Milestone")

    # Temporarily set to AI_APPROVED_PENDING so complete_milestone_paid accepts it
    if ms["status"] not in ("AI_APPROVED_PENDING", "DISPUTE_ACTIVE"):
        db.table("milestones").update({
            "status": "AI_APPROVED_PENDING",
            "auto_release_at": datetime.now().isoformat(),
            "ai_evaluation_json": {"status": "FULLY_MET", "score": 100, "summary": f"Admin override: {reason}"},
            "updated_at": datetime.now().isoformat(),
        }).eq("id", milestone_id).execute()

    result = complete_milestone_paid(milestone_id, triggered_by="ADMIN_OVERRIDE")
    return {"milestone_id": milestone_id, "status": "COMPLETED_PAID", "reason": reason, "result": result}


def get_ghost_at_risk() -> list:
    """List milestones close to or past ghost protocol threshold."""
    from datetime import timezone
    db = get_db()
    now = datetime.now(timezone.utc)

    # Fetch overdue IN_PROGRESS milestones (separate queries to avoid nested joins)
    milestones = db.table("milestones").select(
        "id, project_id, title, deadline, extension_requested"
    ).eq("status", "IN_PROGRESS").execute().data

    at_risk = []
    from config import settings as cfg

    # Pre-fetch unique projects
    project_ids = list({ms["project_id"] for ms in milestones if ms.get("project_id")})
    projects_map = {}
    if project_ids:
        projs = db.table("projects").select(
            "id, title, freelancer_id"
        ).in_("id", project_ids).execute().data
        projects_map = {str(p["id"]): p for p in projs}

    # Pre-fetch freelancer info
    freelancer_ids = list({p["freelancer_id"] for p in projects_map.values() if p.get("freelancer_id")})
    freelancers_map = {}
    if freelancer_ids:
        fl = db.table("users").select("id, name, pfi_score").in_("id", freelancer_ids).execute().data
        freelancers_map = {str(u["id"]): u for u in fl}

    for ms in milestones:
        deadline_str = ms.get("deadline")
        if not deadline_str:
            continue
        try:
            deadline = datetime.fromisoformat(str(deadline_str).replace("Z", "+00:00"))
            if not deadline.tzinfo:
                deadline = deadline.replace(tzinfo=timezone.utc)
        except ValueError:
            continue

        if now <= deadline:
            continue  # not overdue

        hours_overdue = (now - deadline).total_seconds() / 3600
        ghost_trigger_hours = cfg.GHOST_TRIGGER_SECONDS / 3600
        hours_until_ghost = max(0, ghost_trigger_hours - hours_overdue)

        proj = projects_map.get(str(ms["project_id"]), {})
        freelancer_id = proj.get("freelancer_id")
        freelancer = freelancers_map.get(str(freelancer_id)) if freelancer_id else None

        at_risk.append({
            "milestone_id": ms["id"],
            "milestone_title": ms["title"],
            "project_id": ms["project_id"],
            "project_title": proj.get("title"),
            "freelancer": freelancer,
            "deadline": deadline_str,
            "hours_overdue": round(hours_overdue, 1),
            "hours_until_ghost": round(hours_until_ghost, 1),
            "extension_requested": ms.get("extension_requested", False),
        })

    return sorted(at_risk, key=lambda x: x["hours_overdue"], reverse=True)


def fast_forward_deadline(milestone_id: str) -> dict:
    """Set milestone deadline to 1 minute ago so it shows as overdue / triggers ghost."""
    from datetime import timedelta
    db = get_db()

    ms = db.table("milestones").select("id, status, deadline").eq("id", milestone_id).single().execute().data
    if not ms:
        raise NotFoundError("Milestone")
    if ms["status"] not in ("IN_PROGRESS", "AI_EVALUATING", "AI_REJECTED"):
        raise BadRequestError(f"Milestone must be active (current: {ms['status']})")

    past_deadline = (datetime.now() - timedelta(minutes=1)).isoformat()
    db.table("milestones").update({
        "deadline": past_deadline,
        "updated_at": datetime.now().isoformat(),
    }).eq("id", milestone_id).execute()

    return {"milestone_id": milestone_id, "deadline": past_deadline, "message": "Deadline set to 1 min ago — milestone is now overdue"}


def create_demo_dispute(milestone_id: str, dispute_type: str) -> dict:
    """Admin-triggered dispute for demo. Creates a dispute without Razorpay."""
    db = get_db()

    ms = db.table("milestones").select("*").eq("id", milestone_id).single().execute().data
    if not ms:
        raise NotFoundError("Milestone")

    proj = db.table("projects").select("*").eq("id", ms["project_id"]).single().execute().data
    if not proj:
        raise NotFoundError("Project")

    if dispute_type == "EMPLOYER_VETO":
        if ms["status"] != "AI_APPROVED_PENDING":
            raise BadRequestError(f"EMPLOYER_VETO requires AI_APPROVED_PENDING (current: {ms['status']})")
        raised_by = proj["employer_id"]
        arb_fee = int((ms["payout_amount"] or 0) * 0.05)
    elif dispute_type == "FREELANCER_ESCALATION":
        if ms["status"] != "AI_REJECTED":
            raise BadRequestError(f"FREELANCER_ESCALATION requires AI_REJECTED (current: {ms['status']})")
        raised_by = proj["freelancer_id"]
        arb_fee = 0
    else:
        raise BadRequestError(f"Invalid dispute_type: {dispute_type}")

    now = datetime.now().isoformat()
    dispute = db.table("disputes").insert({
        "milestone_id": milestone_id,
        "raised_by": raised_by,
        "dispute_type": dispute_type,
        "arbitration_fee": arb_fee,
        "ruling": "PENDING",
    }).execute().data[0]

    db.table("milestones").update({
        "status": "DISPUTE_ACTIVE",
        "updated_at": now,
    }).eq("id", milestone_id).execute()

    return {"dispute_id": dispute["id"], "dispute_type": dispute_type, "milestone_status": "DISPUTE_ACTIVE", "arb_fee": arb_fee}


def get_platform_stats() -> dict:
    """Platform-wide stats for admin dashboard."""
    db = get_db()

    for_status = lambda s: db.table("projects").select("id", count="exact").eq("status", s).execute().count or 0

    proj_counts = {
        "total": db.table("projects").select("id", count="exact").execute().count or 0,
        "draft":       for_status("DRAFT"),
        "open":        for_status("OPEN"),
        "in_progress": for_status("IN_PROGRESS"),
        "completed":   for_status("COMPLETED"),
        "cancelled":   for_status("CANCELLED"),
    }

    dispute_pending = db.table("disputes").select("id", count="exact").eq("ruling", "PENDING").execute().count or 0

    # Revenue stats
    # GMV = total budget of all funded/active/completed projects
    funded_projects = db.table("projects").select("total_budget, escrow_held").in_(
        "status", ["FUNDED", "OPEN", "IN_PROGRESS", "COMPLETED"]
    ).execute().data or []
    gmv = sum(p.get("total_budget") or 0 for p in funded_projects)
    active_escrow = sum(p.get("escrow_held") or 0 for p in funded_projects if p.get("escrow_held"))

    # Platform fees = payout_amount - final_payout for all COMPLETED_PAID milestones
    paid_milestones = db.table("milestones").select(
        "payout_amount, final_payout"
    ).eq("status", "COMPLETED_PAID").execute().data or []
    platform_revenue = sum(
        (m.get("payout_amount") or 0) - (m.get("final_payout") or 0)
        for m in paid_milestones
    )
    total_paid_out = sum(m.get("final_payout") or 0 for m in paid_milestones)

    # User counts
    freelancer_count = db.table("users").select("id", count="exact").eq("role", "FREELANCER").execute().count or 0
    employer_count = db.table("users").select("id", count="exact").eq("role", "EMPLOYER").execute().count or 0

    return {
        "projects": proj_counts,
        "disputes": {"pending": dispute_pending},
        "revenue": {
            "gmv": gmv,
            "platform_revenue": platform_revenue,
            "total_paid_out": total_paid_out,
            "active_escrow": active_escrow,
        },
        "users": {
            "freelancers": freelancer_count,
            "employers": employer_count,
        },
    }
