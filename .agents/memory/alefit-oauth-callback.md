---
name: ALEFIT OAuth root callback recovery
description: Preserve Google PKCE sign-in when the provider returns an authorization code to the public homepage instead of the callback route.
---

When the homepage receives an OAuth authorization code, immediately forward the browser to the same-origin `/auth/callback`, preserving the query and hash so the existing callback can exchange the code with its stored PKCE verifier. Never treat the code itself as a session or bypass callback verification.

**Why:** A real ALEFIT sign-in returned to `www.alefit.org/` with a code query, where the marketing homepage ignored the callback and left the user signed out.

**How to apply:** Keep the forwarding guard ahead of homepage member routing and page rendering. Preserve same-browser storage and leave session exchange, user verification, and plan routing to the existing callback flow.

When a code reaches the homepage, distinguish password recovery from OAuth using an explicit recovery type or a recent browser-local recovery verifier. Route recovery codes to the reset page; route ordinary OAuth codes to the OAuth callback. The reset page must still exchange the code with Supabase before accepting a password.

**Why:** Recovery and Google sign-in both use one-time authorization codes. Sending a recovery code through the Google callback leaves the member on ALEFIT without the password form.

**How to apply:** Validate marker age and verifier shape, prefer the newer pending flow if both markers exist, and keep provider verification as the authorization boundary.

**Production constraint:** Google sign-in only works on ALEFIT’s official domain, and the user publishes through Vercel.

**Why:** the user asked to remember this.

**How to apply:** Treat Replit preview sign-in as non-authoritative; verify OAuth on the official ALEFIT domain and use Vercel for production publishing.
