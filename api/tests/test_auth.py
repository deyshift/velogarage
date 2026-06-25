"""auth_login builds a correct Strava authorize URL."""
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
