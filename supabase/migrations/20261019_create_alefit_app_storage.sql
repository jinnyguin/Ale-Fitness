-- Alefit app-owned records. Authentication remains in Supabase Auth; this
-- stores private, server-managed profiles and flexible user-owned entities.
BEGIN;

CREATE TABLE IF NOT EXISTS public.profiles (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL DEFAULT '',
    full_name TEXT NOT NULL DEFAULT '',
    bio TEXT NOT NULL DEFAULT '',
    avatar_url TEXT NOT NULL DEFAULT '',
    daily_calorie_goal INTEGER NOT NULL DEFAULT 2000,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.entities (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    data JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS profiles_email_lower_idx
    ON public.profiles (LOWER(email));

CREATE INDEX IF NOT EXISTS entities_owner_type_created_idx
    ON public.entities (user_id, entity_type, created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS entities_onboarding_session_unique
    ON public.entities (user_id, ((data->>'onboarding_id')))
    WHERE entity_type = 'OnboardingPlan' AND data ? 'onboarding_id';

CREATE UNIQUE INDEX IF NOT EXISTS entities_workout_feedback_unique
    ON public.entities (user_id, ((data->>'feedback_id')))
    WHERE entity_type = 'WorkoutLog' AND data ? 'feedback_id';

-- Alefit accesses these tables only through its authenticated server API.
-- Keep Supabase's browser-facing API roles from reading app data directly.
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.entities ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.profiles, public.entities FROM anon, authenticated;

COMMIT;
