# yourkolkata — a single-day, AI-curated day out in Kolkata

A small two-link web app:

1. **The traveller** gets a low-key intake link (`/tell-me/:linkId`) — just a
   casual "what are you into?" box. Their answer goes straight to the backend.
2. The backend asks **Groq** (the only AI provider here — no Gemini, ever) for
   a shortlist of real Kolkata places matching those interests, enriched with
   **Google Places** details (address, rating, photo, coordinates).
3. **The host** reviews the shortlist on a private admin page, keeps/removes
   places, and adds one hand-picked **"local secret" spot** (marked as theirs).
4. The backend uses **Google Directions** to order the day into an efficient
   route and assigns time slots (Morning → Lunch → Afternoon → Evening) with
   realistic gaps, then saves it behind a short shareable link.
5. The traveller opens `/trip/:id` on the day — a warm, postcard-styled page
   where each stop **unlocks as the device clock reaches its time** (pure time
   comparison, no location tracking), ending with a personal closing note.

---

## Project layout

```
trip-planner/
├── backend/     Node.js + Express API, JSON-file storage
└── frontend/    React + Vite (three pages)
```

## Prerequisites

- Node.js 18+ (built and tested on Node 24)

## Running it locally

Open **two terminals**.

### 1. Backend

```bash
cd trip-planner/backend
npm install
cp .env.example .env      # then fill in your keys (see below)
npm start                 # → http://localhost:4000
```

### 2. Frontend

```bash
cd trip-planner/frontend
npm install
npm run dev               # → http://localhost:5173
```

The Vite dev server proxies `/api/*` to the backend on port 4000, so you only
ever open `http://localhost:5173` in the browser.

### The three pages

| Page | URL | Who it's for |
|------|-----|--------------|
| Intake | `http://localhost:5173/tell-me/anything` | the traveller |
| Admin | `http://localhost:5173/admin` | the host (private) |
| Trip | `http://localhost:5173/trip/:id` | the traveller (the reveal) |

`:linkId` is any short string you choose (e.g. `/tell-me/sept`). The admin page
loads that same id to see what was submitted.

---

## API keys — what needs a real key to actually work

Put these in `trip-planner/backend/.env` (copied from `.env.example`).
**Nothing is hardcoded.** Until a key is present, that integration runs in a
clearly-labelled **MOCK MODE** so you can click through the whole app first.

| Variable | Powers | Without it |
|----------|--------|------------|
| `GROQ_API_KEY` | `/api/suggest` — AI place ideas | Returns a fixed list of hand-written Kolkata suggestions. Logged as `[groq] ⚠ MOCK MODE`. |
| `GOOGLE_MAPS_API_KEY` | `/api/suggest` (Places: address/rating/photo/coords) **and** `/api/itinerary/build` (Directions: route ordering) | Places → placeholder photos + central-Kolkata coords + a "(mock)" address. Directions → stops kept in input order with ~20-min estimated gaps. Logged as `[places]` / `[directions] ⚠ MOCK MODE`. |

The Google key must have **both** the **Places API** and **Directions API**
enabled in Google Cloud.

### How to tell what's live vs mocked

- `GET http://localhost:4000/api/health` reports each integration as `live` or `MOCK`.
- The server prints the same on startup.
- `/api/suggest` responses include a `meta` object (`groqMock`, `placesMock`).
- The **admin page** shows a "⚠ Mock data in use" banner when either key is missing.

Every mock path is commented in the source under a big
`MOCK DATA PATH` header — search the `backend/src` folder for `MOCK` to find them all.

---

## Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| `POST` | `/api/interests/submit` | **Public.** Stores the traveller's interests and internally triggers the suggestion step. Returns only a friendly confirmation. |
| `POST` | `/api/suggest` | Groq → Google Places. Returns enriched place suggestions. (Also re-runnable from admin.) |
| `POST` | `/api/itinerary/build` | Merges selected + manual places, orders them via Google Directions, assigns time slots. |
| `POST` | `/api/itinerary/save` | Saves the finished itinerary, returns `{ id, url }`. |
| `GET`  | `/api/itinerary/:id` | Returns a saved itinerary for the trip page. |
| `GET`  | `/api/interests/:linkId` | (Admin) read a submission + its suggestions. |
| `GET`  | `/api/health` | Reports which integrations are live vs mocked. |

## Storage

A single JSON file at `backend/data/db.json` (git-ignored). No database needed
at this scale. Two collections: `interests` (keyed by `linkId`) and
`itineraries` (keyed by the short save id).

## Design notes (trip page)

Warm cream / terracotta / muted-gold palette, serif headers (Fraunces) with a
handwriting accent (Caveat), one big postcard photo per stop, subtle fade-in as
each stop unlocks, the secret spot in a distinct gold-bordered "not on Google —
just for you" treatment, and a personal closing note after the last stop.
Mobile-first — it's meant to be read on a phone while walking around.

## Open questions the host fills in (all editable on the admin page)

- **Starting point** for the day (hotel / station / airport) — name + coordinates.
- **Start time** — defaults to 09:30.
- **Closing note** — a placeholder is pre-filled; edit before saving.
- **Intake message** — the intake page stays deliberately vague so it doesn't
  spoil the surprise.
