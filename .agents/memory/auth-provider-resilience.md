---
name: Auth provider resilience
description: Durable auth behavior when the remote provider or its configuration is unavailable.
---

The app should retain a local, signed-session auth path for email login and registration when the remote auth provider cannot be reached. Provider outages should produce user-facing auth errors without exposing raw network or DNS details.

Never use a public application identifier as the local token signing secret. If `SESSION_SECRET` is unavailable, local auth must fail closed rather than sign tokens with a predictable key.

**Why:** The remote host has been unavailable before, and database credentials are not provider admin keys. App IDs are public and predictable, so using one as an HMAC key would let anyone forge local sessions.

**How to apply:** Only use an explicitly named provider admin secret for provider admin calls. Keep local credentials in the app database with salted password hashing and signed expiring tokens, require a configured session secret, and preserve the same `/auth/me` and profile interfaces used by the frontend.