# Smart Lost & Found Ecosystem · PRD

> A centralized AI-powered digital platform for campus lost & found operations.
> Powered by React (Vite) + Tailwind + FastAPI + MongoDB.

---

## Original Problem Statement
Build a Smart Lost & Found Ecosystem for campuses with:
- **Two roles**:
  - **Students** — sign in with Google, report lost items, track claims, earn badges/points. **Cannot upload found items directly** (they must physically submit to admin).
  - **Admins** — sign in with JWT email/password, upload found items physically submitted to them, manage claims, verify ownership, view analytics, manage centres.
- **Core features**: AI matching (GPT-4o-mini), QR + unique item ID, secure claim verification (proof of ownership), real-time notifications, gamification (badges/points for finders), admin dashboard + analytics.
- **Homepage sections**: Latest Found Items showcase · Live Lost Alerts slider · "Lost & Found Centres Near You".
- **Decisions confirmed**: Google OAuth for students + JWT for admins · GPT-4o-mini via Emergent LLM key · Base64/URL images · Seeded demo data on launch.

## Personas
1. **Student** (campus user) — Wants to recover lost items fast, with minimal friction. Cares about clear status, AI-suggested matches, rewards for honesty.
2. **Admin / Centre Operator** — Logs physically handed-in items, verifies ownership before releasing, reviews analytics, manages multiple centres.

## Architecture
```
/app
├── backend/
│   ├── server.py         FastAPI app, all /api routes, startup-time seeding
│   ├── auth.py           JWT (admins) + session-token (students/Google) auth
│   ├── ai_matcher.py     GPT-4o-mini via emergentintegrations LlmChat + heuristic fallback
│   ├── qr_utils.py       PNG QR generation (qrcode lib)
│   ├── models.py         Pydantic v2 models
│   ├── seed_data.py      Auto-runs on first start
│   └── tests/            pytest suite (created by testing agent)
├── frontend/
│   └── src/
│       ├── App.jsx       Routes + ProtectedRoute (role)
│       ├── context/AuthContext.jsx  OAuth hash exchange + JWT admin login
│       ├── lib/api.js    axios w/ withCredentials + Bearer interceptor
│       ├── components/   Navbar, Footer, ItemCard, LostAlertsMarquee, Common
│       └── pages/        Home, Browse, Centres, Leaderboard, ItemDetail, Logins, student/*, admin/*
```

## Auth Model
- **Students**: `POST /api/auth/google/session { session_id }` → exchanges Emergent OAuth `session_id` for our `session_token` cookie (HttpOnly · Secure · SameSite=None · 7-day). AuthContext detects `#session_id=` on `/profile` URL and exchanges it automatically.
- **Admins**: `POST /api/auth/admin/login { email, password }` → returns Bearer access_token (7-day JWT, HS256). Stored in `localStorage.admin_token`, sent via `Authorization: Bearer …`.
- `get_current_user` resolves both: session cookie → bearer JWT → bearer session token.
- `require_admin` enforces RBAC: students cannot POST/PUT/DELETE `/api/items/found`, `/api/centres`, `/api/claims/*/approve|reject|request-proof`, `/api/dashboard/analytics`.

## Data Model (MongoDB · `lost_found_db`)
| collection | key fields |
|---|---|
| `users` | `user_id`, `email` (unique), `role` (`student` / `admin`), `password_hash` (admins), `picture`, `points`, `badges[]` |
| `user_sessions` | `session_token` (unique), `user_id`, `expires_at` |
| `found_items` | `item_id`, `title`, `description`, `category`, `color`, `brand`, `location_found`, `building`, `date_found`, `images[]` (base64/URL), `centre_id`, `qr_payload`, `status` (open / matched / claim_pending / returned / closed), `posted_by_admin_id` |
| `lost_items` | `item_id`, similar + `last_seen_location`, `date_lost`, `contact`, `reported_by_user_id`, `status` (open / matched / claimed / closed) |
| `claims` | `claim_id`, `found_item_id`, `claimant_user_id`, `ownership_proof`, `proof_images[]`, `contact`, `status` (pending / approved / rejected / more_proof_requested / returned), `admin_notes`, `decided_by_admin_id` |
| `centres` | `centre_id`, `name`, `description`, `location`, `building`, `contact_phone`, `contact_email`, `hours`, `image` |
| `notifications` | `notification_id`, `user_id`, `type` (match / claim_update / lost_alert / system / reward), `title`, `body`, `link`, `read` |
| `matches` | cached AI match results per `lost_item_id` (top 10, sorted by `similarity`) |

## API Surface
**Auth**: POST `/api/auth/admin/register|login`, `/api/auth/google/session`, GET `/api/auth/me`, POST `/api/auth/logout`
**Found items**: GET `/items/found[/recent|/{id}|/{id}/qr]`, POST/PUT/DELETE (admin)
**Lost items**: POST `/items/lost`, GET `/items/lost[/alerts/recent|/{id}]`
**AI matches**: GET `/ai/match/{lost_item_id}`, POST `/ai/match/{lost_item_id}/refresh`
**Claims**: POST `/claims`, GET `/claims[/{id}]`, POST `/claims/{id}/approve|reject|request-proof`
**Centres**: GET / POST / PUT / DELETE `/centres`
**Notifications**: GET `/notifications`, POST `/notifications/{id}/read`, POST `/notifications/read-all`
**Analytics**: GET `/dashboard/analytics` (admin)
**Leaderboard**: GET `/leaderboard`

## Implemented (Feb 11, 2026)
- ✅ Backend (32/32 pytest cases pass)
- ✅ AI matching via GPT-4o-mini (Emergent LLM key, with heuristic fallback)
- ✅ QR PNG generation per item (`/items/found/{id}/qr`)
- ✅ Seed: 1 admin, 3 students, 3 centres, 10 found items, 3 lost reports
- ✅ Frontend (24/25 E2E flows pass): Home with hero, marquee, found grid, centres; Browse with search + category chips; Centres page; Leaderboard; Item Detail with QR modal + Claim modal; Student login (Google); Admin login (JWT); Student Dashboard / Report / My Reports + AI Matches / My Claims / Notifications; Admin Dashboard with charts (Recharts); Admin Found Items CRUD + QR modal; Admin Lost Reports; Admin Claims with approve/reject/request-proof; Admin Centres CRUD
- ✅ RBAC enforced in both directions (`ProtectedRoute role="admin|student"`)
- ✅ Gamification: +50 pts + "Reunited" badge on approved claim
- ✅ CORS allow_origin_regex pattern supports credentials with any preview URL

## Backlog
- 🟡 Gate `/api/auth/admin/register` behind admin token or env flag
- 🟡 Strip `reported_by_name`/`reported_by_user_id` from public `/items/lost/alerts/recent` if anonymity is desired
- 🟡 Tighten CORS origin regex for production
- 🟢 Real-time notifications via WebSockets
- 🟢 Email/SMS notifications (Resend/Twilio) — opt-in for student
- 🟢 Bulk import of found items from CSV
- 🟢 Image storage migration from base64 → object store for large catalogs
- 🟢 Refactor `server.py` into `routers/items.py`, `routers/claims.py`, `routers/admin.py`

## Key Credentials (see `/app/memory/test_credentials.md`)
- **Admin**: `admin@campus.edu` / `Admin@123`
- **Students** (Google OAuth): alice / bob / priya `.student@campus.edu`
- **Preview URL**: https://campus-recovery-14.preview.emergentagent.com
