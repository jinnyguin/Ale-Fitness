# Google sign-in: owner configuration and release checklist

## Current blocker

On October 12, 2026, this workspace's configured Supabase Auth hostname failed DNS resolution.
The live Google-start endpoint at https://www.alefit.org/api/oauth/authorize?provider=google
returned HTTP 503. The live site's underlying provider error cannot be confirmed without its logs.
https://alefit.org redirects to https://www.alefit.org, which is served by Vercel.
Replit deployment metadata reported no published deployment for this project.
Workspace changes therefore do not update alefit.org automatically.

## Owner actions

1. Open the **original Supabase project** that holds Alefit's existing Auth users.
   Restore/unpause that project if necessary. From its project settings, confirm its Project URL
   and matching public API key. Correct `SUPABASE_URL` and `SUPABASE_KEY` using the secrets
   tools in both this workspace and the Vercel project serving www.alefit.org.
   Do not create a replacement Auth project: different user IDs would disconnect saved plans.
   Do not share secret values in chat or substitute a database password or service-role key.
2. In that project's **Authentication → Sign In / Providers → Google**, enable Google and
   configure the matching Google OAuth web client ID and secret.
3. In Google Cloud **APIs & Services → Credentials → that OAuth web client**:
   set its authorized redirect URI to the **Supabase callback URL displayed in the Google
   provider panel**, normally `https://<original-project-ref>.supabase.co/auth/v1/callback`.
   This Google redirect is NOT the Alefit `/auth/callback` URL.
   Configure the consent screen's audience/publishing status; while in Testing, explicitly
   add the Google accounts that will test sign-in.
4. In Supabase **Authentication → URL Configuration**:
   - Site URL: `https://www.alefit.org`
   - Allow redirects to `https://www.alefit.org/auth/callback**`
   - Also allow `https://alefit.org/auth/callback**` if retaining the apex entry point.
   - Add the exact current Replit preview origin followed by `/auth/callback**` for testing.
     Do not allow every replit.dev site. The suffix accommodates the `from_url` query.
   Start and finish a sign-in in the same browser and origin, since PKCE proof and onboarding
   drafts are held in session storage.
5. Publish the repaired files through the deployment pipeline that actually serves Vercel.
   Include server.py, auth-session.js, auth-oauth.js, OAuthCallback.html, Login.html,
   Register.html, today.html and onboarding.js. Confirm `/api/oauth/session` is routed to Flask.
   Recheck the active Vercel environment secrets rather than assuming Replit secrets are shared.

## Acceptance checks after configuration is restored

- Google-start endpoint returns an HTTPS provider URL, not a 503.
- Real new Google user: guest questionnaire → preview → Google consent → saved plan → Today.
- Real returning Google user: same provider user ID and existing saved plan; no plan overwrite.
- Refresh Today, including after access-token expiry: still signed in through refresh-token rotation.
- iPhone Safari and desktop: cancellation, Back from Google, network failure and retry do not
  leave disabled buttons or redirect loops.
- Callback URL and subsequent pages contain no access token.
- Email/local login still works; do not automatically merge a local account and Google account
  solely because they have matching email addresses.

Unit tests with stubbed provider responses do not substitute for these real Google checks.
