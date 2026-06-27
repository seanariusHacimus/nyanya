# NANYA.UZ

Premium marketplace for finding **nannies, caregivers, tutors, and drivers** in Uzbekistan.
A discovery + trust + **pay-to-unlock-contacts** platform (not a booking/escrow service) — trilingual, with document verification, a Trust Score, and an admin moderation panel.

> Built per the technical specification (`nanya.uz- ТЗ.docx`). This is a working MVP: real auth, database, catalog, profiles, the contact-unlock money path, specialist onboarding, and admin moderation. Payments and SMS are **mocked behind clean interfaces** so the Uzbek providers (Click/Payme/Uzum, Eskiz) drop in without touching call sites.

## Tech stack

| Layer | Choice |
|---|---|
| Framework | **Next.js 16** (App Router, RSC + Server Actions, Turbopack) · TypeScript |
| Database | **PostgreSQL** + **Drizzle ORM** (local: Docker; prod: Railway — same driver) |
| Auth | **Better Auth** (email+password, roles via admin plugin, mock phone OTP) |
| UI | **Tailwind v4 + shadcn/ui**, "Luxury Minimal" theme (ivory / royal purple / champagne gold) |
| i18n | **next-intl** — Russian (default), Uzbek, English at `/[locale]/…` |
| Media | Specialist portraits + hero generated with **Higgsfield** (soul_2), in `public/media` |
| Testing | **Vitest** (Trust Score) · **Playwright** (E2E journeys) |

## Quick start

```bash
# 1. Install deps
npm install

# 2. Start Postgres (Docker) — maps host 5434 -> container 5432
docker compose up -d

# 3. Apply schema + seed demo data
npm run db:migrate
npm run db:seed

# 4. Run
npm run dev          # http://localhost:3000  (redirects to /ru)
```

`.env` already contains local dev defaults (gitignored). See `.env.example`.

### Demo accounts

| Role | Email | Password |
|---|---|---|
| Parent | `parent@nanya.uz` | `parent12345` |
| Specialist | `dilnoza@nanya.uz` | `spec12345` |
| Admin | `admin@nanya.uz` | `admin12345` |

Mock SMS OTP code (phone verification): **`123456`**.

## Deploy to Railway

The repo is Railway-ready: `railway.json` runs **migrate + seed automatically before each deploy**. The seed is guarded — it only populates an *empty* DB, so redeploys won't wipe data (set `FORCE_SEED=true` to reset).

1. **New Project → Deploy from GitHub repo** → select this repo.
2. **New → Database → PostgreSQL** (adds a `Postgres` service).
3. On the **app service → Variables**, set:
   ```
   DATABASE_URL        = ${{Postgres.DATABASE_URL}}
   BETTER_AUTH_SECRET  = <a 32-byte random string>
   BETTER_AUTH_URL     = https://${{RAILWAY_PUBLIC_DOMAIN}}
   NEXT_PUBLIC_APP_URL = https://${{RAILWAY_PUBLIC_DOMAIN}}
   PAYMENT_PROVIDER    = mock
   SMS_PROVIDER        = mock
   STORAGE_PROVIDER    = local
   LISTING_FEE_UZS     = 149000
   UNLOCK_FEE_UZS      = 29000
   ```
   Generate the secret: `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`
4. App service → **Settings → Networking → Generate Domain**, and **Settings → Region → Singapore** (closest Railway region to Uzbekistan). Redeploy so the domain is baked in.
5. On deploy, the `railway.json` pre-deploy step migrates + seeds automatically. Open the domain → catalog populated, demo logins work.

> Migrations (`src/db/migrate.ts`) and the seed run via `tsx` at deploy time, so `tsx` + `dotenv` are in `dependencies`; `drizzle-kit` stays dev-only (schema generation / studio).

## What works

- **Parent journey** — choose a category on the home page → browse the catalog with filters (city, price, experience, language, English, car, live-in, night, newborns) → open a profile (contacts gated, with Trust Score, reviews, video-intro slot) → **pay to unlock contacts** (mock provider) → phone / Telegram / WhatsApp revealed → favorite & review.
- **Specialist journey** — register → mock phone OTP → fill a profile → submitted for review → admin approves → published in the catalog with a Trust Score.
- **Admin journey** — analytics (parents, specialists, unlocks, revenue, conversion), specialist moderation (set Verified / Premium Verified, hide/publish), and user blocking.
- **Trust Score** — automatic 0–100 indicator (verification, opened contacts, profile age, engagement), recomputed on unlock. Unit-tested.

## Mock-first integrations (swap for production)

Selected by env var, behind interfaces — no call-site changes when going live:

- **Payments** (`PAYMENT_PROVIDER`, `src/lib/providers/payment.ts`) — `mock` → `payme` / `click` / `uzum`. The unlock flow creates a `payments` row and, on success, an idempotent `contact_unlocks` row.
- **SMS** (`SMS_PROVIDER`, `src/lib/providers/sms.ts`) — `mock` → `eskiz` / `playmobile`.

## Data residency (Uzbekistan, ZRU-547 — launch gate)

Per the plan, before public launch, **biometric media (selfies/face video/photos), medical certificates, and UZ phone numbers must be stored physically in Uzbekistan**; passports/names/email may live abroad with contracts. The dev MVP runs entirely on Docker/local; the storage split + database registration is a pre-launch task. Document upload is simulated in this MVP for the same reason.

## Project structure

```
src/
  app/[locale]/        # routes: home, catalog, catalog/[id], account, specialist, admin, auth…
  components/          # design system (trust-seal, specialist-card, header/footer) + UI
  db/                  # Drizzle schema, client, seed
  i18n/                # next-intl routing, request, navigation
  lib/
    actions/           # server actions (auth, unlock, specialist, admin)
    providers/         # payment & sms abstractions (mock-first)
    queries.ts         # data access
    trust-score.ts     # pure scoring fn (+ .test.ts)
messages/              # ru.json · uz.json · en.json
```

## Scripts

`npm run dev` · `build` · `test` (Vitest) · `db:migrate` · `db:seed` · `db:studio` · `lint`

## Notes

- Local dev uses a real Postgres in Docker on port **5434** (avoids common 5432/5433 conflicts).
- Production: point `DATABASE_URL` at Railway Postgres — the `postgres-js` driver is the same.
