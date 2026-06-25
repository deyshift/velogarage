"""store key namespacing + the StoreNotConfigured -> 503 / other -> 502 mapping."""
import asyncio
import json

import pytest
from fastapi.testclient import TestClient

import main
import store

client = TestClient(main.app, raise_server_exceptions=False)


def test_key_is_namespaced():
    assert store._key(123) == "velogarage:garage:123"
    assert store.KEY_PREFIX == "velogarage:garage:"


def test_unconfigured_store_raises(monkeypatch):
    monkeypatch.delenv("UPSTASH_REDIS_REST_URL", raising=False)
    monkeypatch.delenv("UPSTASH_REDIS_REST_TOKEN", raising=False)
    assert store.is_configured() is False
    with pytest.raises(store.StoreNotConfigured):
        asyncio.run(store.get_garage(1))


def test_set_garage_sends_namespaced_key(monkeypatch):
    """With Upstash configured (httpx mocked), SET targets the namespaced key."""
    captured: dict = {}

    class MockResponse:
        def raise_for_status(self):
            return None

        def json(self):
            return {"result": "OK"}

    class MockClient:
        async def __aenter__(self):
            return self

        async def __aexit__(self, *_a):
            return False

        async def post(self, _url, headers=None, json=None):
            captured["body"] = json
            return MockResponse()

    monkeypatch.setenv("UPSTASH_REDIS_REST_URL", "https://upstash.example.test")
    monkeypatch.setenv("UPSTASH_REDIS_REST_TOKEN", "token")
    monkeypatch.setattr(store.httpx, "AsyncClient", MockClient)

    asyncio.run(store.set_garage(123, {"components": []}))

    assert captured["body"][0] == "SET"
    assert captured["body"][1] == "velogarage:garage:123"
    assert json.loads(captured["body"][2]) == {"components": []}


def _athlete_ok():
    async def mock_get_athlete(_token):
        return {"id": 99}

    return mock_get_athlete


def test_garage_store_not_configured_maps_to_503(monkeypatch):
    monkeypatch.setattr(main.strava, "get_athlete", _athlete_ok())

    async def mock_get_garage(_athlete_id):
        raise store.StoreNotConfigured()

    monkeypatch.setattr(main.store, "get_garage", mock_get_garage)
    r = client.get("/api/garage", headers={"Authorization": "Bearer x"})
    assert r.status_code == 503


def test_garage_store_error_maps_to_502(monkeypatch):
    monkeypatch.setattr(main.strava, "get_athlete", _athlete_ok())

    async def mock_get_garage(_athlete_id):
        raise RuntimeError("upstash boom")

    monkeypatch.setattr(main.store, "get_garage", mock_get_garage)
    r = client.get("/api/garage", headers={"Authorization": "Bearer x"})
    assert r.status_code == 502
