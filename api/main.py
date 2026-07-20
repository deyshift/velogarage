import os
import urllib.parse
import httpx
from fastapi import Body, FastAPI, Header, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse
from pydantic import BaseModel
from dotenv import load_dotenv
import strava
import store

load_dotenv()

CLIENT_ID = os.environ["STRAVA_CLIENT_ID"]
CLIENT_SECRET = os.environ["STRAVA_CLIENT_SECRET"]
# Public URL of this API (e.g. https://velogarage.onrender.com), used to
# build the OAuth redirect_uri that Strava sends the user back to.
API_PUBLIC_URL = os.environ["API_PUBLIC_URL"].rstrip("/")
# Where to send the user after a (PWA) login. Defaults to the GitHub Pages
# web app.
WEB_APP_URL = os.environ.get(
    "WEB_APP_URL", "https://deyshift.github.io/velogarage/app"
).rstrip("/")
# Strava OAuth scopes:
#   activity:read_all  — read activities (incl. private)
#   profile:read_all   — required for the athlete's bikes/gear to appear in
#                        the /athlete response (otherwise only a summary)
STRAVA_SCOPE = "activity:read_all,profile:read_all"
# Browser origin(s) allowed to call this API (CORS). Defaults to the web app's
# own origin so only the PWA can call it from a browser. Override with a
# comma-separated ALLOWED_ORIGINS env var (e.g. to add http://localhost:8081
# during local development).
_web = urllib.parse.urlsplit(WEB_APP_URL)
ALLOWED_ORIGINS = os.getenv(
    "ALLOWED_ORIGINS", f"{_web.scheme}://{_web.netloc}"
).split(",")

app = FastAPI(title="VeloGarage API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_methods=["*"],
    allow_headers=["*"],
)


class RefreshRequest(BaseModel):
    refresh_token: str


@app.get("/api/auth/login")
async def auth_login():
    """Redirect the user to Strava's OAuth authorize page to start login."""
    params = urllib.parse.urlencode(
        {
            "client_id": CLIENT_ID,
            "redirect_uri": f"{API_PUBLIC_URL}/api/auth/callback",
            "response_type": "code",
            "approval_prompt": "auto",
            "scope": STRAVA_SCOPE,
        }
    )
    return RedirectResponse(f"{strava.STRAVA_AUTHORIZE_URL}?{params}")


@app.get("/api/auth/callback")
async def auth_callback(
    code: str | None = Query(None),
    error: str | None = Query(None),
):
    """
    Strava redirects here after the user authorises the app. The tokens are
    handed back to the PWA in the URL *fragment* (kept out of server logs).
    Set Authorization Callback Domain in strava.com/settings/api to the
    hostname of API_PUBLIC_URL.
    """

    def redirect_back(query: str) -> RedirectResponse:
        return RedirectResponse(f"{WEB_APP_URL}/#{query}")

    if error or not code:
        # `error` is an attacker-controllable query param; don't reflect it
        # into the redirect URL. Strava only sends access_denied on this leg,
        # so surface a fixed code the PWA can show a generic message for.
        return redirect_back(urllib.parse.urlencode({"error": "access_denied"}))

    try:
        redirect_uri = f"{API_PUBLIC_URL}/api/auth/callback"
        tokens = await strava.exchange_code(CLIENT_ID, CLIENT_SECRET, code, redirect_uri)
    except strava.AthleteLimitError:
        return redirect_back(urllib.parse.urlencode({"error": "athletes_limit_exceeded"}))
    except Exception:
        return redirect_back(urllib.parse.urlencode({"error": "token_exchange_failed"}))

    athlete = tokens.get("athlete", {})
    params = urllib.parse.urlencode(
        {
            "access_token": tokens["access_token"],
            "refresh_token": tokens["refresh_token"],
            "expires_at": tokens["expires_at"],
            "athlete_id": athlete.get("id", ""),
            "athlete_name": athlete.get("firstname", ""),
            "athlete_photo": athlete.get("profile_medium", ""),
        }
    )
    return redirect_back(params)


@app.post("/api/auth/refresh")
async def auth_refresh(body: RefreshRequest):
    try:
        tokens = await strava.refresh_token(CLIENT_ID, CLIENT_SECRET, body.refresh_token)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
    return {
        "access_token": tokens["access_token"],
        "refresh_token": tokens["refresh_token"],
        "expires_at": tokens["expires_at"],
    }


@app.get("/api/strava/athlete")
async def get_athlete(authorization: str = Header(...)):
    access_token = authorization.removeprefix("Bearer ")
    try:
        return await strava.get_athlete(access_token)
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))


@app.get("/api/strava/activities")
async def get_activities(
    authorization: str = Header(...),
    after: int | None = Query(None),
    before: int | None = Query(None),
    page: int = Query(1, ge=1),
    per_page: int = Query(100, ge=1, le=200),
):
    access_token = authorization.removeprefix("Bearer ")
    try:
        return await strava.get_activities(access_token, after, before, page, per_page)
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))


async def _athlete_id(authorization: str) -> int:
    """Identify the caller by their Strava token (so one athlete can't read or
    write another's garage). Returns the authenticated Strava athlete id."""
    access_token = authorization.removeprefix("Bearer ")
    try:
        athlete = await strava.get_athlete(access_token)
    except httpx.HTTPStatusError as e:
        # 401 from Strava == bad/expired token; anything else is an upstream issue.
        if e.response.status_code == 401:
            raise HTTPException(status_code=401, detail="invalid Strava token")
        raise HTTPException(status_code=502, detail="Strava error")
    except Exception:
        # network/timeout talking to Strava — upstream failure, not auth.
        raise HTTPException(status_code=502, detail="Strava unavailable")
    athlete_id = athlete.get("id")
    if not athlete_id:
        raise HTTPException(status_code=401, detail="could not identify athlete")
    return athlete_id


@app.get("/api/garage")
async def read_garage(authorization: str = Header(...)):
    """Return the caller's stored garage (components + maintenance log)."""
    athlete_id = await _athlete_id(authorization)
    try:
        data = await store.get_garage(athlete_id)
    except store.StoreNotConfigured:
        raise HTTPException(status_code=503, detail="storage not configured")
    except Exception:
        raise HTTPException(status_code=502, detail="storage error")
    return data or {}


@app.put("/api/garage")
async def write_garage(authorization: str = Header(...), garage: dict = Body(...)):
    """Persist the caller's garage (components + maintenance log)."""
    athlete_id = await _athlete_id(authorization)
    try:
        await store.set_garage(athlete_id, garage)
    except store.StoreNotConfigured:
        raise HTTPException(status_code=503, detail="storage not configured")
    except Exception:
        raise HTTPException(status_code=502, detail="storage error")
    return {"ok": True}


# GET + HEAD so uptime monitors (e.g. UptimeRobot, which defaults to HEAD)
# can ping it to keep the free Render instance from sleeping.
@app.api_route("/health", methods=["GET", "HEAD"])
async def health():
    return {"status": "ok"}


# Some uptime monitors are pointed at the bare domain root instead of
# /health; without this, that 404s (there's no other route for "/") and
# trips false-positive downtime alerts.
@app.api_route("/", methods=["GET", "HEAD"])
async def root():
    return await health()
