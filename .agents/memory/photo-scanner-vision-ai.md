---
name: Photo scanner vision AI provider
description: Why the calorie photo scanner uses puter.js client-side, and what each provider's blocker is
---

The calorie-tracker photo scanner needs a real vision-capable LLM (food can't be identified from a photo with offline/template logic). Provider landscape discovered for this repl:

- **OpenAI** (`OPENAI_API_KEY` secret): key is valid (`/v1/models` returns 200) but the account has **no credits** — chat/vision calls return HTTP 429 `insufficient_quota`. A 200 from `/v1/models` does NOT mean quota exists; always test an actual completion to confirm.
- **Google Gemini** (`generativelanguage.googleapis.com`): reachable from the Replit server, genuinely free tier with vision, but creating a key needs Google AI Studio which has an age gate. Not usable when the owner can't pass it.
- **Groq**: server-reachable (403 on root = reachable) but needs a key.
- **puter.js**: free, no API key, no card. **This is what the scanner uses.**

**puter.js gotchas (the why behind the implementation):**
- It requires a puter.com sign-in. The fix that made it work was calling the auth sign-in explicitly inside the scan button handler (a user gesture) *before* the AI call — otherwise the popup is blocked by browsers and the call fails silently.
- The sign-in popup is blocked by the Replit **preview iframe**. The scanner only works reliably in the **published app or a full browser tab**, not the in-editor preview. A UI hint tells users this.

**How to apply:** Don't re-attempt OpenAI server-side vision unless credits are added. Keep puter.js client-side with an explicit sign-in call on user gesture.
