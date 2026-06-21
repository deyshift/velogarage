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

## Configuration

The API is configured entirely through environment variables — see **[`api/.env.example`](api/.env.example)** for the full list and descriptions. Locally, copy it to `api/.env`; in production, set the same variables on the host (Render → Environment).

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

Most components wear by distance, calculated from the bike's Strava mileage:

| Component | Default interval |
|---|---|
| Clean & wax drivetrain (hot melt) | 320 mi |
| Clean & wax drivetrain (+ Endurance chip) | 465 mi |
| Clean & wax drivetrain (+ Speed chip) | 125 mi |
| Clean & lube drivetrain (dry lube) | 125 mi |
| Clean & lube drivetrain (wet lube) | 182 mi |
| Clean & lube drivetrain (ceramic) | 405 mi |
| Cassette | 8,000 km |
| Chainring | 15,000 km |
| Inflate and Inspect Tires | 62 mi (~100 km) |
| Brake pads | 2,000 km |
| Rotors | 10,000 km |

Defaults are editable per component, in miles or kilometers.

### How the chain default is chosen

Riders rarely know the "right" chain interval, so VeloGarage pre-fills a
researched, attribute-aware mileage you can override. The real signal is chain
*wear* (replace ~0.5% for 11/12-speed), but that can't be measured when adding a
component, so we key off what the rider knows up front — the lube, and for hot
wax which [Silca additive chip](https://silca.cc/products/performance-chips) is
in the pot:

- **Wax (hot melt):** ~320 mi. Silca's Secret Chain Blend averages
  [~250–350 mi per application](https://silca.cc/products/secret-chain-wax-blend).
- **Wax + Endurance chip:** 465 mi (Silca claims up to ~800 mi; we keep a
  conservative default).
- **Wax + Speed chip:** 125 mi — a race-day additive good for events up to
  ~200 km, trading longevity for efficiency.
- **Dry lube:** 125 mi (reapply roughly every 100–150 mi in dry conditions).
- **Wet lube:** 182 mi. **Ceramic:** 405 mi.

Heuristic lives in [`web/src/lib/catalog.ts`](web/src/lib/catalog.ts)
(`chainIntervalKm`). **Tires** stay on a flat inspect-and-inflate cadence
(62 mi) rather than an attribute-aware *replacement* mileage: that cadence is
about checking pressure, which doesn't vary by compound/use, so a category
picker wouldn't improve the default.

### Whole-bike reminders (time-based)

Two maintenance reminders are tracked on a calendar cadence instead of mileage,
and are added automatically the first time you open each bike:

| Reminder | Default interval |
|---|---|
| Check and torque bolts | 180 days |
| Yearly inspection and service | 365 days |

Marking one "done" records today as the last service and restarts the countdown.
Their intervals are editable per bike, in days.

## Privacy

- The API holds the Strava client secret and acts as a stateless OAuth proxy.
- Your maintenance data (components + service log) is stored in your Upstash database, keyed to your Strava athlete id — nothing else is collected.
- Strava access/refresh tokens live in the browser (so you stay signed in) and are sent only to the API to talk to Strava on your behalf. VeloGarage only requests `activity:read_all` and `profile:read_all`; it never posts to or modifies your Strava account.
