@AGENTS.md

# nyanya.uz — project guide

Marketplace connecting families in **Tashkent** with nannies, caregivers, tutors and drivers.
It is **not** a booking or escrow platform: it publishes verified specialist profiles and lets a
family open a specialist's contacts. Opening contacts is **free but requires an account** — the
`contact_unlocks` row is kept for funnel metrics and to notify the specialist.

Interface language is **Russian only**. There is no `next-intl` and no `[locale]` routing.

## Commands

- `npm run dev` — http://localhost:3000
- `docker compose up -d` (from the repository root) — local Postgres on host port **5434**
- `npm run db:generate` · `npm run db:migrate` · `npm run db:studio`
- `npm run lint` · `npx tsc --noEmit`

There is **no test suite** — no `npm run test`, no Vitest. Verification is typecheck + lint +
`npm run build`.

## Stack

Next.js 16 (App Router, RSC + Server Actions, Turbopack) · React 19 · TypeScript ·
PostgreSQL + Drizzle · Better Auth · Tailwind v4 · `@phosphor-icons/react` · `motion` ·
Resend (email) · `@aws-sdk/client-s3` (documents).

## Conventions

- **Server actions are the mutation surface** (`src/lib/actions/*`). Every action validates with
  Zod and re-checks session + role + ownership **inside the action** — an action is a network
  endpoint, so a guard in the page or component is not a guard.
- **Reads live in `src/lib/queries/*`** and are called from server components.
- **Document storage is provider-based** (`src/lib/storage/`): `save` / `open` / `remove`, chosen
  by `STORAGE_PROVIDER`. `s3` in production, `local` (writes to `.storage/`) when S3 variables are
  absent. Never touch the filesystem or the S3 SDK from a call site.
- **Verification documents are private.** The bucket is not public; files are served only through
  `/api/documents/[...key]`, which checks owner-or-admin. Profile photos are the one public
  exception.
- **Verification steps have a single source of truth**: `src/content/verification-steps.ts`, used
  by the specialist form, the server actions and the admin queue.
- **DB**: `src/db/schema.ts`; auth tables in `src/db/auth-schema.ts` (Better Auth column keys are
  camelCase so the Drizzle adapter resolves them). Local = Postgres on 5434, prod = Railway.

## Roles and access

`parent` (default) · `specialist` · `admin`. Role is chosen at signup; `admin` is set manually.
`/account`, `/specialist` and `/admin` each guard themselves in `page.tsx` — **there is no
middleware**. Blocking a user goes through Better Auth's admin plugin, which also revokes active
sessions.

## Profile lifecycle

`draft → pending_review → active | rejected | hidden`. A `slug` is generated on first publish
(`src/lib/slug.ts`, transliterates Cyrillic). Rejection always carries `moderation_note`, which the
specialist sees in their cabinet.

## Pre-launch — do NOT assume these are real

- **Email delivery is broken.** No verified Resend domain, so `EMAIL_FROM` falls back to the shared
  `onboarding@resend.dev`, which Resend restricts to the account owner and Gmail now rejects.
- `BETTER_AUTH_SECRET` in production is still an unsubstituted placeholder.
- `nyanya.uz` is not connected; the app is served from `nyanya-production.up.railway.app`.
- SMS is mocked; the Uzbekistan data-residency requirement for biometric/medical documents is
  unaddressed and remains the launch gate.

## Plan

`../docs/BACKEND-PLAN.md` — phases 1–7 are complete. Ф8 (notifications, toasts, skeletons) is next,
then Ф9 (production acceptance + a security review of action-level roles/ownership/IDOR).
