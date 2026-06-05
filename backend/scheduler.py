from collections import defaultdict
from datetime import datetime, timedelta

from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger
from sqlalchemy.orm import joinedload

from database import SessionLocal
from models import Reservation, Screening


def _send_reminders() -> None:
    db = SessionLocal()
    try:
        tomorrow = (datetime.utcnow() + timedelta(days=1)).date()
        day_start = datetime(tomorrow.year, tomorrow.month, tomorrow.day, 0, 0, 0)
        day_end   = datetime(tomorrow.year, tomorrow.month, tomorrow.day, 23, 59, 59)

        reservations = (
            db.query(Reservation)
            .join(Screening, Reservation.screening_id == Screening.id)
            .filter(Screening.start_time >= day_start, Screening.start_time <= day_end)
            .options(
                joinedload(Reservation.user),
                joinedload(Reservation.seat),
                joinedload(Reservation.screening).options(
                    joinedload(Screening.movie),
                    joinedload(Screening.hall),
                ),
            )
            .all()
        )

        groups: dict[tuple, list[Reservation]] = defaultdict(list)
        for r in reservations:
            groups[(r.user_id, r.screening_id)].append(r)

        from notifications import notify_reservation_reminder

        for (_, _), group in groups.items():
            first = group[0]
            if not first.user:
                continue
            seats = [
                f"{r.seat.row}{r.seat.number}"
                for r in group
                if r.seat
            ]
            notify_reservation_reminder(
                user_name=f"{first.user.first_name} {first.user.last_name}",
                user_email=first.user.email or "",
                user_phone=first.user.phone or "",
                movie_title=first.screening.movie.title if first.screening and first.screening.movie else "Film",
                hall_name=first.screening.hall.name if first.screening and first.screening.hall else "—",
                start_time=first.screening.start_time if first.screening else None,
                seats=seats,
            )

        print(f"[SCHEDULER] Reminders sent for {len(groups)} reservation group(s) on {tomorrow}.")
    except Exception as exc:
        print(f"[SCHEDULER] Error sending reminders: {exc}")
    finally:
        db.close()


def create_scheduler() -> BackgroundScheduler:
    scheduler = BackgroundScheduler(timezone="Europe/Bucharest")
    scheduler.add_job(
        _send_reminders,
        CronTrigger(hour=10, minute=0, timezone="Europe/Bucharest"),
        id="daily_reminders",
        replace_existing=True,
        misfire_grace_time=3600,
    )
    return scheduler
