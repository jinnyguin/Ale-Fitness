---
name: ALEFIT auth architecture
description: How auth flows between Flask backend, Supabase, standalone HTML pages, and React SPA bundle
---

## Stack
- Flask (server.py, port 5000) + Supabase Auth + Replit Postgres
- React SPA bundle: assets/index-C7oXusOW.js (compiled, patched in-place)
- Standalone auth pages: Login.html, Register.html, Account.html, OAuthCallback.html

## Token flow
The React SPA SDK reads `access_token` from URL search params first (`Vn("access_token", {removeFromUrl:true})`), then falls back to `localStorage.getItem("base44_access_token")`. After login/register, both Login.html and Register.html must append `?access_token=TOKEN` to the redirect URL so the SPA picks it up immediately.

**Why:** Without the URL param, the SPA at `/` calls `/entities/User/me` before localStorage is consulted by the SDK init, triggering an auth_required error and login loop.

## Bundle patches applied
- Image URLs: all `https://media.base44.com/...` replaced with `/images/filename` (7 total)
- Nav G0 array: Login item is now dynamic — reads localStorage to show "My Account"/Account.html vs "Login"/Login.html
- Login redirect: `/#signup` → `#signup` (already done earlier)
- Nav LOGIN link added earlier

## Protected paths (server.py)
PROTECTED_PATHS: /calorie-tracker, /calorie-tracker.html, /meal-plan, /meal-plan.html, /account, /Account.html
PROTECTED_PREFIXES: /programs/

## OAuth (Google / Apple)
Route: GET /api/oauth/authorize?provider=google&redirect_to=URL → returns {url: "supabase_oauth_url"}
Callback page: /auth/callback → OAuthCallback.html reads #access_token from hash, stores to localStorage, redirects with ?access_token= in URL
**Requires:** Google/Apple OAuth providers must be enabled in Supabase dashboard + callback URL registered

## Supabase admin API
Uses SUPABASE_SERVICE_KEY (from "Database" env var: sb_secret_3QH-...) for admin/users endpoint — auto-confirms emails, no verification needed.

## Key files
- server.py — all backend routes
- Login.html, Register.html — standalone auth pages with Google/Apple buttons
- Account.html — profile page (protected)
- OAuthCallback.html — handles Supabase OAuth hash fragment redirect
- images/ — locally cached images (6 files)
- assets/index-C7oXusOW.js — patched React SPA bundle
