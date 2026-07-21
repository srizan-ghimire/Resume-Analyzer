# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

**Resumatch** — a resume analyzer and job board. Django REST backend (`backend/`) and a React + TypeScript + Vite frontend (`frontend/`). Seekers upload a resume, get an ATS report and job recommendations; recruiters post jobs and review scored applicants.

Both halves were rebuilt for production. The API is versioned under `/api/v1/`, auth is JWT, and the frontend consumes types generated from the backend's OpenAPI schema.

## Commands

Backend (venv at repo root `.venv/`):

```bash
.venv/Scripts/activate            # Windows; source .venv/bin/activate elsewhere
pip install -r requirements/dev.txt

cd backend
python manage.py migrate
python manage.py seed_jobs        # 50 demo postings
python manage.py runserver        # docs at /api/v1/docs/

pytest                            # from repo root; 163 tests
ruff check backend/
python manage.py check --deploy
```

Frontend:

```bash
cd frontend
npm install
npm run dev        # http://localhost:5173
npm run typecheck  # tsc -b --noEmit
npm run lint
npm run build
npm run gen:api    # regenerate schema.d.ts from src/api/schema.yml
```

## Architecture

### Backend layout

`api/` is split into packages, not flat modules: `views/`, `serializers/`, `matching/`, `management/commands/`. URLs are namespaced under `/api/v1/` via a DRF router. `permissions.py`, `filters.py`, `pagination.py`, and `exceptions.py` hold the cross-cutting pieces.

Every error response uses one envelope: `{"error": {"code", "message", "details?}}` (`api/exceptions.py`). Don't return bare `{"detail": ...}` from new views.

### Auth

One `CustomUser` with `role` ∈ {`SEEKER`, `RECRUITER`}; recruiters have a `RecruiterProfile`. SimpleJWT with rotation + blacklisting. `DEFAULT_PERMISSION_CLASSES` is `IsAuthenticated` — opt out explicitly with `AllowAny`.

Job *listing* is intentionally public (landing page shows roles to visitors); this is asserted by tests in `test_permissions.py`. Everything else needs a token.

### Matching engine (`api/matching/`)

`text.py` (tokenisation) → `skills.py` (extraction) → `scorer.py` / `ats.py`. `parser.py` handles PDF/DOCX.

Things that will bite you:

- **`api/data/skills.csv` is required at import time** and is tracked in git. It stores canonical names plus `|`-separated aliases. Missing file → `FileNotFoundError` on startup.
- **Resumes are parsed once, at upload.** `Resume.parsed_text` / `extracted_skills` are the source of truth for scoring. Never re-read the file in a request path.
- **The job corpus is cached in-process**, keyed on a cache revision bumped by a `post_save`/`post_delete` signal (`api/signals.py`). Bulk operations that bypass signals (`.update()`, `bulk_create`) must call `invalidate_corpus_cache()` — `deactivate_expired_jobs` shows the pattern.
- `Job.save()` recomputes `searchable_text` and `extracted_skills`, so saving a Job is not free.
- Scoring weights live at the top of `scorer.py` (skills 0.45 / TF-IDF 0.35 / BM25 0.20).

Recommendations rank **real `Job` rows**. The old CSV pipeline is gone; `seed_jobs` imports that data as ordinary Job records.

### Data model

`CustomUser` · `RecruiterProfile` · `Resume` · `Job` · `Application`.

- `Application` has a DB unique constraint on `(user, job)`.
- Expired jobs are **deactivated, never deleted** — deletion would cascade to applications. `Job.objects.open()` is the queryset for "applicable now".
- `Resume.save()` enforces a single `is_primary` per user.

### Settings

`backend/settings.py` is entirely env-driven via `django-environ` (`.env.example` documents every variable). It **raises `ImproperlyConfigured` if `DEBUG=False` and no `SECRET_KEY` is set** — that is deliberate, not a bug to work around.

`backend/settings_test.py` inherits it and relaxes only HTTPS redirect, password hasher, throttles, and storage. It must set `SECRET_KEY` in `os.environ` *before* importing, because of the guard above.

### Dependencies

`requirements/base.txt` + `requirements/dev.txt`; root `requirements.txt` includes base. **`scipy` is pinned to 1.14.1** — newer builds ship compiled extensions that Windows Application Control blocks on some developer machines.

## Frontend (`frontend/src/`)

Layout: `api/` (client, generated types, endpoint wrappers), `app/` (providers, routes), `components/ui/` (primitives), `components/layout/`, `components/jobs/`, `pages/`, `pages/recruiter/`, `lib/utils.ts`, `styles/index.css`.

Rules that matter:

- **`api/schema.d.ts` is generated — never hand-edit it.** Regenerate after any serializer change: `manage.py spectacular --file ../frontend/src/api/schema.yml` then `npm run gen:api`. If a field types as `unknown`, fix the *serializer* (add `child=` to a `ListField`, declare `JSONField`s explicitly) rather than casting in TypeScript.
- **All HTTP goes through `api/client.ts`.** It owns the base URL (`VITE_API_URL`), the `Authorization` header, and the refresh-and-retry on 401. Never call `fetch` directly from a component — the one exception is the resume blob download in `pages/recruiter/ApplicantsPage.tsx`, which needs the raw Response.
- **Tokens:** access in memory, refresh in `localStorage` under `resumatch.refresh`. Nothing else is persisted, ever.
- **Styling is Tailwind v4 + CSS custom properties only** (`--surface`, `--text`, `--accent`, …), defined in `styles/index.css`. Use `cn()` from `lib/utils.ts` to merge classes. No CSS Modules, no component libraries beyond Radix primitives.
- One `Dialog` (`components/ui/Dialog.tsx`), one `JobCard`, one salary formatter (`formatSalary`), one status-tone mapper (`statusTone`). Reuse rather than re-implement — the previous build had 3 modals, 4 job cards, and 3 divergent salary formatters.
- Errors: catch `ApiError` and use `.fieldError(name)` / `.fieldErrors` to map server validation onto form fields.

## Verification

Beyond `pytest`, two scripts under the session scratchpad proved the stack end to end and are worth recreating if you rework either side: a **smoke test** (full user journey against a live server) and a **contract check** (every path in `endpoints.ts` exercised from the Vite origin, asserting the fields the TS types promise, plus CORS and the error envelope). The contract check is what caught `application_count` being absent from `POST /jobs/` while the type declared it required.

## Testing

`backend/tests/` — `test_matching.py` (engine), `test_auth.py`, `test_permissions.py` (cross-account matrix), `test_api.py` (endpoints), `test_commands.py`.

`conftest.py` generates valid PDFs in-process via `make_pdf()` rather than committing binary fixtures. Ranking tests assert *relative* order (a Python resume outranks a frontend one, and vice versa) rather than absolute scores, so tuning the weights doesn't spuriously break them.
