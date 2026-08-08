@AGENTS.md

# nyanya.uz — project guide

Marketplace connecting families in **Tashkent** with nannies, caregivers, household helpers and
drivers. It is **not** a booking or escrow platform: it publishes verified specialist profiles and
lets a family open a specialist's contacts.

**The service is free.** Opening contacts costs nothing — a logged-in family presses the button
and sees the phone, Telegram and WhatsApp. Payment for contacts was introduced 2026-08-03 and
removed 2026-08-08 by the owner; `src/lib/payments/` is gone and no page may mention price,
payment or «оплатить». The `payments` table and `contact_unlocks.payment_id` still exist in the
schema but are unused — nothing writes to them.

The `tutor` category key is still `tutor` in the database, but is labelled **«Помощник по
хозяйству»** in the interface.

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
  by the specialist form, the server actions, the admin queue and the public pages. Steps are
  **required or recommended**, and the list is **category-aware** (`stepsForCategory`) — only
  drivers see the licence. Publication requires every *required* step approved; a profile with
  every step approved, recommended included, becomes «Премиум-проверен».
  `deriveVerificationLevel` computes the badge — it is never set by hand.
- **DB**: `src/db/schema.ts`; auth tables in `src/db/auth-schema.ts` (Better Auth column keys are
  camelCase so the Drizzle adapter resolves them). Local = Postgres on 5434, prod = Railway.

## Roles and access

`parent` (default) · `specialist` · `admin`. Role is chosen at signup; `admin` is set manually.

**Two layers guard the private pages, and only the second one is real.** `src/middleware.ts` does an
optimistic check for the session cookie so an anonymous request is redirected before Next starts
streaming (`loading.tsx` creates a Suspense boundary, which otherwise commits a 200 before the page
can call `redirect()`). The cookie proves nothing on its own — every one of `/account`,
`/specialist`, `/admin` still validates the session and checks the role in its own `page.tsx`, and
so does every server action.

Blocking a user goes through Better Auth's admin plugin, which also revokes active sessions.

## Profile lifecycle

`draft → pending_review → active | rejected | hidden`. A `slug` is generated on first publish
(`src/lib/slug.ts`, transliterates Cyrillic). Rejection always carries `moderation_note`, which the
specialist sees in their cabinet.

## Pre-launch — do NOT assume these are real

- **Email works** (since 2026-08-04): `nyanya.uz` is verified in Resend and `EMAIL_FROM` is set to
  `NYANYA.UZ <noreply@nyanya.uz>`. The production Resend key is send-only, so it cannot list
  domains or read delivery status — confirm delivery from the inbox, not the API.
- **Signup is email-OTP, login is email + password.** The code proves the address once, at
  registration; afterwards only the password is used. The password is written by `completeProfile`
  (Better Auth has no public set-password endpoint) and only when none exists yet. There is still
  no password-recovery flow.
- `nyanya.uz` is connected. `BETTER_AUTH_URL` / `NEXT_PUBLIC_APP_URL` point at `https://www.nyanya.uz`
  (the apex still resolves to an old host for some resolvers). `trustedOrigins` in `lib/auth.ts`
  lists apex, www and the Railway domain — Better Auth answers 403 INVALID_ORIGIN for anything
  else, and `curl` will not reveal it because it sends no `Origin` header.
- SMS is mocked; the Uzbekistan data-residency requirement for biometric/medical documents is
  unaddressed and remains the launch gate.

## Plan

`../docs/BACKEND-PLAN.md` — phases 1–7 are complete. Ф8 (notifications, toasts, skeletons) is next,
then Ф9 (production acceptance + a security review of action-level roles/ownership/IDOR).
