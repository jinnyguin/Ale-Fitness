---
name: Supabase app-data boundary
description: Which Alefit records belong in Supabase and how they should remain protected.
---

Keep Alefit profile and flexible entity records in the Supabase Postgres project behind authenticated server endpoints. Enable RLS and deny the browser-facing `anon` and `authenticated` roles direct table access. Keep local-fallback credential records on their existing database so switching app-data storage does not silently replace account identities.

**Why:** The Supabase project initially contained Auth tables only, while app profiles and training entities were stored elsewhere. Development records are not automatically safe to copy into the shared production project, and merging local credentials can break account ownership.

**How to apply:** Use the server-only `SUPABASE_DATABASE_URL` for profile/entity operations, preserve the legacy auth store, and identify the exact production source before migrating any existing rows. Configure the same secret separately in Vercel before releasing the code there.
