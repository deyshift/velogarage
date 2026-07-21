"""auth_login builds a correct Strava authorize URL; auth_callback validates CSRF state."""
from unittest.mock import AsyncMock, patch
from urllib.parse import parse_qs, urlsplit

from fastapi.testclient import TestClient

import main

client = TestClient(main.app)


def test_auth_login_redirects_to_strava_authorize():
    r = client.get("/api/auth/login", follow_redirects=False)
    assert r.status_code in (302, 307)

    loc = r.headers["location"]
    assert loc.startswith(main.strava.STRAVA_AUTHORIZE_URL)

    q = parse_qs(urlsplit(loc).query)
    assert q["client_id"] == ["test-client-id"]
    assert q["redirect_uri"] == ["https://api.example.test/api/auth/callback"]
    assert q["response_type"] == ["code"]
    # scope carries both required Strava scopes
    assert set(q["scope"][0].split(",")) == {"activity:read_all", "profile:read_all"}


def test_auth_login_includes_state_in_url_and_cookie():
    r = client.get("/api/auth/login", follow_redirects=False)
    assert r.status_code in (302, 307)

    q = parse_qs(urlsplit(r.headers["location"]).query)
    assert "state" in q
    assert len(q["state"][0]) > 0
    assert "oauth_state" in r.cookies
    # URL state and cookie must match — a mismatch would cause every callback to fail
    assert q["state"][0] == r.cookies["oauth_state"]


def test_auth_callback_rejects_missing_state():
    r = client.get("/api/auth/callback?code=abc", follow_redirects=False)
    assert r.status_code in (302, 307)
    fragment = parse_qs(urlsplit(r.headers["location"]).fragment)
    assert fragment.get("error") == ["state_mismatch"]


def test_auth_callback_rejects_mismatched_state():
    with TestClient(main.app, cookies={"oauth_state": "correct"}) as c:
        r = c.get(
            "/api/auth/callback?code=abc&state=wrong",
            follow_redirects=False,
        )
    assert r.status_code in (302, 307)
    fragment = parse_qs(urlsplit(r.headers["location"]).fragment)
    assert fragment.get("error") == ["state_mismatch"]


def test_auth_callback_valid_roundtrip():
    fake_tokens = {
        "access_token": "acc",
        "refresh_token": "ref",
        "expires_at": 9999,
        "athlete": {"id": 42, "firstname": "Jo", "profile_medium": ""},
    }
    with patch.object(main.strava, "exchange_code", new=AsyncMock(return_value=fake_tokens)):
        with TestClient(main.app, cookies={"oauth_state": "test-state"}) as c:
            r = c.get(
                "/api/auth/callback?code=abc&state=test-state",
                follow_redirects=False,
            )
    assert r.status_code in (302, 307)
    fragment = parse_qs(urlsplit(r.headers["location"]).fragment)
    assert fragment.get("access_token") == ["acc"]
    assert fragment.get("athlete_id") == ["42"]
