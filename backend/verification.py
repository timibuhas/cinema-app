import random
import string
from datetime import datetime, timedelta

_store: dict[str, dict] = {}

EXPIRY_MINUTES = 10


def generate_and_store(email: str) -> str:
    code = "".join(random.choices(string.digits, k=6))
    _store[email.lower()] = {
        "code": code,
        "expires_at": datetime.utcnow() + timedelta(minutes=EXPIRY_MINUTES),
        "verified": False,
    }
    return code


def verify_code(email: str, code: str) -> bool:
    entry = _store.get(email.lower())
    if not entry:
        return False
    if datetime.utcnow() > entry["expires_at"]:
        _store.pop(email.lower(), None)
        return False
    if entry["code"] != code.strip():
        return False
    entry["verified"] = True
    return True


def is_verified(email: str) -> bool:
    entry = _store.get(email.lower())
    return bool(entry and entry.get("verified"))


def consume(email: str) -> None:
    _store.pop(email.lower(), None)
