# Running Resumatch locally

Two processes: the Django API on `:8000` and the Vite dev server on `:5173`.
You need both running at once, in separate terminals.

**Prerequisites:** Python 3.12+, Node 18+, and Git.

---

## First-time setup

Run these once.

### 1. Backend

```bash
# From the repository root
python -m venv .venv

# Activate it — Windows:
.venv\Scripts\activate
# macOS / Linux:
source .venv/bin/activate

pip install -r requirements/dev.txt
```

### 2. Environment file — required

The app **refuses to start without this**. That is deliberate: it will not run
with a placeholder secret key.

```bash
# Windows
copy .env.example .env
# macOS / Linux
cp .env.example .env
```

Then open `.env` and replace `SECRET_KEY=replace-me` with a real key:

```bash
python -c "from django.core.management.utils import get_random_secret_key as k; print(k())"
```

Everything else in `.env` has a working default for local development.

### 3. Database and demo data

```bash
cd backend
python manage.py migrate
python manage.py seed_jobs        # 50 sample job postings
python manage.py createsuperuser  # optional, for the Django admin
```

### 4. Frontend

```bash
cd frontend
npm install
```

No frontend `.env` is needed locally — it defaults to `http://127.0.0.1:8000`.
To point it elsewhere, `cp .env.example .env.local` and set `VITE_API_URL`.

---

## Running it

Two terminals, both with the virtualenv activated where relevant.

**Terminal 1 — API:**

```bash
cd backend
python manage.py runserver
```

**Terminal 2 — web app:**

```bash
cd frontend
npm run dev
```

Then open **<http://localhost:5173>**.

| URL | What it is |
|---|---|
| <http://localhost:5173> | The app |
| <http://127.0.0.1:8000/api/v1/> | API root |
| <http://127.0.0.1:8000/api/v1/docs/> | Interactive API docs (Swagger) |
| <http://127.0.0.1:8000/api/v1/health/> | Health probe |
| <http://127.0.0.1:8000/admin/> | Django admin (superuser only) |

---

## Trying it out

The fastest path through the product:

1. Go to <http://localhost:5173> and click **Get started**.
2. Register as a **Job seeker**.
3. You land on **My resume** — upload a PDF or DOCX resume.
4. **My matches** ranks the 50 seeded jobs against it, with matching skills shown.
5. **ATS check** — paste any job description for a full score and gap report.
   (From a job page, "Check my resume against this" prefills it.)
6. Open a job and **Apply**, then watch it in **Applications**.

To see the other side, register a second account as a **Recruiter**:
post a job, then open **Review applicants** to see scored candidates, read
their resumes, and move them through statuses.

---

## Everyday commands

```bash
# Backend (from the repository root)
pytest                                    # 163 tests
ruff check backend/                       # lint

# Backend (from backend/)
python manage.py seed_jobs --clear        # reset demo jobs
python manage.py deactivate_expired_jobs  # close expired postings
python manage.py check --deploy           # production readiness gate

# Frontend (from frontend/)
npm run typecheck
npm run lint
npm run build
npm run preview                           # serve the production build
npm run gen:api                           # regenerate API types (see below)
```

### After changing a backend serializer

The frontend's types are generated from the API schema, so regenerate them:

```bash
cd backend
python manage.py spectacular --file ../frontend/src/api/schema.yml
cd ../frontend
npm run gen:api
```

---

## Troubleshooting

**`ImproperlyConfigured: SECRET_KEY is unset and DEBUG is off`**
You skipped step 2. Create `.env` from `.env.example`.

**The app loads but every request fails**
The API isn't running, or it's on a different port. Check terminal 1, and
confirm <http://127.0.0.1:8000/api/v1/health/> returns `{"status": "ok"}`.

**CORS errors in the browser console**
The frontend must be on `http://localhost:5173`. If Vite picked a different
port (because 5173 was busy), add that origin to `CORS_ALLOWED_ORIGINS` in
`.env`.

**"No matches yet" with a resume uploaded**
Run `python manage.py seed_jobs` — there are no open jobs to match against.

**"Your resume could not be read"**
The PDF is probably a scan with no text layer. Export a text-based PDF, or
upload a DOCX.

**`ImportError` mentioning scipy or `_group_columns`**
Some Windows machines block newer scipy binaries via Application Control.
`requirements/base.txt` pins `scipy==1.14.1`, which loads fine — reinstall with
`pip install -r requirements/dev.txt`.

**Port already in use**
`python manage.py runserver 8001` — then set `VITE_API_URL=http://127.0.0.1:8001`
in `frontend/.env.local`.
