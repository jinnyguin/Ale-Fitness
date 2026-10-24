---
name: ALEFIT email-code authentication
description: Product constraints for passwordless email-code sign-in and signup.
---

ALEFIT's requested new passwordless option is a six-digit Supabase email code for signup and sign-in. Preserve Google and email/password authentication, use the existing member/session and plan-routing flows, and do not reintroduce Apple or Facebook unless the user asks. Do not treat the code feature as verified or enable it for members until Supabase's numeric-code template and real email delivery are confirmed.

**Why:** The user explicitly prioritized email codes instead of Apple, asked to avoid duplicate accounts and lost plans, and requires real delivery verification before claiming the feature works.

**How to apply:** Keep OTP signup tied to the existing ALEFIT profile and onboarding-plan persistence path. Before enabling production, verify the Supabase Magic Link template renders `{{ .Token }}`, configure a member-capable SMTP sender, and complete controlled-inbox tests for both new and existing users.
