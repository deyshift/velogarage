"""Shared test setup.

`main` reads required Strava env vars at import time, so populate placeholder
credentials before any test module imports it. Also put the api/ package root on
sys.path so `import main` / `import store` work when pytest runs from elsewhere.
"""
import os
import sys

API_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if API_ROOT not in sys.path:
    sys.path.insert(0, API_ROOT)

os.environ.setdefault("STRAVA_CLIENT_ID", "test-client-id")
os.environ.setdefault("STRAVA_CLIENT_SECRET", "test-secret")
os.environ.setdefault("API_PUBLIC_URL", "https://api.example.test")
os.environ.setdefault("WEB_APP_URL", "https://web.example.test/app")
