# Lablog

A private, Locket-inspired daily photo journal for lab members. Authentication, profiles, posts, interactions, and images are backed by Supabase.

## Supabase setup

1. Create a Supabase project.
2. Open the Supabase SQL Editor and run `supabase/migrations/20260716000000_lablog_schema.sql`.
3. Run `supabase/migrations/20260717000000_social_interactions.sql` in the same SQL Editor.
4. Run `supabase/migrations/20260718000000_post_status_and_streaks.sql` to add post statuses, streak reminders, and the daily 20:00 Asia/Seoul reminder schedule.
5. Run `supabase/migrations/20260719000000_personal_missions.sql` to add personal missions and mission-specific reminders.
6. Run `supabase/migrations/20260720000000_onboarding_and_mission_scores.sql` to add one-time onboarding and duration-based mission scores.
7. Copy `.env.example` to `.env.local`.
8. In Supabase Project Settings > API, copy the Project URL and Publishable key into `.env.local`.
9. In Authentication > URL Configuration, set the Site URL to `http://localhost:3000` for local development.
10. Run `npm run dev`.

The migrations create profiles, posts, personal missions, reactions, comments, notifications, daily streak and mission reminders, an Auth signup trigger, and the public `post-images` Storage bucket. Row Level Security keeps writes tied to the signed-in member and notifications private to their recipient.

## Environment variables

    NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=YOUR_SUPABASE_PUBLISHABLE_KEY

Never expose a Supabase secret or service-role key through a `NEXT_PUBLIC_` variable.

## Validation

    npm run lint
    npm run build
