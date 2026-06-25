"""Shared test setup.

`main` reads required Strava env vars at import time, so set placeholder
credentials before any test module imports it. These are set unconditionally
(not via setdefault) so the tests are deterministic regardless of any real
credentials in the developer's/CI environment or a local .env — e.g. the auth
test asserts the exact client_id/redirect_uri built from these. Also put the
api/ package root on sys.path so `import main` / `import store` work when pytest
runs from elsewhere.
"""
import os
import sys

API_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if API_ROOT not in sys.path:
    sys.path.insert(0, API_ROOT)

os.environ["STRAVA_CLIENT_ID"] = "test-client-id"
os.environ["STRAVA_CLIENT_SECRET"] = "test-secret"
os.environ["API_PUBLIC_URL"] = "https://api.example.test"
os.environ["WEB_APP_URL"] = "https://web.example.test/app"
