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

For durable Supabase sessions on ALEFIT, keep the rotating refresh token in a Secure, HttpOnly, SameSite=Lax cookie scoped to `.alefit.org`; restore and verify the user and saved plan server-side before selecting the first page. Browser member markers are hints only, never proof of sign-in.

**Why:** `www.alefit.org` and `alefit.org` do not share browser storage, and a local setup flag can be missing even when the member already has a saved plan.

**How to apply:** Continue routing from the authenticated server response and `OnboardingPlan` record. Preserve legacy local refresh tokens only as a migration input; new sessions should use the cookie.

Revalidate the homepage after browser history restores it from the back-forward cache. Keep the branded gate available in the document, arm it on `pagehide`, and repeat the auth plus saved-plan check on `pageshow` when `persisted` is true.

**Why:** A cached public homepage does not rerun `DOMContentLoaded`; after sign-in, Back could otherwise reveal the old logged-out page without checking the now-valid session.

**How to apply:** Test Back navigation in a real browser session as well as direct loads. Do not remove the gate node when revealing public content, because the same cached page may need it again.

