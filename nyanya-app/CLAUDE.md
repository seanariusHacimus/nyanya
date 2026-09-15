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

**Free is not unlimited** (owner decision, 2026-09-16): one free account used to pull every
specialist's phone in minutes. `unlockContacts` allows at most **20 new contacts per rolling 24 h**
and **one new open per 3 s** per account, overridable by `CONTACT_UNLOCK_DAILY_CAP` /
`CONTACT_UNLOCK_MIN_INTERVAL_SEC` (parsed by `parseUnlockLimits` in `lib/unlock-limits.ts`: an
empty, non-integer or zero cap falls back to 20; the interval accepts 0 and has no upper bound, so a
typo like 3600 means one open an hour — a restart applies a new value). **Every role is limited
except `admin`**; specialists may open contacts too (owner decision — not forbidden). A contact the
account already opened never counts and is never refused — that check comes first, before the lock. Check and
insert run in one transaction under `pg_try_advisory_xact_lock(hashtextextended('contact-unlock:' ||
user_id, 0))`, so simultaneous requests of one account cannot all see the same count. **The lock
never waits**: a request arriving while another request of the same account holds it gets `too_fast`
at once (`retryAfterSec` = the pause, at least 1 s — also with the pause at 0). The first version
waited with `pg_advisory_xact_lock`, and every waiting transaction held a pool connection (max 10):
locally with a 2 ms app↔database round trip (a delaying TCP proxy), one account's 300 simultaneous
requests queued for 9.7 s and another family's profile page hung for all of it; with the try-lock
the same burst took 1.9 s and that page waited at most 1.9 s (the admin path, which takes no lock:
1.2 s). A browser dispatches one client's actions one
at a time, so only a script or several tabs ever hit that refusal (checked locally 2026-09-16: 6
simultaneous opens with the 3 s pause opened exactly 1, a repeat of the contact being opened got the
phone, an already opened one always did; with the pause at 0 and cap 5, 6 simultaneous opens of two
new contacts added 1, reaching the cap, and flagged once). The limit queries use `clock_timestamp()`,
because `now()` is frozen at the start of the transaction, and another request of the account may
have inserted a later row between that start and the lock. The action answers `too_fast` /
`daily_limit` with `retryAfterSec` (for the cap: when the oldest open in the window turns 24 h),
and `unlock-panel.tsx` words it without payment and without calling anyone suspicious: «За 24 часа
можно открыть не больше N новых контактов. Контакты, которые вы уже открыли, остаются доступны, а
новые можно будет открыть через X». On a phone the button sits in the sticky bottom bar while the
panel's `role="alert"` may be off-screen, so the bar repeats the text (`aria-hidden`, dismissible).
**The open that uses the last slot, and any refused attempt, flags the account**:
`user.flagged_at` / `flag_reason` (migration 0011) plus a `system` notification to every admin
pointing at the admin overview — once per flag (`UPDATE … WHERE flagged_at IS NULL`, in one
transaction with the notifications). Flagging never throws: a failure is logged as
`[contact-limits] flag failed` (driver cause only — Drizzle's text carries the email) and the family
still gets the limit message. **No automatic ban and no email** (owner decision). The overview's
«Подозрительная активность» block (`AdminData.flagged`, count in `stats.flagged`, badge on «Обзор»)
lists flagged accounts with email, registration date, opens in the last 24 h and in total, with
«Разобрано» (`clearUserFlag` — hitting the cap again re-flags and re-notifies) and the usual
block/unblock. `/admin/users` only marks the name. The two columns are **not** in Better Auth's
`additionalFields`, so they stay out of `session.user` (checked: `get-session` returns no flag key).
Admin notifications appear only in the header's unread badge and on `/account` — `/admin` has no
notification feed; the block itself is the real channel.

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
`npm run build`, plus three `node:test` files for pure functions:
`node --experimental-strip-types --test src/lib/safe-next.test.mjs src/lib/unlock-limits.test.mjs src/lib/review-policy.test.mjs`.

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
  `/api/documents/[...key]`, which checks owner-or-admin. The one public exception is a profile
  photo **whose document status is `approved`** (2026-09-16): a pending or rejected photo gets 403
  for anyone but its owner and an admin, and `Cache-Control: private, no-store`. That is safe
  because every family-facing `<Image>` takes `photo_key` (approved only) and goes through
  `/_next/image`, which fetches without cookies, while the cabinet header, the wizard preview and
  the admin «Открыть файл» load the owner's own pending photo from the browser with the session
  cookie (`unoptimized` / plain links). Keep it that way: an optimized `<Image>` of a pending photo
  would break for the owner too. **Known gap, not closed:** `/_next/image` keeps its own disk cache
  (`.next/cache/images`, 4 h by default), and when the source later answers 403/404 Next 16.3.5
  keeps serving the stale copy and re-arms it (`response-cache` `handleRevalidate` re-sets the old
  entry on error; checked locally 2026-09-16). So an optimized copy of a photo that *was* approved
  and then replaced or deleted stays reachable at its old `/_next/image?url=…` address until the
  cache is cleared — a new deploy starts with an empty one. `images.minimumCacheTTL` does not
  shorten this. A pending photo never reaches that cache (the optimizer gets 403 and caches nothing).
- **Uploads**: `MAX_FILE_BYTES` (10 МБ) is checked in the browser before sending and again inside
  both upload actions before `file.arrayBuffer()`; the platform caps the raw body at 11 МБ
  (`serverActions.bodySizeLimit`, `proxyClientMaxBodySize`). Checked 2026-09-16 with real JPEGs: a
  file of exactly 10 485 760 bytes is accepted, 10 485 761 bytes gets «Файл больше 10 МБ…» in the
  browser without a request and `too_large` from the action when posted past the browser; only a
  body over 11 МБ, which the form never sends, ends in a 500 («Unexpected end of form»).
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
  2026-09-13 carried a stale pointer; production was repaired that day and checked at 0 such rows).
  The invariant now matters for more than honesty: since 2026-09-16 `/api/documents` serves only
  an approved photo publicly, so a pointer to any other photo would be a broken image. Losing the photo
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
- **Rate-limit counters live in Postgres, never in process memory** (2026-09-16, migration 0010),
  so a deploy does not reset them and a second replica would share them instead of multiplying the
  limit. Better Auth: `rateLimit.customStorage: authRateLimitStorage` in `lib/auth.ts`
  (implementation in `lib/rate-limit.ts`), table `rate_limit` (`key` `<ip>|<path>` unique, `count`,
  `last_request` in ms). **Not `rateLimit.storage: "database"`** — Better Auth's own database
  storage reads the row and then runs `UPDATE … WHERE id IN (SELECT … AND count < max LIMIT 1)`;
  the sub-select sees the snapshot from before a concurrent update, so simultaneous requests from
  one IP all pass (checked locally 2026-09-16: 60 simultaneous code requests got 8–10 through a
  3-per-minute limit, 100 simultaneous sign-ins up to 11 through 3 per 10 s; the in-memory store
  used before checked and counted in one synchronous step and could not be raced). Ours is one `INSERT … ON CONFLICT (key) DO UPDATE` with Better
  Auth's exact semantics — the window runs from the last *allowed* request, a rejected request does
  not extend it, `count` is capped at `max + 1` so the returned row says whether the request was
  rejected, time is the database's `now()` in ms; the same bursts now get exactly 3. With
  `customStorage` set Better Auth ignores `storage`, and the model is not registered with the
  adapter (the table is only read and written by `authRateLimitStorage`). Its built-in rules are
  unchanged, all per IP per path: password sign-in (and `/change-password`, `/change-email`) 3 per
  10 s; sending/checking a code, code sign-in and password reset 3 per 60 s (emailOTP plugin
  rules); everything else, `get-session` included, 100 per 10 s. Every `/api/auth/*` HTTP request
  therefore costs one small query (the header's `useSession` calls `get-session` on page load);
  server-side `auth.api.*` calls (`getSession`, `banUser`) are not rate-limited and cost nothing
  extra. If that query fails, every `/api/auth/*` request answers 500 (the thrown error carries
  only the driver's cause, not the key with the IP) — the same as Better Auth's own database
  storage; sessions need the database anyway. Rows idle for 10 min are deleted by a sweep that runs
  on a call at most once per 10 min per process.
  Own routes: `consumeRateLimit` (`lib/rate-limit.ts`, table `app_rate_limits`) — one atomic
  `INSERT … ON CONFLICT DO UPDATE` per key, fixed window, time from the database's `now()`,
  rejected requests count too; expired rows are deleted by a sweep that runs on a call at most
  once per 10 min per process. Do not put own counters into `rate_limit`: its sweep deletes rows
  idle for 10 min and would erase longer windows. **The contact form** (`/api/contact`) allows 5 messages per IP per
  10 min and 30 emails per hour for the whole site (`CONTACT_RATE_LIMITS`); the per-IP check runs
  first, so requests it rejects do not use up the site-wide cap; a honeypot hit or an invalid body
  is answered before either check and counts for neither. Either limit is a 429 `rate_limited` with `Retry-After`, and the form says
  «Слишком много обращений подряд. Попробуйте позже или напишите на info@nyanya.uz.» (owner's
  wording). **Nobody has confirmed that this mailbox receives mail**: `content/home.ts` still marks
  the address «почта-заглушка», it was taken off the footer and `/contacts` on 2026-08-04 for that
  reason, `/privacy` still names it, and the MX record of `nyanya.uz` points at the apex, which
  still resolves to the old host. Owner to confirm, or drop the address from the message. The
  per-IP limit (5 per 10 min = 30 per hour) equals the site-wide cap, so one address sending
  steadily can keep the form at 429 for everyone — the price of protecting the owner's inbox. If
  the counter query fails the route answers 503 and sends nothing — no counter, no email.
  **The client IP comes only from `lib/client-ip.ts`**: `IP_ADDRESS_OPTIONS` (the trusted-proxy
  list) is what `lib/auth.ts` passes to Better Auth, and `clientIpFromHeaders` runs Better Auth's
  own `getIp` with it — the forwarded chain is read right to left past trusted hops. Never take the
  leftmost `x-forwarded-for` entry: the client writes it, and the contact form's old in-memory limit
  was bypassed by rotating it (checked locally 2026-09-16: 7 of 7 accepted before, 5 of 7 after).
  Both tables hold client IPs (`rate_limit` as `<ip>|<path>`, `app_rate_limits` as
  `contact:ip:<ip>`); `/privacy` does not mention this yet (owner's call). Locally, counters survive
  a restart of `next start` now — clear them with `delete from rate_limit; delete from
  app_rate_limits;` (local database only).

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

## Reviews — one per pair, premoderated

Owner decisions of 2026-09-16 (migration 0012). **Only a moderator puts a review in front of
families**: a new review and an edited one are written as `pending`, which the profile page, the
home page (`getLatestReviews`), the catalogue rating and the cabinet counter never show; an admin
publishes or hides it in **`/admin/reviews`** (pending first, oldest first; badge «Отзывы» in the
sidebar and a tile on the overview) or in the profile card. Reviews that existed before stay
`visible`. **Editing a published review sends it back to `pending`** — it disappears from the
profile until published again, and the form warns about that before saving. A **hidden** review
cannot be edited (`hidden_by_moderator`): its author sees only «Отзыв не опубликован модератором»,
otherwise every save would put it back into the queue. The specialist gets an in-app `new_review`
notification **only when a moderator publishes** (also when a hidden one is published back); every
admin gets a `system` notification when a review enters the queue (new, or a published one edited)
— not for re-edits of what is already pending. Admin notifications still show only in the header
badge and on `/account`.

- **One review per family per specialist is held by the database**: unique index
  `uniq_review_specialist_parent (specialist_id, author_parent_id)`, and `createReview` is one
  `INSERT … ON CONFLICT DO UPDATE` (the old find-then-insert let 8 simultaneous submissions write 8
  rows). Migration 0012 first moved duplicate pairs into `reviews_dedupe_backup` (newest row by
  `created_at` kept — the old code rewrote `created_at` on every edit) and recomputed only the
  profiles that had them; that table is deliberately not in `schema.ts`. `created_at` is now when the
  review appeared, `updated_at` the author's last edit (filled from `created_at` for old rows).
- **`reviews.status` keeps the database default `visible`** — `pending` was added in the same
  migration, and the migrator runs all pending migrations in one transaction, where a freshly added
  enum value cannot be used. The code always writes the status explicitly. Do not "fix" the default
  inside a migration that adds a value.
- **Rules live once, in `REVIEW_POLICY` (`lib/review-policy.ts`)**, a pure module with a `node:test`
  file: the author's account is at least **24 h** old, the family opened this specialist's contacts
  at least **24 h** ago, at most **3 new reviews per account per rolling 24 h** (editing one's own
  review never counts); `0` switches a rule off, and the numbers change by commit, not env.
  `decideReview` returns the reason and, for the time-based ones, `retryAfterSec`;
  `reviewDenialText` is the one wording for the profile page and the form. The facts are gathered by
  `lib/review-eligibility.ts` (time from the database's `clock_timestamp()`), used both by
  `getReviewAccess` for the page and by the action — the page never shows a form the action refuses.
  **Any role may review** if it opened the contacts (nothing restricts it to `parent`); the queue
  shows the author's role, account age, unlock age and review count, and highlights the line for a
  young account, a non-family author, no unlock or more than 3 reviews.
- **`createReview` runs in one transaction** under `pg_try_advisory_xact_lock(hashtextextended('review:'
  || user_id, 0))` — **it never waits** (same reason as the contact-unlock lock): a concurrent
  submission of the same account gets `busy`. Inside: the eligibility check with the own review read
  `FOR UPDATE`, the upsert (`setWhere status <> 'hidden'` as a last guard), the rating recalculation
  and the admin notifications. Checked locally 2026-09-16: 8 simultaneous submissions → 1 row, 7
  `busy`, 1 admin notification; staggered re-edits → still 1 row and no new notification.
- **`moderateReview({ reviewId, status: "visible" | "hidden", seenUpdatedAt })`** locks the row
  `FOR UPDATE` and **refuses to publish (`stale`) when `updated_at` differs from the version the
  moderator read** — otherwise a family could swap the text between the moderator opening the queue
  and pressing «Опубликовать». The component refreshes and shows the new version.
- **`rating_avg` / `review_count` count `visible` reviews only** and are recomputed by
  `recalcRating(tx, profileId)` (`lib/rating.ts`) inside the same transaction as every write and
  decision. It updates the profile row only when the numbers change, so a pending review does not
  move the sitemap's `lastModified`. **It locks the profile row (`FOR NO KEY UPDATE`) in its own
  statement before computing the average** — a single `UPDATE … FROM (select avg …)` takes its
  snapshot before waiting for the row lock, so a moderator's decision and another author's save on
  the same profile at the same moment left a stale average (checked locally 2026-09-16: 0 published
  reviews, the profile showed 5.00 from 1 review; with the lock first, 0.00 and 0). It used to be exported from the `"use server"` file — a public
  endpoint. `scripts/db-seed-upgrade.mjs` still writes `rating_avg` as a constant and inserts reviews
  past moderation: do not run it on production.
- Public copy says reviews appear after the moderator's check (`/faq`, `/how-it-works`, the home
  page's «Отзывы семей», `/become-specialist`) and names no hour count — the exact rule is shown on
  the profile page, computed from `REVIEW_POLICY`. The profile's empty state is «Пока нет
  опубликованных отзывов» (it used to promise the first review from a family that «уже работала»
  with the specialist — nothing checks that, only the opened contacts), and the specialist's
  `new_review` notification says «Оценка N из 5», not «Семья поставила», because any role may review.

## Roles and access

`parent` (default) · `specialist` · `admin`. Role is chosen at signup; `admin` is set manually.

**Two layers guard the private pages, and only the second one is real.** `src/proxy.ts` (Next 16 renamed middleware to proxy) does an
optimistic check for the session cookie so an anonymous request is redirected before Next starts
streaming (`loading.tsx` creates a Suspense boundary, which otherwise commits a 200 before the page
can call `redirect()`). The cookie proves nothing on its own — every one of `/account`,
`/specialist`, `/admin` still validates the session and checks the role in its own `page.tsx`, and
so does every server action.

Blocking a user goes through Better Auth's admin plugin, which also revokes active sessions.

## Security headers

Every response carries them, set once in `next.config.ts` `headers()` (`SECURITY_HEADERS`,
`CONTENT_SECURITY_POLICY`, added 2026-09-15); `poweredByHeader: false` drops `X-Powered-By`.
**A route handler cannot override these keys**: Next copies a header from the handler's `Response`
only when the key is not already on the response (`server/send-response.js`), so a per-route
policy has to be another `headers()` entry. `/api/documents` keeps its own `Cache-Control`,
`Content-Type` and `Content-Disposition` because the config does not set them. The exceptions are
the redirects Next answers from its own config — the 307 from `redirects()` (`/ru/*`) and the 308
that strips a trailing slash (`/catalog/`): they go out without `headers()` values and have no body.

**State (2026-09-15): CSP is `Content-Security-Policy-Report-Only` — it blocks nothing.** HSTS is
`max-age=86400` (one day) **without `includeSubDomains` and without `preload`**: the apex still
resolves to an old host for some resolvers, and a year-long HSTS would turn that DNS glitch into an
error the browser does not let people click past. Raise it to `31536000` once the owner confirms the
apex points at Railway everywhere; `includeSubDomains`/`preload` stay out until then too. Framing is
blocked today by `X-Frame-Options: DENY`; `frame-ancestors 'none'` only starts blocking once the
CSP is enforced. The next step is renaming the key to `Content-Security-Policy` after a week of
clean `[csp]` log lines — update the marker comment in `next.config.ts` and this paragraph then.

- `script-src` keeps `'unsafe-inline'` because Next ships hydration data as inline scripts; the
  only way out is a per-request nonce, which turns the static pages dynamic — not done.
  `style-src 'unsafe-inline'` is for the `style=` attributes of next/image and motion; `img-src
  data:` is the blur placeholders. Everything else is `'self'` — fonts are self-hosted by next/font.
- **A new external source (analytics, chat widget, image CDN) goes into the policy first**, or it
  breaks the day the CSP is enforced.
- `Permissions-Policy` must not deny `clipboard-write`: «Поделиться» (`share-button.tsx`) copies the link.
- Violations go to `/api/csp-report` (public, no session, no DB): it accepts `application/csp-report`
  (`report-uri`) and `application/reports+json` (`report-to`), reads at most 64 KB, drops
  browser-extension noise (browsers cut a non-http(s) address to its bare scheme, so an extension
  arrives as `chrome-extension` with no colon — match it that way), strips query strings and
  writes at most 60 `[csp] {…}` lines a minute per process. Read them in the Railway service log
  (`grep '\[csp\]'`).
- **Locally over http, Chrome delivers no reports at all**: checked 2026-09-15 on Chrome 152, it
  kept `report-to` reports queued on `http://localhost:3111` and delivered them at once when the
  same page came over HTTPS, and it ignores `report-uri` because `report-to` is present. Locally,
  look for «violates the following Content Security Policy directive» in the DevTools console or
  test the receiver with `curl`.

## Search engines — robots.txt and sitemap.xml

Both are generated (`src/app/robots.ts`, `src/app/sitemap.ts`, added 2026-09-16) from `SITE_URL`
(`lib/site-url.ts`: `NEXT_PUBLIC_APP_URL`, falling back to `https://www.nyanya.uz`; emails use it
too). `NEXT_PUBLIC_` is inlined at `next build`, so the variable must be present at build time.

- **robots.txt** is static (built once). It disallows `/api/`, `/_next/image` (owner decision:
  specialists' faces stay out of image search — profile pages themselves are indexed), `/admin`,
  `/account`, `/reset-password` and the specialist cabinet as `/specialist$`, `/specialist/`,
  `/specialist?`. **Never write a bare `Disallow: /specialist`** — robots rules are prefixes, and it
  would also close every `/specialists/<slug>`.
- **sitemap.xml** is `force-dynamic`: it reads Postgres on every request, so `next build` needs no
  database and a paused or unpublished profile drops out at once. It lists the public
  static pages, the blog posts and exactly the catalogue's profiles (`getSitemapSpecialists`, same
  `listedInCatalog` condition — active, has a slug, not paused) with `lastModified = updated_at`.
  Static pages and posts carry no `lastModified`: there is no honest edit date for them. A new
  public page goes into `STATIC_PAGES`; a private one goes into the robots disallow list.
- Registering the site in Google Search Console / Яндекс Вебмастер is the owner's step, outside the
  code; until then crawlers find the map only through the `Sitemap:` line in robots.txt.

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
  **User-supplied text reaches email HTML only through `escapeHtml`** (`lib/email.ts`, 2026-09-16):
  names are validated by length alone, and `<b>` or `&` in a name broke the heading. `shell()`
  escapes the heading, and `renderBlock` escapes `code`, button `label` and `href`; `text`, `note`
  and list `items` are HTML on purpose (they carry `<b>`), so a value interpolated into them is
  escaped at the interpolation point, as the contact-form fields are. `plain()` is not HTML and
  stays unescaped. Subjects have line breaks collapsed.
- **Signup is email-OTP, login is email + password.** Better Auth's own `/sign-up/email` is switched
  off (`disableSignUp` + `disabledPaths`, 2026-09-15): it created a signed-in account on any address
  without the code and told a registered address from a free one. Every `?next=` goes through
  `safeNext` (`lib/safe-next.ts`) — `startsWith("/")` let `//evil.com` send people off-site after a real
  login, and the check must run on the parsed path because `/a/..//evil.com` normalises to `//evil.com`.
  Run `node --experimental-strip-types --test src/lib/safe-next.test.mjs` after touching it. The code proves the address once, at
  registration; afterwards only the password is used. The password is written by `completeProfile`
  (Better Auth has no public set-password endpoint) and only when none exists yet.
- **Password guessing is throttled per account in Postgres** (`login_attempts`, migration 0009,
  2026-09-16), on top of Better Auth's IP limit (3 sign-ins per 10 s per IP, counters in Postgres
  too — see «Rate-limit counters» above). Two tiers,
  thresholds only in `LOGIN_THROTTLE` (`src/lib/login-throttle.ts`): **per address + client IP** —
  5 wrong passwords within 15 min lock that pair for 15 min; **per address across all IPs** (row
  with `ip = '*'`) — 30 within 60 min lock the account everywhere for 60 min. One attacker who
  knows the owner's address locks only their own IP; a botnet hits the account limit. **The limit is
  not strict under concurrency**: the lock is checked in `hooks.before`, before the password, and the
  failure is recorded in `hooks.after`, so requests already past the check when the limit-reaching
  failure lands are still verified and counted — a synchronised burst from N IPs gets up to ~3·N
  guesses beyond the threshold per lock (locally, 60 simultaneous wrong passwords from 20 IPs at 29
  failures got 32 password checks instead of one; from one IP it is at most 2 extra). A strict limit
  needs counting before the password check and undoing on success — not done. Windows
  are fixed, start at the first failure and, on a lock, move to the lock's end, so a failure soon
  after a lock expires locks again at once. Each tier is one atomic `INSERT … ON CONFLICT DO
  UPDATE`; all time arithmetic happens in the database (`timestamptz`, `now()`). Only a 401
  `INVALID_EMAIL_OR_PASSWORD` counts (an unknown address counts the same, so nothing leaks) — not
  403 `BANNED_USER`, not 400 body errors, not any 429. A correct password clears only its own
  address+IP row (clearing the account row on every owner login would hand a botnet 30 fresh
  guesses); a successful OTP sign-in or password reset clears every row of the address — that is
  the way out, and during a lock even the correct password gets 429. The lock is a 429 with
  `code: "TOO_MANY_LOGIN_ATTEMPTS"`, `retryAfterMinutes` and `Retry-After`; `login-form.tsx`
  branches on that code («Подождите N мин или задайте новый пароль через «Забыли пароль?»») and keeps
  the generic text for the IP limit's 429, which has no code. The client IP comes from Better
  Auth's own `getIp` with the trusted proxies from `lib/client-ip.ts`. It is wired through `hooks.before` /
  `hooks.after` in `lib/auth.ts` — **the only global hooks Better Auth takes (one function each);
  extend those functions, never add another `hooks` object**. `ctx.body` in `hooks.before` is not
  validated yet (`loginEmailFromBody` accepts anything). A throttle DB error is logged
  (`[login-throttle]`, through `describeThrottleError` — only the driver's cause: Drizzle's own error
  text carries the query params, i.e. the address and IP, so never log the raw error) and fails
  open. **The table holds addresses people tried to sign in with, registered or not, plus their
  IPs**: rows are deleted 24 h after their last failure, by a sweep
  that runs on a password sign-in attempt at most once per 10 min per process — so a row can
  outlive 24 h until the next attempt. `/privacy` does not mention this yet (owner's call).
  Unlocking one person without a deploy is `delete from login_attempts where email = '<address>'`
  (a production write — owner approval first). The account throttle runs in every environment,
  `npm run dev` included (there `getIp` falls back to `127.0.0.1`, so every local request shares one
  IP); only Better Auth's IP limit is off outside `NODE_ENV=production` (`next start`). curl tests
  against `next start` need a distinct `x-forwarded-for` per sequence and at most 3 sign-ins per IP
  per 10 s — a restart no longer clears that counter — and Node `fetch` also needs an `Origin`
  header (curl does not).
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
