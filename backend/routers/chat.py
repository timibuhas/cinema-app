import json
import os
import re
from datetime import datetime
from typing import Any
from urllib import error, request
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import or_
from sqlalchemy.orm import Session, joinedload

from auth.dependencies import get_current_user
from database import get_db
from models import Hall, Movie, Reservation, Screening, Seat, User
from schemas.chat import ChatMutationRequest, ChatMutationResponse, ChatRequest, ChatResponse

router = APIRouter(prefix="/chat", tags=["Chat"])

OLLAMA_URL = os.getenv("OLLAMA_URL", "http://localhost:11434").rstrip("/")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "gemma3:4b")
OLLAMA_TIMEOUT_SECONDS = int(os.getenv("OLLAMA_TIMEOUT_SECONDS", "120"))
CHAT_ALLOW_NON_ADMIN_WRITES = os.getenv("CHAT_ALLOW_NON_ADMIN_WRITES", "1").strip().lower() in {
    "1",
    "true",
    "yes",
    "on",
}
CHAT_BACKEND_REVISION = "chat-router-2026-04-13-2"

ALLOWED_ACTIONS = {
    "none",
    "create_movie",
    "update_movie",
    "create_hall",
    "update_hall",
    "create_screening",
    "update_screening",
    "create_reservation",
    "update_reservation",
}
UUID_TEXT_PATTERN = r"[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}"


def _utc_iso(value: datetime | None) -> str | None:
    return value.isoformat() if value else None


def _parse_uuid(value: Any, field: str) -> UUID:
    try:
        return UUID(str(value))
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Invalid UUID for '{field}'") from exc


def _parse_int(value: Any, field: str) -> int:
    try:
        return int(value)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Invalid integer for '{field}'") from exc


def _parse_datetime(value: Any, field: str) -> datetime:
    if not isinstance(value, str):
        raise HTTPException(status_code=400, detail=f"Invalid datetime for '{field}'")
    try:
        parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=f"Invalid datetime for '{field}'") from exc
    return parsed.replace(tzinfo=None) if parsed.tzinfo else parsed


def _call_ollama(messages: list[dict[str, str]], json_mode: bool = False) -> str:
    payload: dict[str, Any] = {
        "model": OLLAMA_MODEL,
        "messages": messages,
        "stream": False,
    }
    if json_mode:
        payload["format"] = "json"

    req = request.Request(
        url=f"{OLLAMA_URL}/api/chat",
        data=json.dumps(payload).encode("utf-8"),
        method="POST",
        headers={"Content-Type": "application/json"},
    )

    try:
        with request.urlopen(req, timeout=OLLAMA_TIMEOUT_SECONDS) as res:
            raw = res.read().decode("utf-8")
    except error.HTTPError as exc:
        body = exc.read().decode("utf-8", errors="ignore")
        detail = body[:400] if body else str(exc.reason)
        raise HTTPException(status_code=502, detail=f"Ollama request failed ({exc.code}): {detail}") from exc
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Cannot reach Ollama at {OLLAMA_URL}: {exc}") from exc

    try:
        parsed = json.loads(raw)
    except json.JSONDecodeError as exc:
        raise HTTPException(status_code=502, detail="Invalid JSON from Ollama") from exc

    content = parsed.get("message", {}).get("content")
    if not content:
        raise HTTPException(status_code=502, detail="Empty response from Ollama")
    return content.strip()


def _call_ollama_json(messages: list[dict[str, str]]) -> dict[str, Any]:
    raw = _call_ollama(messages, json_mode=True).strip()
    if raw.startswith("```"):
        lines = raw.splitlines()
        if len(lines) >= 3:
            raw = "\n".join(lines[1:-1]).strip()
    try:
        parsed = json.loads(raw)
    except json.JSONDecodeError as exc:
        raise HTTPException(status_code=502, detail="Ollama did not return valid JSON plan") from exc
    if not isinstance(parsed, dict):
        raise HTTPException(status_code=502, detail="JSON plan must be an object")
    return parsed


def _build_database_context(db: Session, current_user: dict[str, Any]) -> dict[str, Any]:
    role = current_user.get("role", "user")
    raw_user_id = current_user.get("sub")
    user_id = None
    try:
        user_id = UUID(str(raw_user_id)) if raw_user_id else None
    except ValueError:
        user_id = None

    now = datetime.utcnow()
    movies = db.query(Movie).order_by(Movie.title.asc()).limit(80).all()
    halls = db.query(Hall).order_by(Hall.name.asc()).limit(50).all()
    screenings = (
        db.query(Screening)
        .options(joinedload(Screening.movie), joinedload(Screening.hall))
        .filter(Screening.start_time >= now)
        .order_by(Screening.start_time.asc())
        .limit(120)
        .all()
    )

    reservations_q = (
        db.query(Reservation)
        .options(
            joinedload(Reservation.user),
            joinedload(Reservation.screening).joinedload(Screening.movie),
            joinedload(Reservation.screening).joinedload(Screening.hall),
            joinedload(Reservation.seat),
        )
        .order_by(Reservation.reserved_at.desc())
    )
    if role != "admin" and user_id:
        reservations_q = reservations_q.filter(Reservation.user_id == user_id)
    reservations = reservations_q.limit(120).all()

    return {
        "generated_at_utc": _utc_iso(now),
        "user_role": role,
        "movies": [{"id": str(m.id), "title": m.title, "duration": m.duration} for m in movies],
        "halls": [{"id": str(h.id), "name": h.name, "capacity": h.capacity} for h in halls],
        "screenings": [
            {
                "id": str(s.id),
                "movie_id": str(s.movie_id),
                "movie": s.movie.title if s.movie else None,
                "hall_id": str(s.hall_id),
                "hall": s.hall.name if s.hall else None,
                "start_time": _utc_iso(s.start_time),
            }
            for s in screenings
        ],
        "reservations": [
            {
                "id": str(r.id),
                "user_id": str(r.user_id),
                "user": f"{r.user.first_name} {r.user.last_name}" if r.user else None,
                "movie": r.screening.movie.title if r.screening and r.screening.movie else None,
                "hall": r.screening.hall.name if r.screening and r.screening.hall else None,
                "screening_id": str(r.screening_id),
                "seat_id": str(r.seat_id),
                "seat": f"{r.seat.row}{r.seat.number}" if r.seat else None,
                "reserved_at": _utc_iso(r.reserved_at),
            }
            for r in reservations
        ],
    }


def _default_clarification(action: str, missing: list[str], is_admin: bool) -> str:
    if action == "create_reservation":
        if is_admin:
            return "To create a reservation, tell me: user (email/name), movie, hall, screening date+time, and seat (example A5)."
        return "To create your reservation, tell me: movie, hall, screening date+time, and seat (example A5)."
    if action == "update_reservation":
        if is_admin:
            return "To update a reservation, tell me reservation id and what to change (user/movie/hall/screening/seat)."
        return "To update your reservation, tell me reservation id and what to change (movie/hall/screening/seat)."
    if missing:
        return "I need more details before writing to DB: " + ", ".join(missing)
    return "Please provide more details for the database change."


def _looks_like_write_request(message: str) -> bool:
    lower = message.lower()
    write_keywords = (
        "create",
        "add",
        "insert",
        "update",
        "modify",
        "change",
        "delete",
        "remove",
        "reserve",
        "reservation",
        "book",
    )
    return any(keyword in lower for keyword in write_keywords)


def _extract_named_uuid(text: str, field_name: str) -> str | None:
    match = re.search(rf"\b{re.escape(field_name)}\b\s*[:=]?\s*({UUID_TEXT_PATTERN})", text, flags=re.IGNORECASE)
    if match:
        return match.group(1)
    return None


def _apply_reservation_fallback(plan: dict[str, Any], message: str) -> dict[str, Any]:
    if plan.get("action") != "none":
        return plan

    lower = message.lower()
    if not any(token in lower for token in ("reservation", "reserve", "book")):
        return plan

    data: dict[str, Any] = {}
    reservation_id = _extract_named_uuid(message, "reservation_id") or _extract_named_uuid(message, "id")
    screening_id = _extract_named_uuid(message, "screening_id")
    seat_id = _extract_named_uuid(message, "seat_id")
    if reservation_id:
        data["id"] = reservation_id
    if screening_id:
        data["screening_id"] = screening_id
    if seat_id:
        data["seat_id"] = seat_id

    seat_label_match = re.search(r"\bseat\s*[:=]?\s*([A-Za-z]+\d+)\b", message, flags=re.IGNORECASE)
    if seat_label_match and "seat_id" not in data:
        data["seat"] = seat_label_match.group(1).upper()

    is_update = any(token in lower for token in ("update", "modify", "change"))
    action = "update_reservation" if is_update else "create_reservation"

    missing: list[str] = []
    if action == "update_reservation" and "id" not in data:
        missing.append("reservation id")
    if "screening_id" not in data and not any(token in lower for token in ("movie", "hall", "start_time", "screening_time")):
        missing.append("screening_id or movie+hall+start_time")
    if "seat_id" not in data and "seat" not in data:
        missing.append("seat_id or seat label")

    return {
        "intent": "needs_clarification" if missing else "mutation",
        "action": action,
        "data": data,
        "missing_fields": missing,
        "question": "",
    }


def _plan_action(instruction: str, history: list[Any], db: Session, is_admin: bool) -> dict[str, Any]:
    planning_context = _build_database_context(db, {"role": "admin" if is_admin else "user", "sub": None})
    messages: list[dict[str, str]] = [
        {
            "role": "system",
            "content": (
                "Return strict JSON with keys: intent, action, data, missing_fields, clarification_question.\n"
                "intent: qa | mutation | needs_clarification\n"
                "action must be one of: " + ", ".join(sorted(ALLOWED_ACTIONS)) + "\n"
                "Rules:\n"
                "- qa for read-only questions.\n"
                "- mutation for complete create/update requests.\n"
                "- needs_clarification if details are missing.\n"
                "- For create_reservation require (admin: user + screening + seat) or (user: screening + seat).\n"
                "- screening can be screening_id or movie+hall+start_time.\n"
                "- seat can be seat_id or seat_label like A5.\n"
                "- Never output SQL.\n"
            ),
        },
        {"role": "system", "content": f"is_admin={str(is_admin).lower()}"},
        {"role": "system", "content": f"DB context JSON:\n{json.dumps(planning_context, ensure_ascii=False)}"},
    ]
    for msg in history[-20:]:
        c = msg.content.strip()
        if c:
            messages.append({"role": msg.role, "content": c})
    messages.append({"role": "user", "content": instruction.strip()})

    plan = _call_ollama_json(messages)
    intent = str(plan.get("intent", "qa")).lower().strip()
    if intent not in {"qa", "mutation", "needs_clarification"}:
        intent = "qa"
    action = str(plan.get("action", "none")).strip()
    if action not in ALLOWED_ACTIONS:
        action = "none"
    data = plan.get("data", {})
    if not isinstance(data, dict):
        data = {}
    missing = plan.get("missing_fields", [])
    if not isinstance(missing, list):
        missing = []
    question = str(plan.get("clarification_question", "")).strip()
    if action != "none" and intent == "qa":
        intent = "mutation"
    if action != "none" and missing:
        intent = "needs_clarification"
    return {"intent": intent, "action": action, "data": data, "missing_fields": missing, "question": question}


def _resolve_user_id(data: dict[str, Any], db: Session) -> UUID | None:
    if data.get("user_id"):
        return _parse_uuid(data["user_id"], "user_id")
    email = str(data.get("user_email") or "").strip()
    if email:
        user = db.query(User).filter(User.email == email).first()
        if not user:
            raise HTTPException(status_code=404, detail=f"User '{email}' not found")
        return user.id
    name = str(data.get("user") or data.get("user_name") or "").strip()
    if name:
        parts = name.split()
        if len(parts) >= 2:
            first = parts[0]
            last = " ".join(parts[1:])
            matches = db.query(User).filter(User.first_name.ilike(first), User.last_name.ilike(last)).limit(2).all()
        else:
            matches = db.query(User).filter(or_(User.first_name.ilike(name), User.last_name.ilike(name))).limit(2).all()
        if len(matches) == 1:
            return matches[0].id
        if len(matches) > 1:
            raise HTTPException(status_code=400, detail=f"User '{name}' is ambiguous")
        raise HTTPException(status_code=404, detail=f"User '{name}' not found")
    return None


def _resolve_screening_id(data: dict[str, Any], db: Session) -> UUID | None:
    if data.get("screening_id"):
        return _parse_uuid(data["screening_id"], "screening_id")
    movie = str(data.get("movie") or data.get("movie_title") or "").strip()
    hall = str(data.get("hall") or data.get("hall_name") or "").strip()
    start = str(data.get("start_time") or data.get("screening_time") or "").strip()
    if not (movie or hall or start):
        return None
    q = db.query(Screening).join(Movie, Screening.movie_id == Movie.id).join(Hall, Screening.hall_id == Hall.id)
    if movie:
        q = q.filter(Movie.title.ilike(f"%{movie}%"))
    if hall:
        q = q.filter(Hall.name.ilike(f"%{hall}%"))
    if start:
        q = q.filter(Screening.start_time == _parse_datetime(start, "start_time"))
    matches = q.limit(2).all()
    if len(matches) == 1:
        return matches[0].id
    if len(matches) > 1:
        raise HTTPException(status_code=400, detail="Screening is ambiguous")
    raise HTTPException(status_code=404, detail="No screening found for provided details")


def _resolve_seat_id(data: dict[str, Any], db: Session, screening_id: UUID | None) -> UUID | None:
    if data.get("seat_id"):
        return _parse_uuid(data["seat_id"], "seat_id")
    label = str(data.get("seat") or data.get("seat_label") or "").strip().upper().replace(" ", "")
    if not label:
        return None
    if not screening_id:
        raise HTTPException(status_code=400, detail="Seat label requires screening information")
    screening = db.query(Screening).filter(Screening.id == screening_id).first()
    if not screening:
        raise HTTPException(status_code=404, detail="Screening not found")
    match = re.match(r"^([A-Z]+)(\d+)$", label)
    if not match:
        raise HTTPException(status_code=400, detail="Seat format must be like A5")
    row = match.group(1)
    number = int(match.group(2))
    seat = db.query(Seat).filter(Seat.hall_id == screening.hall_id, Seat.row.ilike(row), Seat.number == number).first()
    if not seat:
        raise HTTPException(status_code=404, detail=f"Seat {row}{number} not found")
    return seat.id


def _current_user_uuid(current_user: dict[str, Any]) -> UUID:
    raw_sub = current_user.get("sub")
    try:
        return UUID(str(raw_sub))
    except Exception as exc:
        raise HTTPException(status_code=401, detail="Invalid authenticated user id") from exc


def _ensure_seat_matches_screening(db: Session, screening_id: UUID, seat_id: UUID) -> None:
    screening = db.query(Screening).filter(Screening.id == screening_id).first()
    if not screening:
        raise HTTPException(status_code=404, detail="Screening not found")
    seat = db.query(Seat).filter(Seat.id == seat_id).first()
    if not seat:
        raise HTTPException(status_code=404, detail="Seat not found")
    if seat.hall_id != screening.hall_id:
        raise HTTPException(status_code=400, detail="Seat does not belong to the screening hall")


def _execute_action(action: str, data: dict[str, Any], db: Session, current_user: dict[str, Any]) -> str:
    is_admin = current_user.get("role") == "admin"
    can_manage_all_records = is_admin or CHAT_ALLOW_NON_ADMIN_WRITES
    current_user_id = _current_user_uuid(current_user)
    admin_only_actions = {
        "create_movie",
        "update_movie",
        "create_hall",
        "update_hall",
        "create_screening",
        "update_screening",
    }
    if action in admin_only_actions and not can_manage_all_records:
        raise HTTPException(status_code=403, detail="Only admin users can change movies, halls, and screenings")

    if action == "create_movie":
        title = str(data.get("title", "")).strip()
        if not title:
            raise HTTPException(status_code=400, detail="Missing title")
        movie = Movie(title=title, description=data.get("description"), duration=data.get("duration"), image_url=data.get("image_url"))
        db.add(movie)
        db.commit()
        db.refresh(movie)
        return f"Created movie '{movie.title}'."

    if action == "update_movie":
        movie = db.query(Movie).filter(Movie.id == _parse_uuid(data.get("id"), "id")).first()
        if not movie:
            raise HTTPException(status_code=404, detail="Movie not found")
        for field in ("title", "description", "image_url", "duration"):
            if field in data:
                setattr(movie, field, data.get(field))
        db.commit()
        return f"Updated movie '{movie.title}'."

    if action == "create_hall":
        name = str(data.get("name", "")).strip()
        if not name:
            raise HTTPException(status_code=400, detail="Missing hall name")
        hall = Hall(name=name, capacity=_parse_int(data.get("capacity"), "capacity"))
        db.add(hall)
        db.commit()
        db.refresh(hall)
        return f"Created hall '{hall.name}'."

    if action == "update_hall":
        hall = db.query(Hall).filter(Hall.id == _parse_uuid(data.get("id"), "id")).first()
        if not hall:
            raise HTTPException(status_code=404, detail="Hall not found")
        if "name" in data:
            hall.name = data.get("name")
        if "capacity" in data:
            hall.capacity = _parse_int(data.get("capacity"), "capacity")
        db.commit()
        return f"Updated hall '{hall.name}'."

    if action == "create_screening":
        movie_id = _parse_uuid(data.get("movie_id"), "movie_id")
        hall_id = _parse_uuid(data.get("hall_id"), "hall_id")
        start_time = _parse_datetime(data.get("start_time"), "start_time")
        screening = Screening(movie_id=movie_id, hall_id=hall_id, start_time=start_time)
        db.add(screening)
        db.commit()
        db.refresh(screening)
        return f"Created screening {screening.id}."

    if action == "update_screening":
        screening = db.query(Screening).filter(Screening.id == _parse_uuid(data.get("id"), "id")).first()
        if not screening:
            raise HTTPException(status_code=404, detail="Screening not found")
        if "movie_id" in data:
            screening.movie_id = _parse_uuid(data.get("movie_id"), "movie_id")
        if "hall_id" in data:
            screening.hall_id = _parse_uuid(data.get("hall_id"), "hall_id")
        if "start_time" in data:
            screening.start_time = _parse_datetime(data.get("start_time"), "start_time")
        db.commit()
        return f"Updated screening {screening.id}."

    if action == "create_reservation":
        user_id = _resolve_user_id(data, db) if can_manage_all_records else current_user_id
        if not user_id:
            user_id = current_user_id
        screening_id = _resolve_screening_id(data, db)
        seat_id = _resolve_seat_id(data, db, screening_id)
        if not user_id or not screening_id or not seat_id:
            raise HTTPException(status_code=400, detail="Missing reservation details")
        _ensure_seat_matches_screening(db, screening_id, seat_id)
        exists = db.query(Reservation).filter(Reservation.screening_id == screening_id, Reservation.seat_id == seat_id).first()
        if exists:
            raise HTTPException(status_code=409, detail="Seat already reserved")
        reservation = Reservation(user_id=user_id, screening_id=screening_id, seat_id=seat_id)
        db.add(reservation)
        db.commit()
        db.refresh(reservation)
        return f"Created reservation {reservation.id}."

    if action == "update_reservation":
        reservation = db.query(Reservation).filter(Reservation.id == _parse_uuid(data.get("id"), "id")).first()
        if not reservation:
            raise HTTPException(status_code=404, detail="Reservation not found")
        if not can_manage_all_records and reservation.user_id != current_user_id:
            raise HTTPException(status_code=403, detail="You can update only your own reservations")

        target_user_id = reservation.user_id
        target_screening_id = reservation.screening_id
        target_seat_id = reservation.seat_id

        if can_manage_all_records and any(key in data for key in ("user_id", "user_email", "user", "user_name")):
            user_id = _resolve_user_id(data, db)
            if user_id:
                target_user_id = user_id
        if any(key in data for key in ("screening_id", "movie", "movie_title", "hall", "hall_name", "start_time", "screening_time")):
            screening_id = _resolve_screening_id(data, db)
            if screening_id:
                target_screening_id = screening_id
        if any(key in data for key in ("seat_id", "seat", "seat_label")):
            seat_id = _resolve_seat_id(data, db, target_screening_id)
            if seat_id:
                target_seat_id = seat_id

        _ensure_seat_matches_screening(db, target_screening_id, target_seat_id)
        exists = (
            db.query(Reservation)
            .filter(
                Reservation.screening_id == target_screening_id,
                Reservation.seat_id == target_seat_id,
                Reservation.id != reservation.id,
            )
            .first()
        )
        if exists:
            raise HTTPException(status_code=409, detail="Seat already reserved")

        reservation.user_id = target_user_id
        reservation.screening_id = target_screening_id
        reservation.seat_id = target_seat_id
        db.commit()
        return f"Updated reservation {reservation.id}."

    raise HTTPException(status_code=400, detail="No executable action")


@router.get("/health")
def chat_health():
    return {
        "status": "ok",
        "model": OLLAMA_MODEL,
        "auto_mutation": True,
        "allow_non_admin_writes": CHAT_ALLOW_NON_ADMIN_WRITES,
        "revision": CHAT_BACKEND_REVISION,
    }


@router.post("/ask", response_model=ChatResponse)
def ask_chatbot(payload: ChatRequest, db: Session = Depends(get_db), current_user: dict[str, Any] = Depends(get_current_user)):
    is_admin = current_user.get("role") == "admin"
    can_manage_all_records = is_admin or CHAT_ALLOW_NON_ADMIN_WRITES
    user_allowed_mutations = {"create_reservation", "update_reservation"}

    if payload.use_database:
        plan = _plan_action(payload.message, payload.history, db, is_admin=can_manage_all_records)
        plan = _apply_reservation_fallback(plan, payload.message)
        if plan["intent"] in {"mutation", "needs_clarification"} or plan["action"] != "none":
            if not can_manage_all_records and plan["action"] not in user_allowed_mutations:
                return ChatResponse(
                    answer="I can read data for you. For writes, non-admin users can only create/update their own reservations.",
                    model=OLLAMA_MODEL,
                    used_database=True,
                )
            if plan["action"] == "none" or plan["missing_fields"] or plan["intent"] == "needs_clarification":
                question = plan["question"] or _default_clarification(
                    plan["action"],
                    plan["missing_fields"],
                    is_admin=can_manage_all_records,
                )
                return ChatResponse(answer=question, model=OLLAMA_MODEL, used_database=True)
            try:
                summary = _execute_action(plan["action"], plan["data"], db, current_user=current_user)
            except HTTPException as exc:
                return ChatResponse(
                    answer=f"I need more details before executing: {exc.detail}",
                    model=OLLAMA_MODEL,
                    used_database=True,
                )
            return ChatResponse(
                answer=summary + "\nTell me the next change if needed.",
                model=OLLAMA_MODEL,
                used_database=True,
            )
        if _looks_like_write_request(payload.message):
            question = _default_clarification("none", [], is_admin=can_manage_all_records)
            return ChatResponse(answer=question, model=OLLAMA_MODEL, used_database=True)

    db_context = _build_database_context(db, current_user) if payload.use_database else {}
    messages: list[dict[str, str]] = [
        {
            "role": "system",
            "content": (
                "You are a cinema assistant. Use DB context as source of truth. "
                "If data is missing, say so clearly."
            ),
        }
    ]
    if payload.use_database:
        messages.append({"role": "system", "content": f"DB context JSON:\n{json.dumps(db_context, ensure_ascii=False)}"})
    for msg in payload.history[-20:]:
        content = msg.content.strip()
        if content:
            messages.append({"role": msg.role, "content": content})
    messages.append({"role": "user", "content": payload.message.strip()})

    answer = _call_ollama(messages)
    return ChatResponse(answer=answer, model=OLLAMA_MODEL, used_database=payload.use_database)


@router.post("/mutate", response_model=ChatMutationResponse)
def mutate_database_with_chat(
    payload: ChatMutationRequest,
    db: Session = Depends(get_db),
    current_user: dict[str, Any] = Depends(get_current_user),
):
    if current_user.get("role") != "admin" and not CHAT_ALLOW_NON_ADMIN_WRITES:
        raise HTTPException(status_code=403, detail="Only admin users can execute database writes.")

    plan = _plan_action(
        payload.instruction,
        payload.history,
        db,
        is_admin=(current_user.get("role") == "admin" or CHAT_ALLOW_NON_ADMIN_WRITES),
    )
    if plan["action"] == "none" or plan["missing_fields"]:
        question = plan["question"] or _default_clarification(plan["action"], plan["missing_fields"], is_admin=True)
        return ChatMutationResponse(success=True, executed=False, action=plan["action"], summary="Clarification needed", detail=question)

    if not payload.execute:
        return ChatMutationResponse(
            success=True,
            executed=False,
            action=plan["action"],
            summary="Planned action",
            detail=f"Payload: {json.dumps(plan['data'], ensure_ascii=False)}",
        )

    summary = _execute_action(plan["action"], plan["data"], db, current_user=current_user)
    return ChatMutationResponse(success=True, executed=True, action=plan["action"], summary=summary, detail=None)
