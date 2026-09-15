@AGENTS.md

# nyanya.uz — project guide

Marketplace connecting families in **Tashkent** with nannies, caregivers, household helpers and
drivers. It is **not** a booking or escrow platform: it publishes verified specialist profiles and
lets a family open a specialist's contacts.

**The service is free.** Opening contacts costs nothing — a logged-in family presses the button
and sees the phone. Telegram/WhatsApp were removed 2026-08-10: they were built from the
profile slug and pointed at strangers. Payment for contacts was introduced 2026-08-03 and
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
- `npm audit --omit=dev` — run on the first working day of each month. Fix with `npm audit fix`
  (never `--force`: it proposes downgrading drizzle-kit to 0.18). Bump `next` and
  `eslint-config-next` together, exact versions, within the major. Accepted residual: `esbuild`
  via drizzle-kit (moderate) — it only affects esbuild's dev server on a developer machine;
  production migrations run through drizzle-orm's migrator, not drizzle-kit.

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
  drivers see the licence. **Publication requires no document at all** (owner decision
  2026-09-13; from 2026-08-12 until then it required the approved photo): an admin can publish
  a profile without a photo and the catalogue shows the gendered `SpecialistAvatar`. The only
  publish gate is `summary.photoPending` — an uploaded photo nobody has reviewed must never
  reach families. **`specialist_profiles.photo_key` holds an approved photo and nothing else**:
  uploading writes the file to `documents` only, `reviewDocument` fills the column on approve
  and clears it on reject, both delete paths clear it, and `moderateProfile` clears it while
  publishing whenever the photo is not approved (rows whose photo was rejected before
  2026-09-13 still carry a stale pointer, so that clear is what repairs them). Losing the photo
  no longer flips a profile to `hidden`. A rejected photo counts as no photo for the wizard and
  the cabinet checklist, so the specialist is sent back to the photo screen. The catalogue shows
  a face (or the avatar), district, price and the person's own words. A profile with every step
  approved, recommended included, becomes «Премиум-профиль».
  `deriveVerificationLevel` computes the badge — it is never set by hand.
  Documents were paused 2026-08-10 (photo only) and re-enabled 2026-08-12;
  `ACTIVE_STEP_KEYS` in that file is the single switch — shorten the list to pause again.
- **An administrator can create a profile and upload documents for a specialist**
  (`src/lib/actions/admin-create-specialist.ts`, `admin-documents.ts`, `/admin/profiles/[id]`).
  Creating a profile also creates a real specialist account (email + password), because
  `specialist_profiles.user_id` is unique — one profile per user. A document uploaded by an
  administrator is marked approved immediately: the moderator uploaded it themselves.
- **DB**: `src/db/schema.ts`; auth tables in `src/db/auth-schema.ts` (Better Auth column keys are
  camelCase so the Drizzle adapter resolves them). Local = Postgres on 5434, prod = Railway.

## Copy that must stay true

The site no longer claims documents are checked before publication — publication needs only the
approved photo, and the certificates follow. Any new page saying otherwise is a false promise to
families; the honest line is «модератор проверяет анкету и фотографию до публикации», with the
document check earning «Премиум-профиль» afterwards.

**Documents are voluntary, and the copy says so everywhere** (owner decision, 2026-09-11, second
batch of edits). The public pages no longer describe a «проверка специалистов»: `/verification`
is titled «Как разместить анкету на nyanya.uz» (заполнение → модерация → публикация) and lists the
documents a specialist *may* add — including «Сертификаты и дипломы» and «Рекомендательные
письма», which have no upload slot yet; the nav and footer link reads «Как разместить анкету».
Nothing may call a document «обязательно», and nothing may say text edits go to re-moderation —
`saveSpecialistProfile` saves a live profile in place; only replacing a document sends it back to
`pending_review`. The legal entity ООО «NYANYA» does not exist yet, so terms, privacy and contacts
name «администрация сайта nyanya.uz» until the owner registers one.

**Badge names are neutral** (owner decision, 2026-09-03): a published profile is «Стандартный
профиль», one with every document approved is «Премиум-профиль». The old «Проверена» /
«Премиум-проверен» asserted a check that had not happened — supplying documents is the
specialist's own choice, and nobody had seen a standard profile's. Only premium may promise
verification, and only premium carries the seal-with-a-tick icon; the standard badge uses a plain
ID-card mark, because the seal reads as "verified" on its own. **An active profile without an
approved photo carries no badge at all** (`UiSpecialist.verification` is null, 2026-09-13):
«Стандартный профиль» asserts a photo the moderator accepted, and a profile published with the
placeholder avatar has none. **These words live once**, in
`PROFILE_TIER` (`lib/specialists-shared.ts`), and `VERIFICATION_LABEL`/`VERIFICATION_MEANING`
derive from it. They used to be retyped in the card, the profile page and the admin panel, and
duly drifted — the catalogue said «Проверена» while the admin said «Проверен модератором».

**The trust index is gone from the interface** (owner decision, 2026-09-03). It was displayed on
cards, profiles, the cabinet and three marketing pages, and it was never computed — every profile
showed 0. `specialist_profiles.trust_score` still exists in the database, unread; nothing writes
to it. What ranks the catalogue now is the families' rating, then the review count, then recency.
Do not reintroduce the index without a formula that actually runs.

The home page's `trustFeatures` block is rendered by **two** pages — the home page and `/about` —
each with its own icon map keyed by `feature.icon`. Renaming a key means changing both maps; the
lookup is deliberately un-cast so a mismatch fails the build instead of the browser.

## Specialist onboarding — one track

A specialist registers in three screens (email → code → password and phone; **no name — the
profile asks for the passport name itself**) and lands straight in the profile wizard
(`/specialist?anketa=1`). The wizard is one track of seven screens: category, ФИО + birth date,
**photo**, district + price, experience/about (optional), languages/skills (optional), and a final
«Проверьте и отправьте» screen that shows the card as a family will see it and calls
`submitForModeration`. There is no submit button in the cabinet any more — submission lives at
the end of the wizard, so there is exactly one place to do it. Reopening the wizard resumes at the
first incomplete required screen (`firstIncompleteScreen` in `profile-wizard.tsx`).

Consequences to keep in mind: `saveSpecialistProfile` accepts an **empty name** (the first screen
saves before the name is known) and writes the name back to `user.name` so the cabinet header and
emails match the profile; `submitForModeration` no longer requires `description` (owner decision,
2026-09-03) but still rejects «Без имени». Passport and certificates are not part of onboarding —
the documents wizard (`scope: "documents"`) excludes the photo and exists for «Премиум-профиль».
`/register?role=specialist` preselects the role and replaces the role cards with a one-line notice.

## Gender and the placeholder avatar

`specialist_profiles.gender` (`female` | `male`, nullable; migration 0008, owner decision
2026-09-11) is asked on the wizard's «Как вас зовут?» screen as a two-chip choice and is
**required** for submission — `nameReady`, the cabinet's `computeStepDone.who` and the server
gate in `submitForModeration` all check it, so keep the three in step. `saveSpecialistProfile`
writes it only when a value is present: a tab holding the pre-gender form must not null out a
value the database already has. Admins edit it in the profile editor and choose it when creating
a specialist; the admin notification about a new submission conjugates «отправила/отправил» from
it. Profiles created before the column exist with `gender = null`; the owner fills those in by
hand (`scripts/set-gender.mjs --map` — a person decides from the photo and the name, the script
only applies the map, refuses a mismatched name and never overwrites a value).

`SpecialistAvatar` (`components/specialist-avatar.tsx`) is the single no-photo fallback —
catalogue card, profile hero, unlock panel, family's contact list, wizard preview and cabinet
header all use it. By gender it shows `public/images/avatar-female.webp` / `avatar-male.webp`
— stylised gouache busts generated on Higgsfield (`gpt_image_2`, 2k/high, 2026-09-12; the other
candidate pairs are not in the repo) and deliberately not photo-like, so a placeholder cannot
pass for a real photo. The files are 960×1200 WebP q88 produced by
`scripts/optimize-avatar.mjs` (top-anchored cover resize + light sharpen; it writes the encoded
buffer directly — piping it through sharp again re-encodes at q80 and blurs it) and are served
`unoptimized`, because the Next image optimizer would re-encode them at quality 75. Rendering
uses `fill` + `object-cover object-top`, so one file fits 4:5, 3:4 and square containers. With
gender null the component falls back to the initials monogram (inline SVG). Do not add per-site
fallbacks again — that is how the initials markup was copied four times. Gender is not shown to
families as text (owner decision, 2026-09-12): it only drives the avatar and is visible to admins.

## Premium — promises that the code keeps

`PREMIUM_BENEFITS` (`lib/specialists-shared.ts`) is the only place the premium pitch is worded;
the cabinet card, `/specialist/premium` and the emails render it. **Every entry must be true in
code**: the catalogue orders by `verification_level` before rating (all three `orderBy` sites in
`queries/specialists.ts` and the client default sort in `catalog-view.tsx`), the «Только
премиум-профили» toggle exists, and the seal badge is premium-only. Do not add a benefit here
without implementing it — that is exactly how the old «documents checked before publication» lie
came about. The card shows after submission and only while `tier !== "premium_verified"`;
`/specialist/premium` lists the category's documents (never the photo) with upload cards.

## Specialist availability

A published specialist can pause their own listing from the cabinet — the switch writes
`specialist_profiles.employed`, **not** the profile status. Status `hidden` belongs to the
moderator; if the cabinet wrote there, a specialist could undo a moderator's decision with one
click. Paused profiles drop out of the catalogue, the similar-profiles strip and the home-page
reviews, but stay reachable by direct link with a notice — families keep and forward those links,
and a dead page would just confuse them.

## Roles and access

`parent` (default) · `specialist` · `admin`. Role is chosen at signup; `admin` is set manually.

**Two layers guard the private pages, and only the second one is real.** `src/proxy.ts` (Next 16 renamed middleware to proxy) does an
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
  Locally, without `RESEND_API_KEY`, `send()` only logs the subject; set `EMAIL_DUMP_DIR` to a
  directory and every mocked email is also written there as an `.html` file you can open in a
  browser — that is how the templates are checked before they reach a real inbox. Three
  specialist emails exist: welcome (rewritten 2026-09-03 for the one-track onboarding, with the
  premium block), «принята на модерации», and «опубликована» (premium block only for a standard
  profile). The premium wording in all of them comes from `PREMIUM_BENEFITS`.
- **Signup is email-OTP, login is email + password.** Better Auth's own `/sign-up/email` is switched
  off (`disableSignUp` + `disabledPaths`, 2026-09-15): it created a signed-in account on any address
  without the code and told a registered address from a free one. Every `?next=` goes through
  `safeNext` (`lib/safe-next.ts`) — `startsWith("/")` let `//evil.com` send people off-site after a real
  login, and the check must run on the parsed path because `/a/..//evil.com` normalises to `//evil.com`.
  Run `node --experimental-strip-types --test src/lib/safe-next.test.mjs` after touching it. The code proves the address once, at
  registration; afterwards only the password is used. The password is written by `completeProfile`
  (Better Auth has no public set-password endpoint) and only when none exists yet.
- **Password recovery is `/reset-password`** (added 2026-09-01): address → code from the email →
  new password → automatic sign-in. It runs on the `emailOTP` plugin's own endpoints, so the code
  lives under a different key than the sign-in code and the two cannot be swapped. The request
  endpoint answers identically for a known and an unknown address — the page must never reveal who
  is registered — and Better Auth rate-limits it to 3 requests per minute per IP. A successful
  reset revokes that user's other sessions (`revokeSessionsOnPasswordReset`).
  Entering an **already registered** address in the signup form no longer opens the third step:
  `signIn.emailOtp` signs such a person in, and the step used to overwrite their name and phone
  while leaving the forgotten password in place (`registrationState` in `complete-profile.ts`).
- `nyanya.uz` is connected. `BETTER_AUTH_URL` / `NEXT_PUBLIC_APP_URL` point at `https://www.nyanya.uz`
  (the apex still resolves to an old host for some resolvers). `trustedOrigins` in `lib/auth.ts`
  lists apex, www and the Railway domain — Better Auth answers 403 INVALID_ORIGIN for anything
  else, and `curl` will not reveal it because it sends no `Origin` header.
- SMS is mocked; the Uzbekistan data-residency requirement for biometric/medical documents is
  unaddressed and remains the launch gate.

## Plan

`../docs/BACKEND-PLAN.md` — phases 1–7 are complete. Ф8 (notifications, toasts, skeletons) is next,
then Ф9 (production acceptance + a security review of action-level roles/ownership/IDOR).
