import os
import urllib.parse
from fastapi import FastAPI, Header, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse
from pydantic import BaseModel
from dotenv import load_dotenv
import strava

load_dotenv()

CLIENT_ID = os.environ["STRAVA_CLIENT_ID"]
CLIENT_SECRET = os.environ["STRAVA_CLIENT_SECRET"]
# Public URL of this API (e.g. https://velogarage.onrender.com), used to
# build the OAuth redirect_uri that Strava sends the user back to.
API_PUBLIC_URL = os.environ["API_PUBLIC_URL"].rstrip("/")
# Where to send the user after a *web* (PWA) login. The native app uses the
# velogarage:// deep link instead. Defaults to the GitHub Pages web app.
WEB_APP_URL = os.environ.get(
    "WEB_APP_URL", "https://deyshift.github.io/velogarage/app"
).rstrip("/")
# Strava OAuth scopes:
#   activity:read_all  — read activities (incl. private)
#   profile:read_all   — required for the athlete's bikes/gear to appear in
#                        the /athlete response (otherwise only a summary)
STRAVA_SCOPE = "activity:read_all,profile:read_all"
# Deep link the native Expo app registers; web logins go to WEB_APP_URL instead.
NATIVE_AUTH_REDIRECT = "velogarage://auth"
# Browser origin(s) allowed to call this API (CORS). Defaults to the web app's
# own origin so only the PWA can call it from a browser. Override with a
# comma-separated ALLOWED_ORIGINS env var (e.g. to add http://localhost:8081
# during local development). Non-browser clients (the native app) ignore CORS.
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
async def auth_login(state: str = Query("web")):
    """Redirect the user to Strava's OAuth authorize page to start login."""
    params = urllib.parse.urlencode(
        {
            "client_id": CLIENT_ID,
            "redirect_uri": f"{API_PUBLIC_URL}/api/auth/callback",
            "response_type": "code",
            "approval_prompt": "auto",
            "scope": STRAVA_SCOPE,
            "state": state,
        }
    )
    return RedirectResponse(f"{strava.STRAVA_AUTHORIZE_URL}?{params}")


@app.get("/api/auth/callback")
async def auth_callback(
    code: str | None = Query(None),
    error: str | None = Query(None),
    state: str = Query(""),
):
    """
    Strava redirects here after the user authorises the app. `state` decides
    where the user goes back to:
      "web" -> the PWA, with tokens in the URL *fragment* (kept out of logs)
      else  -> the native Expo app via the velogarage:// deep link
    Set Authorization Callback Domain in strava.com/settings/api to the
    hostname of API_PUBLIC_URL.
    """

    def redirect_back(query: str) -> RedirectResponse:
        if state == "web":
            return RedirectResponse(f"{WEB_APP_URL}/#{query}")
        return RedirectResponse(f"{NATIVE_AUTH_REDIRECT}?{query}")

    if error or not code:
        return redirect_back(urllib.parse.urlencode({"error": error or "access_denied"}))

    try:
        redirect_uri = f"{API_PUBLIC_URL}/api/auth/callback"
        tokens = await strava.exchange_code(CLIENT_ID, CLIENT_SECRET, code, redirect_uri)
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


# GET + HEAD so uptime monitors (e.g. UptimeRobot, which defaults to HEAD)
# can ping it to keep the free Render instance from sleeping.
@app.api_route("/health", methods=["GET", "HEAD"])
async def health():
    return {"status": "ok"}
