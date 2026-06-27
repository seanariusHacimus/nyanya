@AGENTS.md

# NANYA.UZ — project guide for Claude

Premium **pay-to-unlock-contacts** marketplace (nannies / caregivers / tutors / drivers) for Uzbekistan. Trilingual (RU default · UZ · EN). It is **not** a booking/escrow platform — it connects families and specialists and gates contact reveal behind a (mock) payment.

## Commands
- `npm run dev` — app at http://localhost:3000 (→ `/ru`)
- `docker compose up -d` — Postgres (host port **5434**)
- `npm run db:migrate` · `db:seed` · `db:studio`
- `npm run test` — Vitest (Trust Score) · `npm run lint` · `npx tsc --noEmit`

## Stack
Next.js 16 (App Router, RSC + Server Actions, Turbopack) · TypeScript · PostgreSQL + Drizzle · Better Auth · Tailwind v4 + shadcn/ui (**base-ui**, not Radix) · next-intl.

## Conventions
- **Server actions are the mutation surface** (`src/lib/actions/*`). Every action validates input with Zod (`src/lib/validation.ts`) and checks session + role + ownership. Admin actions call `requireAdmin()`.
- **Providers are mock-first behind interfaces**: `src/lib/providers/payment.ts` + `sms.ts`, chosen by `PAYMENT_PROVIDER` / `SMS_PROVIDER` env. Never hardcode a provider at a call site.
- **i18n**: routes live under `src/app/[locale]/`; UI strings in `messages/{ru,uz,en}.json` via `useTranslations` / `getTranslations`; localized DB names via `localizedName()`.
- **shadcn = base-ui**: compose Link-as-button with `buttonVariants()` (no Radix `asChild`). `typedRoutes` is **off** (next-intl `Link` uses locale-relative hrefs).
- **Design tokens** in `src/app/globals.css` (`--royal`, `--champagne`, `--ivory`; `font-display` = Cormorant). Signature element = the gold `TrustSeal`.
- **DB**: schema in `src/db/schema.ts`; auth tables in `src/db/auth-schema.ts`. Local = Postgres on 5434; prod = Railway (same `postgres-js` driver).

## Roles
`parent` (default) · `specialist` · `admin`. Account type is chosen at signup; `admin` is set only via seed.

## Demo logins
`admin@nanya.uz`/`admin12345` · `parent@nanya.uz`/`parent12345` · `dilnoza@nanya.uz`/`spec12345`. Mock OTP: **`123456`**.

## Mocked / pre-launch — do NOT assume these are real
Payments, SMS, and document upload are simulated. The Uzbekistan data-residency split (biometric/medical/phone stored in UZ) is the launch gate. Some specialists use monogram avatars (Higgsfield daily generation cap).

## Change history
See `docs/` — `ARCHITECTURE.md` (how it's built) and `docs/changes/*.md` (per-change logs), indexed in `docs/CHANGELOG.md`.
