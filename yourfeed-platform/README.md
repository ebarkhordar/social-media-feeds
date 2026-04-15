# YourFeed Platform

An open-source platform for running social media feed experiments. Researchers upload a post corpus, define experimental conditions with different sorting algorithms, and distribute a URL to participants. The platform renders a realistic scrollable feed, tracks per-post dwell time and engagement, and exports the data as CSV.

Built as an open alternative to the closed-source YourFeed platform (Epstein & Lin 2022).

## Stack

- **Backend**: FastAPI + SQLModel (SQLAlchemy 2.0 + Pydantic) + asyncpg + Alembic
- **Database**: PostgreSQL (JSONB for flexible attributes)
- **Frontend**: React + Vite + TypeScript
- **Deployment**: Docker Compose (one command to run everything)

## Quick Start (Docker)

```bash
cd yourfeed-platform
docker compose up --build
```

Then seed the example study:

```bash
docker compose exec backend python -m app.seed
```

Open:
- Researcher dashboard: http://localhost:5173
- API docs: http://localhost:8000/docs
- Example feed: click "Open feed" in the dashboard, or use the URL printed by the seed script

## Manual Setup (Without Docker)

### Prerequisites
- Python 3.11+
- Node 20+
- PostgreSQL 16

### Backend
```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -e .
createdb yourfeed  # or use your own Postgres instance
export DATABASE_URL="postgresql+asyncpg://yourfeed:yourfeed@localhost:5432/yourfeed"
python -m app.seed
uvicorn app.main:app --reload
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

## Project Structure

```
yourfeed-platform/
├── docker-compose.yml
├── backend/
│   ├── pyproject.toml
│   ├── Dockerfile
│   ├── alembic.ini
│   ├── alembic/env.py
│   └── app/
│       ├── main.py              # FastAPI app entry
│       ├── config.py             # Settings via pydantic-settings
│       ├── db.py                 # Async SQLAlchemy engine + session
│       ├── schemas.py            # Pydantic request/response models
│       ├── seed.py               # Example data seeder
│       ├── models/               # SQLModel tables
│       │   ├── study.py          # Study, Condition, SortAlgorithm
│       │   ├── post.py
│       │   ├── participant.py
│       │   └── event.py          # Dwell + engagement events
│       ├── routers/
│       │   ├── studies.py        # CRUD for studies
│       │   ├── participants.py   # Session start/end, condition assignment
│       │   ├── events.py         # Event ingestion
│       │   └── export.py         # CSV export
│       ├── algorithms/base.py    # Sorting algorithms (random, sentiment, etc.)
│       └── services/
│           └── condition_assigner.py
├── frontend/
│   ├── package.json
│   ├── Dockerfile
│   ├── vite.config.ts
│   └── src/
│       ├── main.tsx
│       ├── pages/
│       │   ├── Dashboard.tsx     # Researcher study list
│       │   └── Feed.tsx          # Participant feed page
│       ├── lib/
│       │   ├── api.ts            # Typed FastAPI client
│       │   └── dwellTracker.ts   # IntersectionObserver dwell tracker
│       └── styles/
│           ├── global.css
│           └── feed.css
└── examples/
    └── sample-posts.json
```

## How It Works

1. **Researcher creates a study** via API (`POST /api/studies`) with a list of posts and conditions.
2. **Participant visits** `/feed/{study_id}?participant_id=P123`.
3. Frontend calls `POST /api/studies/{study_id}/sessions` with the participant ID.
4. Backend:
   - Assigns the participant to a condition (deterministic hash-based, so reloads are stable).
   - Runs the condition's sorting algorithm over all study posts.
   - Returns the sorted feed and session metadata.
5. Frontend renders the feed. A `DwellTracker` uses `IntersectionObserver` to measure how long each post is visible (with 1s/3s/5s thresholds).
6. Engagement (like/retweet/bookmark) is tracked on click. Events are batched and sent to `POST /api/events` every 5 seconds.
7. When the participant clicks "Continue", the frontend flushes the final dwell snapshot and calls `POST /api/studies/{study_id}/sessions/end`. If the study has a `redirect_url`, the browser navigates there (e.g., back to a Qualtrics post-survey).
8. Researchers download the raw event log via `GET /api/studies/{study_id}/export/events.csv`.

## Available Sorting Algorithms

| Algorithm | Description |
|---|---|
| `default` | Original order from the corpus |
| `random` | Deterministic shuffle seeded by participant ID |
| `chronological` | Newest posts first (by `created_at`) |
| `engagement` | Highest total engagement (likes + retweets + replies) first |
| `sentiment_high` | Most positive sentiment first |
| `sentiment_low` | Most negative sentiment first |
| `custom_score` | Sort by a named key in `post.attributes` (params: `score_field`, `descending`) |

Algorithms live in `backend/app/algorithms/base.py`. To add one, extend the `SortAlgorithm` enum in `models/study.py` and add a branch to `sort_posts()`.

## Integrating with Qualtrics

The hybrid flow is: **Qualtrics pre-survey → YourFeed → Qualtrics post-survey**.

1. In your Qualtrics survey flow, set the `participant_id` embedded data field from Prolific/MTurk URL parameters.
2. At the end of the pre-survey block, add an **End of Survey** element set to redirect to:
   ```
   https://your-yourfeed-host.com/feed/<STUDY_ID>?participant_id=${e://Field/participant_id}
   ```
3. In the study, set `redirect_url` to your Qualtrics post-survey URL:
   ```
   https://youruniversity.qualtrics.com/jfe/form/SV_postsurvey?participant_id=${participant_id}
   ```
4. After the participant finishes the feed, they are redirected back to Qualtrics for the post-survey.
5. Download event data as CSV from the platform, merge with Qualtrics CSV on `participant_id`.

## Roadmap

- [ ] Researcher UI for creating studies (currently API-only)
- [ ] Feed skins beyond Twitter (Instagram, Facebook, plain)
- [ ] Custom JavaScript scoring function upload
- [ ] LLM-based real-time scoring backend
- [ ] R/Python analysis helper package
