# Resumatch

Resume analysis and job matching. Job seekers upload a resume, get an ATS
report against any job description, and see ranked recommendations from real
job postings. Recruiters post roles and review scored applicants.

- **Backend** — Django 5 + DRF, JWT auth, scikit-learn matching engine (`backend/`)
- **Frontend** — React 18 + TypeScript + Vite + Tailwind v4 (`frontend/`)

## Quick start

Full instructions, including troubleshooting, are in **[RUNNING.md](RUNNING.md)**.

```bash
# Backend
python -m venv .venv
.venv/Scripts/activate           # Windows; source .venv/bin/activate elsewhere
pip install -r requirements/dev.txt
cp .env.example .env             # REQUIRED — then set a real SECRET_KEY

cd backend
python manage.py migrate
python manage.py seed_jobs       # 50 sample postings
python manage.py createsuperuser # optional
python manage.py runserver
```

```bash
# Frontend, in a second terminal
cd frontend
npm install
npm run dev
```

- App — <http://localhost:5173>
- API — <http://127.0.0.1:8000/api/v1/>
- Interactive API docs — <http://127.0.0.1:8000/api/v1/docs/>
- Django admin — <http://127.0.0.1:8000/admin/>

## Commands

```bash
# Backend (repo root)
pytest                                   # 182 tests
ruff check backend/
python manage.py evaluate_matching       # matching quality — see EVALUATION.md
python manage.py check --deploy          # production readiness gate
python manage.py deactivate_expired_jobs # run hourly in production
python manage.py seed_jobs --clear       # reseed demo data

# Frontend
npm run dev / build / preview
npm run lint
npm run typecheck
npm run gen:api                          # regenerate types from schema.yml
```

`pytest` uses `backend/settings_test.py`, which inherits the production
configuration and relaxes only HTTPS redirection, password hashing cost,
throttle limits, and storage — so tests exercise the same secure-by-default
settings that ship.

## Architecture

### Auth

One `CustomUser` with a `role` of `SEEKER` or `RECRUITER`; recruiters get a
`RecruiterProfile`. SimpleJWT access + refresh with rotation and blacklisting.
`DEFAULT_PERMISSION_CLASSES` is `IsAuthenticated`; endpoints opt out explicitly.

On the client, **no credential is ever persisted**. The refresh token is the
only item in `localStorage`; the access token lives in memory and is restored
by exchanging the refresh token on load. A single interceptor in
`src/api/client.ts` retries once after refreshing, and collapses concurrent
401s into one refresh request.

Job *listings* are deliberately public so the landing page can show open roles
to visitors. Everything else requires a token.

### Matching engine (`backend/api/matching/`)

| Module | Responsibility |
|---|---|
| `text.py` | Tokenisation preserving `C++`, `Node.js`, `CI/CD`; stop words |
| `skills.py` | Canonical skill/education extraction via n-gram lookup |
| `parser.py` | PDF/DOCX text extraction plus structural analysis |
| `scorer.py` | TF-IDF cosine + BM25 + skill overlap, with a cached job corpus |
| `ats.py` | Score, weighted skill gaps, format checks, suggestions |

Scoring blends three signals: skill overlap (0.45), TF-IDF cosine (0.35), and
BM25 (0.20). They fail differently — cosine normalises for length, BM25
saturates term frequency, and skill overlap is the part a user can see
explained.

The vocabulary lives in `backend/api/data/skills.csv` as canonical names plus
aliases (`React` ← `ReactJS`, `React.js`). **This file is tracked in git and
required at import time.**

Resumes are parsed **once, on upload**, and the extracted text and skills are
stored on the `Resume` row. The fitted job corpus is cached in-process and
invalidated by a signal whenever a `Job` changes.

The scorer sits behind a narrow interface, so an embedding-based backend can
replace it without touching the views.

**Quality is measured, not assumed** — see **[EVALUATION.md](EVALUATION.md)**.
On the labelled set: NDCG@5 0.943, P@1 1.000, skill-extraction F1 0.892. Those
labels are hand-authored, so they gate regressions rather than prove real-world
accuracy; the limitations are documented there.

### Data model

`CustomUser` · `RecruiterProfile` · `Resume` · `Job` · `Application`

`Application` has a unique constraint on `(user, job)`, so double-applying is a
database-level impossibility rather than a check someone can forget.

Expired jobs are **deactivated**, never deleted — deleting them would take
their applicants' history with them.

### Frontend

`src/api/schema.d.ts` is generated from the backend's OpenAPI schema
(`npm run gen:api`) — never edit it by hand. `src/api/types.ts` gives those
generated shapes readable names, and `endpoints.ts` wraps every call the UI
makes, so a backend change surfaces as a TypeScript error rather than a runtime
one.

Styling is Tailwind v4 with CSS custom properties for theming
(`src/styles/index.css`); light and dark are both first-class, and the choice
is applied before first paint to avoid a flash. Routes are code-split, so a
signed-out visitor never downloads the recruiter dashboard.

## Deployment

Targets a PaaS (`render.yaml` and `Procfile` included). Requirements:

1. **`SECRET_KEY`** — the app refuses to start with `DEBUG=False` and no key.
2. **`DATABASE_URL`** — Postgres.
3. **`USE_S3=True` plus bucket credentials.** PaaS disks are ephemeral; without
   object storage, every restart loses uploaded resumes.
4. **`CORS_ALLOWED_ORIGINS`** — the deployed frontend origin.
5. **`VITE_API_URL`** on the frontend host — the deployed API origin.
6. Schedule `deactivate_expired_jobs` hourly.

Resume files are stored privately and served only through
`/api/v1/resumes/{id}/download/`, which checks that the caller is the owner or a
recruiter holding an application that includes it.

## Security notes

Fixed in this rework, listed because the history matters:

- The frontend stored the user's **plaintext password** in `localStorage` and
  sent HTTP Basic auth on every request. Now JWT; no credential is stored.
- `DEFAULT_PERMISSION_CLASSES` was `AllowAny`.
- `SECRET_KEY` was committed with `DEBUG = True`. **The old key is in git
  history and must be considered compromised** — never reuse it.
- Recruiters were a non-auth model resolved by username string match, so a
  seeker sharing a recruiter's username inherited their permissions.
- `GET /job/` deleted every expired job, and their applications, as a side
  effect of listing them.
- `/recommend/<username>/` let anyone read anyone else's recommendations.
- Uploaded resumes were base64-encoded into `localStorage`, readable by any XSS
  and liable to blow the storage quota.
