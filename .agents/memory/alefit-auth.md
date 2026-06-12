---
name: ALEFIT auth architecture
description: How auth, login/register pages, and Supabase keys are wired in this project
---

## Key decisions

**Login.html and Register.html are standalone pages** (no React SPA bundle). The React SPA's `navigateToLogin()` redirects to `/Login.html?from_url=...`, and the React router has no `/Login.html` route — so the pages MUST be standalone HTML with their own form/fetch logic, not SPA entry points.

**Why:** The compiled React bundle (assets/index-C7oXusOW.js) uses BrowserRouter and its catch-all route renders a 404 for any unknown path including `/Login.html`. Injecting `history.replaceState` before React loads would cause infinite redirect loops because `auth_required` → `navigateToLogin()` → browser redirect.

**How to apply:** Keep Login.html and Register.html as self-contained HTML pages with inline `<script>` that call the Flask backend directly at `/api/apps/6a1f3d189ebdbe71fa7d256c/auth/login` and `/auth/register`. After successful login, read `from_url` from URL params and redirect there.

## Supabase keys

- `SUPABASE_KEY` — anon/public JWT (208 chars). Used for user-facing auth calls.
- `SUPABASE_SERVICE_KEY` or `Database` env var — contains `sb_secret_3QH-...` which is the service role key that unlocks `/auth/v1/admin/*` endpoints.
- **Why:** Admin API is required to create users with `email_confirm: true` (bypassing email verification flow). The anon key returns 403 for all admin endpoints.

## Auth flow summary

1. Protected page → auth guard script checks `localStorage.getItem('base44_access_token')` → if missing, `window.location.replace('/Login.html?from_url=...')`
2. Login.html → user submits form → `POST /api/apps/.../auth/login` → Supabase password grant → token stored in `localStorage` under both `base44_access_token` and `token` → redirect to `from_url`
3. Register.html → `POST /api/apps/.../auth/register` → server uses admin API with `email_confirm: true` → immediate login → redirect

## React SPA internal auth

The SPA checks `GET /api/apps/{id}/auth/me` (not `/entities/User/me`) to verify auth status. Both endpoints exist in server.py. The SPA stores token as `base44_access_token` in localStorage. The auth guard reads the same key.

## Protected paths

`/calorie-tracker`, `/calorie-tracker.html`, `/meal-plan`, `/meal-plan.html`, and anything under `/programs/` with a non-empty trailing path. Defined in `PROTECTED_PATHS` and `PROTECTED_PREFIXES` in server.py.
