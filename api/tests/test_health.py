"""/ and /health respond 200 to GET and HEAD for uptime monitors."""
from fastapi.testclient import TestClient

import main

client = TestClient(main.app)


def test_health_get():
    r = client.get("/health")
    assert r.status_code == 200
    assert r.json() == {"status": "ok"}


def test_health_head():
    r = client.head("/health")
    assert r.status_code == 200


def test_root_get():
    r = client.get("/")
    assert r.status_code == 200
    assert r.json() == {"status": "ok"}


def test_root_head():
    r = client.head("/")
    assert r.status_code == 200
