# VeloGarage

Track your bikes. Know when to wrench.

VeloGarage connects to your Strava account to automatically calculate mileage on each bike component — chain, cassette, tires, brake pads, and rotors — so you always know what needs service.

## Architecture

```
velogarage/
├── web/    # React + Vite + TypeScript — installable PWA (the app)
├── api/    # FastAPI (Python) — Strava OAuth proxy + garage storage
└── docs/   # GitHub Pages site: landing page + the built PWA (docs/app/)
```

- **web/** builds (`npm run build`) into **`docs/app/`**, which GitHub Pages serves as an installable web app at `https://deyshift.github.io/velogarage/app/`.
- **api/** runs on Render and talks to Strava (it holds the Strava client secret) and to Upstash Redis (durable per-athlete storage).

## Secrets / configuration

All of these are set as environment variables on the API host (Render → Environment):

| Variable | Notes |
|---|---|
| `STRAVA_CLIENT_ID` | From strava.com/settings/api. Public, but the web app never needs it — the API builds the authorize URL. |
| `STRAVA_CLIENT_SECRET` | **Server-side only.** Never ships to the browser. |
| `API_PUBLIC_URL` | The API's public URL, e.g. `https://velogarage.onrender.com`. Strava's Authorization Callback Domain must match its hostname. |
| `UPSTASH_REDIS_REST_URL` | Upstash Redis REST endpoint (durable garage storage). |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash Redis REST token. |
| `WEB_APP_URL` | Optional. Where web logins return to; defaults to the GitHub Pages app. |
| `ALLOWED_ORIGINS` | Optional. CORS allow-list; defaults to the web app's origin. |

## Getting started

### 1. Create a Strava API application

1. Go to https://www.strava.com/settings/api
2. Create an application.
3. Set **Authorization Callback Domain** to your API hostname (`localhost` for local dev).
4. Note your **Client ID** and **Client Secret**.

### 2. Run the API

```bash
cd api
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
# Fill in STRAVA_CLIENT_ID, STRAVA_CLIENT_SECRET, API_PUBLIC_URL
# (and UPSTASH_REDIS_REST_URL / _TOKEN to enable saving)
uvicorn main:app --reload
```

### 3. Run the web app

```bash
cd web
npm install
npm run dev
```

The web app points at the production API by default (`web/src/lib/api.ts`); change that constant to `http://localhost:8000` to develop against a local API.

## Deploying

- **API → Render:** Docker web service, root directory `api`. Set the env vars above. A `/health` endpoint (GET + HEAD) keeps it monitorable.
- **Web → GitHub Pages:** `cd web && npm run build` emits to `docs/app/` (committed); GitHub Pages is configured to serve from `docs/` on `main`.
- **Storage → Upstash Redis:** create a database (or reuse one — keys are namespaced `velogarage:`), and set its REST URL + token on Render.

## Component intervals

| Component | Default interval |
|---|---|
| Chain (wax) | 400 km |
| Chain (dry lube) | 175 km |
| Chain (wet lube) | 400 km |
| Chain (ceramic) | 650 km |
| Cassette | 8,000 km |
| Chainring | 15,000 km |
| Front tire | 4,000 km |
| Rear tire | 3,000 km |
| Brake pads | 2,000 km |
| Rotors | 10,000 km |

Defaults are editable per component, in miles or kilometers.

## Privacy

- The API holds the Strava client secret and acts as a stateless OAuth proxy.
- Your maintenance data (components + service log) is stored in your Upstash database, keyed to your Strava athlete id — nothing else is collected.
- Strava access/refresh tokens live in the browser (so you stay signed in) and are sent only to the API to talk to Strava on your behalf. VeloGarage only requests `activity:read_all` and `profile:read_all`; it never posts to or modifies your Strava account.
