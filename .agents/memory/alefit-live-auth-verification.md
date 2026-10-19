---
name: ALEFIT live auth verification
description: Check production routing assets and deployment state before debugging sign-in behavior.
---

For production sign-in issues, verify that the current Vercel production deployment is ready and serving the expected auth scripts before treating a live failure as a callback-code defect. During a deployment transition, the custom domain may still serve an older build, and a missing static script can appear as an application-level server error.

**Why:** ALEFIT's production domain served an older build while the current Vercel deployment was building; the live routing script returned HTTP 500 until the deployment became ready.

**How to apply:** Compare the latest production deployment commit and readiness with the workspace, then fetch the callback, login, and routing assets from the live domain before testing sign-in behavior.
