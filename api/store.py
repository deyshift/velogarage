"""
Durable storage for a user's garage (components + maintenance log), backed by
Upstash Redis via its REST API. Data is a single JSON blob per athlete, keyed
by Strava athlete id under a `velogarage:` namespace so it can share a Redis
database with other apps without collisions.

Configured via env vars (from the Upstash console, per database):
  UPSTASH_REDIS_REST_URL
  UPSTASH_REDIS_REST_TOKEN
"""
import json
import os
from typing import Any

import httpx

UPSTASH_URL = os.environ.get("UPSTASH_REDIS_REST_URL", "").rstrip("/")
UPSTASH_TOKEN = os.environ.get("UPSTASH_REDIS_REST_TOKEN", "")
KEY_PREFIX = "velogarage:garage:"


class StoreNotConfigured(Exception):
    """Raised when the Upstash env vars are not set."""


def is_configured() -> bool:
    return bool(UPSTASH_URL and UPSTASH_TOKEN)


async def _command(*args: str) -> Any:
    if not is_configured():
        raise StoreNotConfigured()
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            UPSTASH_URL,
            headers={"Authorization": f"Bearer {UPSTASH_TOKEN}"},
            json=list(args),
        )
        resp.raise_for_status()
        payload = resp.json()
        # Upstash returns command errors as a 200 with an {"error": ...} body.
        if "error" in payload:
            raise RuntimeError(f"Upstash error: {payload['error']}")
        return payload.get("result")


def _key(athlete_id: int | str) -> str:
    return f"{KEY_PREFIX}{athlete_id}"


async def get_garage(athlete_id: int | str) -> dict | None:
    raw = await _command("GET", _key(athlete_id))
    if not raw:
        return None
    return json.loads(raw)


async def set_garage(athlete_id: int | str, data: dict) -> None:
    await _command("SET", _key(athlete_id), json.dumps(data))
