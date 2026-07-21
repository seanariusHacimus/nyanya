# Iteration 01 — Security hardening, docs, optimization

**Date:** 2026-06-27 · **Focus:** secure the endpoints/actions, document the project, optimize media.

## Security audit

**Attack surface reviewed:** the only custom write endpoints are **Server Actions** (`src/lib/actions/*`) plus Better Auth's `/api/auth/*`. There are no other custom API routes.

**Reviewed and found sound (no change needed):**
- **Authorization** — every mutating action resolves the session server-side; admin actions go through `requireAdmin()` (role check) *and* the `/admin` page guard (defense in depth). `saveSpecialistProfile` writes only the caller's own profile (keyed by session `userId`).
- **Contact gating** — specialist contacts are fetched server-side **only** after `isUnlocked()` is true; never serialized to the client otherwise.
- **SQL** — all queries go through Drizzle (parameterized). The one `ilike('%' + q + '%')` search binds the value, not string-built SQL.
- **Auth** — Better Auth manages session cookies (HttpOnly), CSRF, password hashing (scrypt), and **rejects sign-in for banned users** (admin plugin). Next Server Actions add origin-based CSRF protection.
- **Mass assignment** — actions build their DB `values` from explicit fields, never spreading client input.

**Hardened in this iteration:**
- Added `src/lib/validation.ts` — Zod schemas (`uuidSchema`, `profileInputSchema`, `verificationLevelSchema`, `profileStatusSchema`, `otpCodeSchema`).
- **Every server action now validates input** (server actions are a public RPC surface — clients can post arbitrary payloads regardless of TS types):
  - `unlockContact` / `toggleFavorite` — reject non-UUID `specialistId`; **unlock now requires `status = 'active'`** (can't unlock hidden/draft/rejected profiles).
  - `saveSpecialistProfile` — full Zod validation: bounded `priceAmount` (0–100M) and `experienceYears` (0–60), enum `category`/`priceUnit`/`englishLevel`, length-capped text, `birthDate` format. Uses the parsed/validated data, not raw input.
  - admin actions — validate UUIDs and enum values for `level`/`status` before mutating.

**Known/accepted for MVP (tracked):** payments & SMS are mock; document upload simulated; `BETTER_AUTH_SECRET` is a dev placeholder (rotate for prod). No rate-limiting or CSP yet (see follow-ups).

## Optimization
- Resized the 5 generated source images to ≤1100px wide → `public/media` **17M → 8.5M**. (User-facing delivery was already optimized by `next/image` → webp.)

## Docs
- Added `CLAUDE.md` (concise project guide, kept the `@AGENTS.md` import), `docs/ARCHITECTURE.md` (how it's built), `docs/CHANGELOG.md` (index), and this file.

## Follow-ups (next iterations)
- Convert portrait sources to JPEG/WebP for a larger size cut (needs reference updates + reseed).
- Add `priority` to above-the-fold catalog images (addresses the LCP hint).
- Rate-limiting on `unlockContact` and auth; add security headers / CSP.
- Re-generate the remaining specialist portraits when the Higgsfield daily cap resets.
- Add a Playwright E2E spec to the repo (currently verified interactively).
