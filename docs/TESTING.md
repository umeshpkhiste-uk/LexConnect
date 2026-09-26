# Testing

Two separate suites, deliberately kept apart:

## Unit tests — `npm test`

Fast, no network, run these constantly:

```bash
npm test          # run once
npm run test:watch
```

Covers: auth validation schemas (`src/features/auth/schemas.test.ts`),
date/time parsing (`src/shared/lib/dateInput.test.ts`).

## Integration / authorization tests — `npm run test:integration`

Hits your real Supabase project. Provisions two throwaway advocate accounts,
creates private client/case/financial data under one, and asserts the other
can't read or write any of it — the automated version of the mandatory
cross-tenant test in spec §57 (`src/__tests__/integration/authorization.test.ts`).

Requires the **service role key** (never the anon key — it needs
`auth.admin.createUser`/`deleteUser`, which the anon key can't do):

```bash
SUPABASE_SERVICE_ROLE_KEY=<service-role-secret> npm run test:integration
```

Get it from Supabase Dashboard → Project Settings → API → `service_role`
secret. **Never** put this key in `.env`, in the app itself, or commit it
anywhere — it bypasses every RLS policy in the database. Pass it as a
one-off shell env var, or keep it in a local, gitignored file you source
before running the command.

Without the key set, this suite prints a warning and skips cleanly (it does
not fail `npm test` or CI) — see the `describe.skip` guard at the top of the
file.

## What's covered vs. what isn't

Covered: input validation, date parsing, and the core cross-tenant
authorization boundary (clients, cases, transactions, private profile data).

Not yet covered by automated tests: UI/component tests for critical user
journeys (spec §45's "UI tests"), business-logic tests for the financial
summary views (those live in Postgres as SQL views — testing them means
either integration-testing against real data or porting the aggregation
logic to test against a local Postgres, neither done yet), and messaging/
connections integration tests beyond the manual verification already run
against the live project (documented in the session history — Advocate A
was confirmed unable to read or write Advocate B's clients, cases,
documents, transactions, hearings, meetings, tasks, or audit logs).
