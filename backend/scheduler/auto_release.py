"""
Auto-release: when AI_APPROVED_PENDING milestones reach their auto_release_at timestamp,
automatically complete them (pay out freelancer) without employer action.
"""
from datetime import datetime
from database import get_db
from milestones.service import complete_milestone_paid
import logging

logger = logging.getLogger(__name__)


def check_auto_release():
    """
    APScheduler job. Runs on SCHEDULER_AUTO_RELEASE_INTERVAL_SECONDS.
    Finds AI_APPROVED_PENDING milestones whose auto_release_at has passed
    and triggers completion.
    """
    db = get_db()
    now = datetime.now()  # naive local time — matches how timestamps are stored

    try:
        milestones = db.table("milestones").select(
            "id, project_id, auto_release_at, status"
        ).eq("status", "AI_APPROVED_PENDING").execute().data

        for ms in milestones:
            release_str = ms.get("auto_release_at")
            if not release_str:
                continue

            try:
                if isinstance(release_str, datetime):
                    # psycopg2 returns naive datetime for timestamps without tz
                    release_at = release_str.replace(tzinfo=None)
                else:
                    release_at = datetime.fromisoformat(str(release_str).replace("Z", "").replace("+00:00", ""))
            except (ValueError, TypeError):
                continue

            if now >= release_at:
                logger.info(f"Auto-releasing milestone {ms['id']}")
                try:
                    complete_milestone_paid(ms["id"], triggered_by="AUTO_RELEASE")
                except Exception as e:
                    logger.error(f"Auto-release failed for milestone {ms['id']}: {e}")

    except Exception as e:
        logger.error(f"Auto-release check failed: {e}")
