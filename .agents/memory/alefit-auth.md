---
name: ALEFIT member return routing
description: Member recognition, safe reauthentication, and onboarding draft continuity.
---

Keep remembered-member state separate from authentication. It may route a known member away from public marketing and toward sign-in or their saved training space, but it must never grant access or stand in for a verified session.

**Why:** Members should not lose their place after sign-out or token expiry, while saved account identity alone is not proof of authorization.

**How to apply:** Preserve the member marker when clearing expired or explicitly signed-out sessions; validate access with the existing auth service before opening protected data, and send successful sign-in back to the intended dashboard or setup step.

Keep onboarding drafts available across the email-confirmation round trip, including when the confirmation link opens another tab. Clear a draft only after its plan is durably saved to the signed-in account.

**Why:** Email links can open a separate tab or return to the site after the original signup page is gone.

**How to apply:** Persist draft state locally with a session-storage fallback, preserve same-origin return paths, and remove the draft only after the plan-save request succeeds.

For durable Supabase sessions on ALEFIT, keep the rotating refresh token in a Secure, HttpOnly, SameSite=Lax cookie scoped to `.alefit.org`; restore and verify the user and saved plan server-side before selecting the first page. Prefer the current cookie over legacy localStorage refresh tokens, using legacy tokens only as a fallback after a definitive rejection or when no cookie exists. Browser member markers are hints only, never proof of sign-in.

**Why:** `www.alefit.org` and `alefit.org` do not share browser storage, and a local setup flag can be missing even when the member already has a saved plan. A stale pre-cookie refresh token must not override or clear a valid current cookie.

**How to apply:** Continue routing from the authenticated server response and `OnboardingPlan` record. New sessions should use the cookie; retain local refresh state only to recover older sessions when the cookie is missing or definitively invalid.

Revalidate the homepage after browser history restores it from the back-forward cache. Keep the branded gate available in the document, arm it on `pagehide`, and repeat the auth plus saved-plan check on `pageshow` when `persisted` is true.

**Why:** A cached public homepage does not rerun `DOMContentLoaded`; after sign-in, Back could otherwise reveal the old logged-out page without checking the now-valid session.

**How to apply:** Test Back navigation in a real browser session as well as direct loads. Do not remove the gate node when revealing public content, because the same cached page may need it again.

Every protected app entry point, including direct Today and workout links, must restore and verify the shared session before requesting account data. Do not treat missing browser storage as proof that the session is invalid when the HttpOnly refresh cookie can restore it.

**Why:** Safari and direct links can open the dashboard with no readable local access token even though the first-party refresh cookie remains valid.

**How to apply:** Call the shared session restore before dashboard API requests, use the restored access token for that request, and keep transient auth-service failures retryable instead of clearing session state.

Password recovery must accept Supabase access-token, token-hash, and PKCE-code link formats. Verify one-time recovery material with Supabase only when the member submits a new password; never trust a URL token as proof without provider verification.

**Why:** Supabase recovery templates and flow settings can return different credential formats, while email scanners or link previews may open a recovery URL before the member does.

**How to apply:** Keep recovery credentials out of logs and remove them from the address bar after parsing. Bind PKCE recovery to a short-lived verifier stored in the requesting browser, update the password only through Supabase Auth, and never alter the member's profile, plan, or workout history.

For Supabase `POST /auth/v1/recover`, put `redirect_to` in the URL query, but put `code_challenge` and `code_challenge_method` in the JSON body.

**Why:** Supabase can send the recovery email even when PKCE challenge fields placed in the query are ignored; the resulting authorization code then cannot be exchanged with the browser's verifier.

**How to apply:** Keep a regression test asserting the exact URL/body split before changing this endpoint or its request construction.

