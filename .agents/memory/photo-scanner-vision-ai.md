---
name: Photo scanner vision AI provider
description: Why the calorie photo scanner uses puter.js client-side, and what each provider's blocker is
---

The calorie-tracker photo scanner needs a real vision-capable LLM because food cannot be identified from a photo with offline/template logic. It now uses Groq server-side so end users do not need a provider account or popup.

- **Groq**: primary provider through its OpenAI-compatible endpoint using a current multimodal Qwen model. The app owner configures the key, while the key stays server-side. The free tier is suitable for prototyping but has rate limits.
- **OpenAI**: retained only as a legacy fallback when Groq is not configured. The configured account previously had no available usage credits and should not be relied on.
- **Google Gemini**: has a free vision tier, but creating a key previously required an age-gated Google AI Studio flow in this project.
- **Puter**: removed because its end-user sign-in popup was unreliable in the Replit preview iframe.

**How to apply:** Keep vision calls behind the AleFit server endpoint, validate image type and size before forwarding, return structured nutrition JSON, and never expose provider keys to the browser.
