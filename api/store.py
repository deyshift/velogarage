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

KEY_PREFIX = "velogarage:garage:"


class StoreNotConfigured(Exception):
    """Raised when the Upstash env vars are not set."""


def _config() -> tuple[str, str]:
    """Read Upstash credentials lazily, so a .env loaded after import (and any
    runtime env changes) are picked up."""
    return (
        os.environ.get("UPSTASH_REDIS_REST_URL", "").rstrip("/"),
        os.environ.get("UPSTASH_REDIS_REST_TOKEN", ""),
    )


def is_configured() -> bool:
    url, token = _config()
    return bool(url and token)


async def _command(*args: str) -> Any:
    url, token = _config()
    if not (url and token):
        raise StoreNotConfigured()
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            url,
            headers={"Authorization": f"Bearer {token}"},
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
