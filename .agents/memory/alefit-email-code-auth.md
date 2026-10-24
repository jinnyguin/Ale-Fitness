---
name: ALEFIT email-code authentication
description: Product constraints for passwordless email-code sign-in and signup.
---

Current ALEFIT sign-in scope is Google and email/password only. Keep the passwordless email-code UI and endpoint disabled unless the user explicitly asks to re-enable it. Do not reintroduce Apple, Facebook, or other providers unless requested.

**Why:** The user explicitly changed priority to exclude Email Code and retain only Google plus email/password for now.

**How to apply:** Keep code-based sign-in hidden and reject its API requests by default. Only re-enable it after explicit user direction and then verify Supabase numeric-code delivery end to end.
