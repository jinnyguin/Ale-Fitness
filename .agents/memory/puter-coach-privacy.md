---
name: Puter-only Coach
description: Product decision for using Puter.js as ALEFIT Coach's only AI provider
---

Puter must be the only AI provider for ALEFIT Coach for all members. During ALEFIT account creation, prepare a temporary Puter identity with `puter.auth.signIn({attempt_temp_user_creation:true})` rather than requiring a permanent Puter account or password. State that the temporary identity may not transfer across devices or be recoverable after browser data is cleared. Before any coaching data is sent, separately tell the member that their question, recent Coach conversation, current plan/session, and recent training/readiness details go to Puter; readiness may include soreness or pain. ALEFIT does not attach the member's name or email, but anything they type may contain identifying details. Require explicit consent before sending context. Do not fall back to ALEFIT's server provider.

**Why:** The user wants every member to use Puter to prevent ALEFIT Coach from using provider API keys that could charge the app owner, but does not want members redirected to Puter sign-in or asked to create a permanent Puter account. They chose temporary Puter identities during ALEFIT signup instead.

**How to apply:** Prepare the temporary identity as part of both email and Google signup; the Puter SDK may still display its own secure popup/permission UI and must be invoked from a user action. Gate coaching data sharing behind separate, explicit consent; disable the server-side Coach route and never fall back to OpenAI or OpenRouter for coaching. Keep other app features on their existing provider routes unless the user changes that scope.
