---
name: Puter-only Coach
description: Product decision for using Puter.js as ALEFIT Coach's only AI provider
---

Puter must be the only AI provider for ALEFIT Coach for all members. Before any coaching data is sent, tell the member that their question, recent Coach conversation, current plan/session, and recent training/readiness details go to Puter; that Puter requires its own sign-in and permission; and that its per-user monthly allowance can lead to an upgrade prompt when exhausted. Require explicit consent. Do not fall back to ALEFIT's server provider.

**Why:** The user chose Puter for all members to prevent ALEFIT Coach from using provider API keys that could charge the app owner. Puter usage is instead tied to each member's own account and allowance.

**How to apply:** Gate browser-side Puter use behind a clear consent action; disable the server-side Coach route and never fall back to OpenAI or OpenRouter for coaching. Keep other app features on their existing provider routes unless the user changes that scope.
