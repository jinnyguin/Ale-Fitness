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
