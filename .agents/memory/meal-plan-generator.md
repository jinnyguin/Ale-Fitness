---
name: InvokeLLM meal plan generator
description: Why the meal plan uses server-side Python templates rather than any AI API
---

Free external AI APIs (https://ai.hackclub.com, https://text.pollinations.ai) return "Not found" or 429 from Replit's network IP. The fix was to implement `_generate_meal_plan()` in server.py that generates a full 7-day meal plan in the exact JSON schema the SPA expects, entirely server-side.

**Why:** External AI calls fail from Replit hosted servers due to IP blocks / rate limits.

**How to apply:** Keep `_generate_meal_plan()` as the primary path in `invoke_llm()`. Only use OpenAI if `OPENAI_API_KEY` is set (checked first as a premium fallback). Never rely on keyless third-party AI endpoints from the backend.
