# Backend setup (Supabase)

CounselConnect uses [Supabase](https://supabase.com) for Postgres, authentication,
storage, and (later) realtime/edge functions. The mobile app talks to it via
`@supabase/supabase-js`; no separate custom API server exists yet.

## 1. Create a project

1. Create a free Supabase project at https://supabase.com/dashboard.
2. Note the **Project URL** and **anon public key** from
   Project Settings -> API.

## 2. Configure local environment

```bash
cp .env.example .env
```

Fill in:

```
EXPO_PUBLIC_SUPABASE_URL=https://<your-project-ref>.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
```

Never commit `.env` — it's gitignored. The anon key is safe to ship to the
client; every table it can touch is gated by Row Level Security policies
defined in the migrations below.

## 3. Apply the database schema

Migrations live in `supabase/migrations/`. Apply them in order, either via
the Supabase CLI or by pasting each file into the SQL Editor in the
dashboard, in filename order:

```bash
npx supabase login
npx supabase link --project-ref <your-project-ref>
npx supabase db push
```

Current migrations (Phase 1):

- `0001_advocate_profiles.sql` — advocate profile table, verification status
  enum, the `public_advocate_profiles` view (public network data only), and
  RLS policies enforcing owner-only access to the private table.
- `0002_audit_log.sql` — append-only audit log foundation.

## 4. Configure email auth

In the Supabase dashboard: Authentication -> Providers -> Email should
already be enabled by default. Under Authentication -> URL Configuration,
add `counselconnect://` as a redirect URL (used by the password-reset flow
in `src/features/auth/api.ts`).

Email confirmation is on by default, which is why sign-up routes to
`(auth)/verify-email` instead of straight into the app.

## 5. Run the app

```bash
npm install
npx expo start
```

## What's real vs. what's next

Implemented in this phase, against your real Supabase project:

- Email/password sign-up with email confirmation
- Sign-in, sign-out, session persistence (encrypted, device keychain-backed)
- Forgot-password email flow
- Advocate profile row auto-created on sign-up, readable/editable only by
  its owner (verified via RLS, not just app logic)
- Profile edit screen writing real rows

Not yet implemented (later phases, per the roadmap in the master prompt):
client/case management, hearings/calendar, documents, financial tracking,
networking/messaging, notifications, admin panel, verification workflow UI,
offline sync, and the full data model in spec §42.
