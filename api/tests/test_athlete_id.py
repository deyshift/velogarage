"""_athlete_id (exercised via GET /api/garage) maps Strava failures correctly:
a 401 from Strava means a bad/expired token (-> 401); anything else talking to
Strava is an upstream problem (-> 502)."""
import httpx
from fastapi.testclient import TestClient

import main

client = TestClient(main.app, raise_server_exceptions=False)


def _status_error(code: int) -> httpx.HTTPStatusError:
    req = httpx.Request("GET", "https://www.strava.com/api/v3/athlete")
    resp = httpx.Response(code, request=req)
    return httpx.HTTPStatusError("err", request=req, response=resp)


def test_strava_401_maps_to_401(monkeypatch):
    async def mock_get_athlete(_token):
        raise _status_error(401)

    monkeypatch.setattr(main.strava, "get_athlete", mock_get_athlete)
    r = client.get("/api/garage", headers={"Authorization": "Bearer bad"})
    assert r.status_code == 401


def test_strava_5xx_maps_to_502(monkeypatch):
    async def mock_get_athlete(_token):
        raise _status_error(500)

    monkeypatch.setattr(main.strava, "get_athlete", mock_get_athlete)
    r = client.get("/api/garage", headers={"Authorization": "Bearer x"})
    assert r.status_code == 502


def test_strava_timeout_maps_to_502(monkeypatch):
    async def mock_get_athlete(_token):
        raise httpx.TimeoutException("slow")

    monkeypatch.setattr(main.strava, "get_athlete", mock_get_athlete)
    r = client.get("/api/garage", headers={"Authorization": "Bearer x"})
    assert r.status_code == 502
