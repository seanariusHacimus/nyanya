# Architecture — how NANYA.UZ is built

A reference for how the pieces fit together. For per-change history see `CHANGELOG.md`.

## Core model
A **discovery + trust + pay-to-unlock-contacts** marketplace. Parents browse a verified catalog for free, then pay to reveal a specialist's phone / Telegram / WhatsApp. Specialists pay a (mock) listing fee and are admin-verified. The platform never handles the actual service payment and disclaims liability (footer/legal pages) — this is why there is **no booking, escrow, or in-app chat**.

## Journeys
- **Parent**: home category chooser → catalog (filters) → profile (gated contacts, Trust Score, reviews) → pay-to-unlock → contacts revealed → favorite / review.
- **Specialist**: register → mock phone OTP → fill profile → `pending_review` → admin approves → `active` in catalog.
- **Admin**: analytics + specialist moderation (set verification level, hide/publish) + user blocking.

## Request flow & security
- **Pages** are React Server Components. Auth-gated pages (`account`, `specialist`, `admin`) read the session via `getSession()` and `redirect()` when unauthorized; `admin` additionally checks `role === "admin"`.
- **Mutations are Server Actions** in `src/lib/actions/`. Each one: (1) validates input with Zod (`src/lib/validation.ts`), (2) resolves the session server-side, (3) enforces role/ownership. Admin actions go through `requireAdmin()` (defense in depth with the page guard).
- **Contact gating is server-side**: a specialist's contact details are only queried (`getSpecialistContacts`) after `isUnlocked(parentId, specialistId)` is true; they are never sent to the client otherwise.
- **DB access** uses Drizzle (parameterized) — no string-built SQL on user input. Better Auth handles auth cookies, CSRF, and bans banned users at sign-in.

## Data model (`src/db/schema.ts`)
`user` (+ role/phone/locale, Better Auth) · `specialist_profiles` · `documents` · `payments` · `contact_unlocks` (unique parent+specialist) · `favorites` · `reviews` · `complaints` · `notifications` · `push_subscriptions` · `cities` / `districts`. Auth tables (`session`, `account`, `verification`) in `auth-schema.ts`.

## Trust Score
`src/lib/trust-score.ts` — a pure 0–100 function of verification level, opened contacts, profile age, and engagement. Recomputed on unlock. Unit-tested (`trust-score.test.ts`).

## Providers (mock-first)
`src/lib/providers/payment.ts` and `sms.ts` expose interfaces with a mock implementation, selected by env. Real Click/Payme/Uzum and Eskiz/PlayMobile slot in without call-site changes. The unlock flow records a `payments` row and, on success, an idempotent `contact_unlocks` row.

## i18n
next-intl with `/[locale]/` routing (`src/i18n/`). RU default. Messages in `messages/{ru,uz,en}.json`. Reference data (cities/districts) carries RU/UZ/EN columns chosen by `localizedName()`.

## Design system
Tailwind v4 theme in `src/app/globals.css`: ivory canvas, royal purple, champagne gold; Cormorant display + Manrope body. Components: `TrustSeal` (signature), `SpecialistCard`, `SpecialistAvatar` (photo or monogram fallback), `VerificationBadge`, header/footer.

## Local dev
Postgres in Docker on host **5434** (5432/5433 commonly taken). Generated media (Higgsfield) in `public/media`. Started on PGlite, switched to real Postgres for concurrency safety.
