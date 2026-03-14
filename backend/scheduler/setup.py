from apscheduler.schedulers.background import BackgroundScheduler
from config import settings
import logging

logger = logging.getLogger(__name__)

_scheduler: BackgroundScheduler = None


def get_scheduler() -> BackgroundScheduler:
    return _scheduler


def start_scheduler():
    global _scheduler
    from scheduler.ghost_protocol import check_ghost_protocol
    from scheduler.auto_release import check_auto_release

    _scheduler = BackgroundScheduler(timezone="UTC")

    _scheduler.add_job(
        check_auto_release,
        "interval",
        seconds=settings.SCHEDULER_AUTO_RELEASE_INTERVAL,
        id="auto_release",
        replace_existing=True,
    )

    _scheduler.add_job(
        check_ghost_protocol,
        "interval",
        seconds=settings.SCHEDULER_GHOST_INTERVAL,
        id="ghost_protocol",
        replace_existing=True,
    )

    _scheduler.start()
    logger.info(
        f"Scheduler started — auto_release every {settings.SCHEDULER_AUTO_RELEASE_INTERVAL}s, "
        f"ghost_protocol every {settings.SCHEDULER_GHOST_INTERVAL}s"
    )


def stop_scheduler():
    global _scheduler
    if _scheduler and _scheduler.running:
        _scheduler.shutdown(wait=False)
        logger.info("Scheduler stopped")
