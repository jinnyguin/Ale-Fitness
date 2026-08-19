---
name: Auth provider resilience
description: Durable auth behavior when the remote provider or its configuration is unavailable.
---

The app should retain a local, signed-session auth path for email login and registration when the remote auth provider cannot be reached. Provider outages should produce user-facing auth errors without exposing raw network or DNS details.

**Why:** The configured remote auth host became unresolvable, and the database secret was being reused as though it were a provider service-role key. That made both login and registration fail before the forms could do useful work.

**How to apply:** Only use an explicitly named provider admin secret for provider admin calls. Keep local credentials in the app database with salted password hashing and signed expiring tokens, and preserve the same `/auth/me` and profile interfaces used by the frontend.