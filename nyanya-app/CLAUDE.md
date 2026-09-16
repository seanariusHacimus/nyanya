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
except `admin`**, and that `admin` is read from the database (`getSessionUncached`), not from the
session cookie cache — the exemption lifts the cap, the pause and the flagging, so a role taken
away must stop working at once, not in five minutes; the extra query runs only when the cookie
already claims `admin`. Specialists may open contacts too (owner decision — not forbidden). A contact the
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
«Подозрительная активность» block (`getFlaggedUsers`, count in `getAdminNavCounts().flagged`, badge
on «Обзор») lists flagged accounts with email, registration date, opens in the last 24 h and in total, with
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
- `node scripts/db-cleanup.mjs` — посчитать мусорные строки; `--apply` — удалить (см. «Database
  hygiene» ниже)
- `node scripts/backfill-photos.mjs` — разовый перевод уже загруженных фотографий анкет в
  ≤1600 px WebP; сухой прогон по умолчанию, `--apply` пишет, `--restore <бэкап>` возвращает
- `curl -s http://localhost:3111/api/health` — проверка живости, та же, что опрашивает Railway
  при деплое (см. «Railway — deploy, liveness, service scripts» ниже; действия владельца в
  панели — `../docs/operations/railway-runbook.md`)
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
PostgreSQL + Drizzle · Better Auth · Tailwind v4 · `@phosphor-icons/react` ·
Resend (email) · `@aws-sdk/client-s3` (documents) · `sharp` (profile photos).
**There is no animation library** — `motion` was removed 2026-09-16 (see «Motion is CSS» below).

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
- **`images.minimumCacheTTL` is 31 days** (`2678400`, owner decision 2026-09-16): that is how long
  browsers and intermediaries keep an already optimized variant. It is safe only because a photo's
  address is never reused — every upload writes a new UUID key and `photo_key` is repointed at it,
  so «the same URL, new picture» is a case the code does not have. Do not add a path that
  overwrites a key in place without changing this number back. **What it does cost**, honestly:
  Next 16's own default is 14 400 s (4 h), the optimized answer's max-age is the larger of that and
  the upstream `Cache-Control` (`/api/documents` sends `public, max-age=3600`), so a variant a
  browser already fetched used to go stale in 4 hours and now goes stale in 31 days — checked
  locally: `/_next/image?url=%2Fapi%2Fdocuments%2F…` answers `public, max-age=2678400,
  must-revalidate`. If a moderator later rejects that photo and `/api/documents` starts answering
  403, whoever holds the optimized URL keeps seeing the picture for up to a month (and the
  optimizer's own disk cache does the same for everyone until the next deploy — the «Known gap»
  above). A photo that must disappear now needs a deploy, not a wait.
- **The profile photo is resized on upload, verification documents are not** (2026-09-16).
  `prepareDocumentUpload` (`src/lib/images/profile-photo.ts`) is called by **both** upload actions
  (`specialist-profile.ts`, `admin-documents.ts`) and touches the `profile_photo` step only: EXIF
  rotation baked into the pixels, at most **1600 px** on the long side, **WebP q85**, metadata
  dropped — a phone photo carries GPS coordinates and the profile photo is public. A passport or a
  certificate stays the bytes the person sent: the moderator must see the real file. Because the
  bytes change, the `documents` row records the **stored** file (`payload.fileName` with a `.webp`
  extension — `extensionFor` in `storage/index.ts` takes the extension from the name, so without it
  WebP bytes would land under a `.jpg` key — plus `payload.mimeType` and `payload.buffer.byteLength`),
  never `file.name` / `file.size`. Measured locally (re-checked 2026-09-16): 3 620 341 bytes
  4000×2986 → 140 056 bytes 1600×1194 in ~230 ms; the portrait test shot with EXIF orientation 6,
  514 278 bytes and 2400×1792 pixels, → 140 460 bytes 1195×1600, the rotation baked in.
  **The photo step accepts JPG, PNG and WEBP only** (`PHOTO_MIME` in `storage/limits.ts`; the other
  steps keep JPG/PNG/WEBP/HEIC/PDF). HEIC is out because neither the shipped `sharp` build decodes
  it (its heif input lists `.avif` alone) nor does the Next image optimizer — such a photo used to
  sit in the database as a broken picture. The refusal is honest and says what to do
  (`PHOTO_FORMATS_HINT`), the action answers `photo_format`, and an image `sharp` cannot read is
  refused as `photo_unreadable` (`PHOTO_UNREADABLE_HINT`) instead of being stored broken. The one
  case where the original is kept is `sharp` failing to load at all: that is logged as
  `[photo] sharp недоступен` and the upload keeps working.
  `scripts/backfill-photos.mjs` does the same to photos uploaded earlier — dry run by default,
  `--apply` writes, `--restore <backup>` puts the rows back, originals are never deleted (their
  keys go to `backfill-photos-originals.txt` for `purge-orphan-files.mjs`). The owner runs it.
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
  `deriveVerificationLevel` computes the badge — it is never set by hand, and
  **every path that changes a document recomputes it, deletions included**: the shared
  `levelForProfile` (`lib/document-level.ts`, deliberately not a `"use server"` file, so the
  export is not a public endpoint) is called inside the same transaction by both document
  deletions and the admin upload. Until 2026-09-16 the cabinet's own delete skipped it, and a
  specialist who removed an approved photo kept «Стандартный профиль» — a badge that asserts a
  photo the moderator accepted — while removing an approved certificate kept «Премиум-профиль»
  and the head of the catalogue, which orders by that column.
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

## Motion is CSS, and the server HTML is visible

Rewritten 2026-09-16. The `motion` library is **gone from the project** — `package.json`,
`package-lock.json` and `src/lib/motion.ts` — and nothing may bring an animation library back
without a measurement that justifies it. It used to sit in `SiteHeader`, which lives in
`src/app/layout.tsx`, so every visitor downloaded it on the login page and on static texts alike.
Measured locally on this machine, before → after (script bytes referenced by the served HTML,
modern browsers, the `noModule` polyfill excluded): `/` 685 813 → 536 188 raw (213 203 → 163 057
gzip), `/catalog` 724 068 → 585 302 (226 015 → 179 454), a profile page 724 071 → 585 366
(224 472 → 177 961) — about −140 КБ raw and −47 КБ gzip on every page. The HTML itself grew a
little (`/` 139 701 → 147 040 bytes): the class names that carry the animation are cheaper than the
library, and they are text that gzips.

- **Nothing above the fold waits for JavaScript, and no `opacity:0` may reach the served HTML.**
  `curl -s localhost:3111/ | grep -c 'opacity:0'` was 22 and must stay 0 (`/about` 4, `/how-it-works`
  8, `/verification` 7, `/become-specialist` 11, `/blog` 6 — all 0 now). A page whose content is
  invisible until the scripts run is a page a slow connection, a crawler and a link preview see
  empty.
- **`Reveal` (`components/reveal.tsx`) renders its children visible.** After hydration it hides
  **only** a block that is entirely below the window (`getBoundingClientRect().top <
  window.innerHeight` → leave alone, or it would blink), adds `reveal-pending` (instant, `transition:
  none`) and an IntersectionObserver, and drops the class when the block comes into view — the
  transition then comes from `.reveal`. **A block taller than three windows is not hidden either**
  (2026-09-16): the intersection ratio is measured against the block's own area, so a block over
  four windows tall never reaches 0.25, and an IntersectionObserver only wakes on a threshold
  crossing — nothing would ever show it again. It was reproducible: the home page's six stacked
  review cards stayed invisible for good in a 360×400 window, and the same happens at 200 % page
  zoom. Such a block simply keeps its server-rendered visible state; visible content beats an
  animation. With `prefers-reduced-motion` it does nothing at all.
- **The hero is a server component** (`components/sections/hero.tsx`) with a CSS entrance
  (`.enter`, 0.8 s, `backwards` so a delayed element does not flash in its final state first; the
  picture has its own `.enter-image`, 1.1 s after 0.12 s, and the seal `.enter-seal`, 0.9 s after
  0.55 s — measured 2026-09-16, the picture's fade costs nothing in LCP: 1 308 ms with it and
  1 308 ms with it switched off) and
  `preload` on the image — in Next 16 `preload` is what replaced the deprecated `priority`
  (`node_modules/next/dist/docs/01-app/03-api-reference/02-components/image.md`). If anything
  client-side is ever added inside it, the build fails rather than production.
- **The mobile menu stays mounted** and opens by transitioning a grid row from `0fr` to `1fr`;
  closed, it carries `inert`, so its links take no focus and no screen reader reads them — the same
  as when `AnimatePresence` unmounted it.
- The remaining pieces are plain CSS in `globals.css`: `slide-in` for the wizard screen (changing
  `key` remounts `<main>` and replays the animation), `dialog-backdrop` / `dialog-panel` for the
  two modals (**appearance only — closing is instant**, the trade for not shipping a library), and
  the long-standing `seal-rotate` of the trust seal. Every one of them has a
  `prefers-reduced-motion` branch that turns the movement off **without hiding anything**.

## Database hygiene — indexes, transactions, cleanup

**Indexes are declared in the Drizzle schema, not only in SQL** — a `CREATE INDEX` that exists only
in a migration is one the next `drizzle-kit generate` offers to drop. Migration 0013 (2026-09-16)
added `notifications(user_id, created_at)`, a partial `notifications(user_id) WHERE read_at IS NULL`
for the header's unread badge, `session(user_id)`, `account(user_id)` and `verification(identifier)`:
each of those tables had nothing but its primary key, and Better Auth searches them on every ban,
sign-in and code entry. Deliberately not added: `reviews(specialist_id)` — the leading column of the
unique index from 0012 — and `contact_unlocks(parent_id, unlocked_at)`, added by 0011.
Migration 0014 (2026-09-16) added the admin panel's two: `user_email_lower_idx` on
`lower(email) text_pattern_ops` and the partial `documents_pending_created_idx` on
`(created_at) WHERE status = 'pending'` — see «Admin panel» below.
Migration 0015 (2026-09-16) added the catalogue's two, both partial on the `listedInCatalog`
predicate (`status = 'active' AND employed = false AND slug IS NOT NULL`):
`specialist_catalog_order_idx` on `(verification_level DESC, rating_avg DESC, review_count DESC,
published_at DESC, id)` and `specialist_catalog_filter_idx` on `(category, district_id)` — see
«Catalogue» below. **The DESC columns are declared `NULLS FIRST`**, because `order by x desc` in
Postgres means NULLS FIRST while drizzle's `.desc()` writes `NULLS LAST` into an index: with the
default the planner would not use the index for the ordering at all.

- **Never put `CREATE INDEX CONCURRENTLY` in a migration**: the migrator runs every pending file in
  one transaction, where it is illegal. A plain `CREATE INDEX` takes a SHARE lock (reads pass,
  writes wait) for the build — milliseconds on today's tables. If a table ever reaches hundreds of
  thousands of rows, build the index by hand with CONCURRENTLY before the deploy; the migration's
  `IF NOT EXISTS` then does nothing.
- A new query on a hot path (rendered on every page, or called by the header) gets its index in the
  same commit, or it is a sequential scan nobody notices until the table grows.

**Writes that change more than one row run in one `db.transaction`** (2026-09-16):
`unlockContacts` (the unlock row + the profile's counter + the specialist's notification),
`moderateProfile` (status + notification, each branch), `reviewDocument` (the document's verdict +
the profile's level and `photo_key` + the notification), the two document uploads and the two
document deletions (`specialist-profile.ts`, `admin-documents.ts`), plus `createReview` /
`moderateReview`, which were already transactional. Half a decision is worse than none: an unlock
the specialist never hears about, or a rejected photo still pointed at by `photo_key`.

- **Inside the callback everything goes through `tx`.** A `db.` call there runs on another
  connection and cannot see the uncommitted rows — `documentSummaryFor(tx, …)` and `levelFor(tx, …)`
  take the executor for exactly that reason (the type is `DbExecutor` in `src/db/index.ts`).
- **What cannot be rolled back stays outside**: emails, storage writes and deletes, and
  `revalidatePath` run **after** the commit, on values the callback returned. A replaced document's
  old file is deleted only after the commit — on a rollback the row still points at it. The new
  file is written before the transaction, so a rollback leaves it orphaned in storage; that is what
  `scripts/purge-orphan-files.mjs` is for.
- Never wrap a network call (S3, Resend) inside a transaction: postgres-js holds one of ten pool
  connections for its whole life.

**`scripts/db-cleanup.mjs` deletes rows nobody needs any more.** Dry run by default — it only
counts and prints «строк было N, стало N»; `--apply` deletes. Retention (constants at the top of
the file): read notifications older than **90 days** (unread ones are never touched), sessions and
verification codes that expired more than **1 day** ago, `login_attempts` older than **24 h**,
`rate_limit` rows idle for 10 minutes and expired `app_rate_limits` windows — the last three match
the sweeps the application already does when someone happens to hit it. It connects like
`db-migrate.mjs` (inside Railway `DATABASE_URL`, outside `DATABASE_PUBLIC_URL`) and exits on its own.

**Nothing runs it on a schedule yet** (owner's step, not done: it needs a Railway service). When the
owner wants it, in this order:

1. **Set it up in the dashboard, not in a config file.** Railway's docs now say plainly that
   **«New services cannot opt into Config as Code»** and that existing files «stop being read on
   2026-12-01» — so the `railway.cron.json` this section used to prescribe cannot be attached to a
   new service at all, and the old worry that such a service would pick up `railway.json` and run
   the migrations instead of the script no longer applies for the same reason (see «Railway —
   deploy, liveness, service scripts» and runbook §7).
2. Railway → New Service → the same GitHub repository and branch `master` → Settings: name
   `nyanya-cron`, Root Directory `/nyanya-app`, no public domain, Watch Paths narrow enough that an
   ordinary application commit does not rebuild it; Deploy: Start Command
   `node scripts/db-cleanup.mjs --apply`, Cron Schedule `0 22 * * *`, Restart Policy `Never`;
   Variables: `DATABASE_URL = ${{Postgres.DATABASE_URL}}`. A custom build command (the Next build is
   useless here) is a dashboard field too.
3. Before the first scheduled run, run it by hand without `--apply` and show the owner the numbers.
4. After the first run check the service's log for the six «строк было … стало …» lines and confirm
   that `user`, `specialist_profiles`, `documents`, `reviews`, `contact_unlocks` and `favorites` did
   not change and that unread notifications did not drop.

The schedule is UTC (`0 22` = 03:00 Tashkent), the shortest interval Railway allows is 5 minutes, a
run that is still going blocks the next one, and the process must exit by itself — this one closes
its connection and does. Deleted rows do not come back: that is why the dry run is the default and
the retention windows are generous.

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
to it. What ranks the catalogue now is `CATALOG_ORDER`: the profile's level first, then the
families' rating, the review count, recency and `id` (see «Catalogue» below). **The level is the
whole enum, not «premium or not»** — since 2026-09-16 the order is premium → standard → no badge,
where «no badge» means a profile published without an approved photo. Until then the browser sorted
the list itself and only lifted premium, so a photo-less profile rated 3.0 stood above a standard
one rated 0.0; now it stands below it. Do not reintroduce the trust index without a formula that
actually runs.

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
code**: the catalogue orders by `verification_level` before rating (the single `CATALOG_ORDER` in
`queries/specialists.ts` — the client does not sort any more), the «Только премиум-профили»
toggle exists, and the seal badge is premium-only. Do not add a benefit here
without implementing it — that is exactly how the old «documents checked before publication» lie
came about. The card shows after submission and only while `tier !== "premium_verified"`;
`/specialist/premium` lists the category's documents (never the photo) with upload cards.

## Catalogue — the URL is the state, the page is one screen of rows

Rewritten 2026-09-16 (migration 0015). Until then `/catalog` read **every** published profile with
one unbounded query and shipped the lot to the browser, which filtered, sorted and paged it in
`useState`; `/about` pulled the same list to print one number and `/become-specialist` to show one
card. Measured locally: with 10 000 published profiles the catalogue page was **8 864 096 bytes**
and 272 ms, now **121 784 bytes** and 11–14 ms — and the page no longer grows with the catalogue
(121 757 bytes at 1 000 profiles, 121 784 at 10 000).

- **Filtering, sorting and paging happen in SQL** (`getCatalogPage` in `queries/specialists.ts`),
  and `«Найдено»` is a separate `count()` over the same `where`. `catalog-view.tsx` is a renderer:
  it holds no list state, only the mobile panel and the two text-field drafts. **Do not put a
  filter back into the browser** — it would silently disagree with the counter and bring back the
  whole-catalogue download.
- **The state lives in the address**, parsed and built in one client-safe module,
  `src/lib/catalog-params.ts` (hand-written, no zod — the client component imports it, and zod
  would ride along into the browser). Keys: `category`, `district`, `lang`, `price`, `exp`, the six
  toggles as `=1`, `sort`, `page`. Rubbish becomes the default, never a 400. Only non-default keys
  are written, so a clean `/catalog` stays clean. The controls call `router.replace` inside
  `startTransition` with `scroll: false`: a checkbox click is not a history entry and the page does
  not jump; the grid dims (`aria-busy`) instead of being replaced by `loading.tsx` (checked
  locally: the skeleton never appears during a filter change).
- **The controls draw themselves from `useOptimistic`, not from the prop, and the next address is
  built from that same value** (2026-09-16). The prop arrives with the server's answer, so until
  the transition ends it still describes the *previous* filters — and a control bound to it undoes
  the click that started the transition. Checked locally with a 900 ms delay on the RSC request
  (Playwright route): the ticked checkbox sat unticked for the whole 900 ms and the district select
  snapped back to «Все», and a second filter ticked 300 ms after the first replaced it instead of
  adding to it (`?car=1` + «С проживанием» → `?livein=1`, the first silently dropped). The same
  staleness reached the debounced text fields from the other side: their 400 ms timer closes over
  the render that typed, so a district chosen in between was wiped by «Цена до». Hence
  `nextQuery()` — the shown query, plus any value a text field has not sent yet (`flush()`), plus
  the change itself, in one navigation. **Do not bind a control back to `query`**, and do not let a
  filter change bypass `nextQuery()`.
- **`«Показать ещё»` stays accumulative**: `page=N` renders the first N×9 cards, so a shared
  `?page=3` reproduces the same 27 cards after a reload. The cap is 50 pages (450 cards); past it
  the button is replaced by «Показаны первые 450 анкет — уточните фильтры». `CATALOG_ORDER` ends
  with `asc(id)` for exactly this reason: without a deterministic tail Postgres may order ties
  differently between `page=1` and `page=2`, and a card would vanish or double.
- **Districts come from the database** (`getCatalogDistricts`), and the address carries a latin
  token built from `districts.name_en` (chilanzar, mirzo-ulugbek, shaykhantakhur…) — a Cyrillic
  name in a URL turns into `%D0%A7%D0%B8…` and is unpleasant to share. An unknown token means «all
  districts», silently. The hardcoded list that used to live in `catalog-view.tsx` is gone.
- **Filter semantics are unchanged from the browser version**, including that «Цена до» compares
  the raw amount regardless of the unit (сум/час against сум/месяц) — the hint under the field says
  so, and splitting the filter by unit is a product decision nobody has taken.
- **The two marketing pages ask for what they show**: `/about` calls `countActiveSpecialists()`,
  `/become-specialist` calls `getFeaturedSpecialist()` (one row, first by `CATALOG_ORDER`).
  `getActiveSpecialists()` is deleted — an unbounded read must not sit in the module «just in case».
- **The catalogue read is cached for 60 s with the tag `catalog`** (`unstable_cache`, keyed by the
  filter object) and every server action that touches profile state resets it through
  `revalidateCatalog()` (`lib/catalog-cache.ts`) — checked locally: hiding a profile in `/admin`
  and publishing it back changed `/catalog` on the very next request, and publishing a review moved
  the card's rating at once. **`updateTag` may only be called from a server action**; from a route
  handler it throws, and such a caller would need `revalidateTag(CATALOG_TAG, { expire: 0 })`.
  **«Every action» is the whole list, and it is easy to shorten by accident**: besides the obvious
  moderator paths, the cabinet's own `saveSpecialistProfile`, `deleteVerificationDocument` and
  `submitForModeration` reset it too (all three in `specialist-profile.ts`, only when the profile
  is `active`), and `reviewDocument` resets it on **any** document decision, not only on the photo —
  `verification_level` drives the badge, the default order and the «Только премиум-профили» filter.
  Without them the catalogue kept a deleted photo's `photo_key` (a broken image), the old price, the
  old badge, or a card leading to «страница не найдена», for up to a minute. `submitForModeration`
  is not reachable from the wizard for a published profile (the submit screen is built only for a
  draft or a rejected one), but an action is a network endpoint and the list must hold anyway.
  **A new write to `specialist_profiles` outside this list is a stale catalogue.**
  The price of the cache: a change made **outside** the actions (`scripts/*.mjs`, hand-written SQL)
  shows up in the catalogue up to 60 s later — and one request later still, because `unstable_cache`
  serves the expired entry once while it refreshes in the background (checked locally 2026-09-16:
  after the TTL the first request still showed the old «Найдено», the next one the new). `updateTag`
  has no such gap: it drops the entry, so the next request waits for fresh data. `use cache` is not
  an option here — in Next 16.3.5 it and `cacheTag` require `cacheComponents: true`, which changes
  the rendering model of the whole application.
- **Favourites and the session stay outside the cache** (the page reads them per request), so a
  cached page never leaks one family's hearts to another.
- **The tab title does not depend on the filters.** `generateMetadata` sets a fixed «Каталог
  специалистов» plus `canonical = <SITE_URL>/catalog`, so thousands of filter combinations are not
  indexed as separate pages. A category-dependent title was tried and dropped: in Next 16.3.5 a
  navigation inside the same route (only the query string changes) does not update
  `document.title` — checked locally 2026-09-16, it kept the previous category and once showed a
  third one from a prefetched route. The category name is in the `H1`, which is computed on the
  server and is always right.

**Only the unfiltered view is cached** (2026-09-16). `unstable_cache` writes one disk entry per
argument set, the filtered key includes «Цена до» (nearly a billion values) and «Опыт от», and
`/catalog` has no rate limit — hammering random parameters filled `.next/cache/fetch-cache` with
4 KB files (checked locally: 60 distinct prices → 62 files). `getCatalogPage` therefore caches only
`isDefaultCatalogView` requests, keyed by page alone, so the entry count is bounded by
`CATALOG_MAX_PAGE`. A filtered request goes straight to Postgres: measured at 10 000 profiles,
11 ms uncached against 6 ms on a cache hit — invisible next to the trip to Singapore, and the
0015 indexes keep the query in milliseconds.

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
  endpoint.
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

**The session is cached in a cookie for 5 minutes** (`session.cookieCache` in `lib/auth.ts`,
2026-09-16), so a server render of a private page and a server action no longer cost two queries
(session by token, then user). The price is a lag, and it is the whole trade-off of this setting:
**a ban, a role change and the session revocation of a password reset reach a device whose
`better-auth.session_data` cookie is already issued up to 5 minutes late.** Signing in is not
affected — a new session goes through the database, so a banned account is refused at once
(checked locally 2026-09-16 with `maxAge` lowered to 30 s: sessions were deleted from the
database immediately, a new sign-in got 403 `BANNED_USER`, and the banned device's own cookie kept
opening `/specialist` for exactly those 30 s, then started redirecting to `/login`). The cookie is
not renewed silently (`refreshCache` is off and Better Auth disables it whenever a database is
configured), so the lag can never exceed `maxAge`.

- **Admin checks read the database, never the cookie**: `getSessionUncached` (`lib/auth.ts`) is
  what `/admin/*` pages and every admin action call, so a role taken away closes the panel at once
  (checked: the cookie still said `role: admin`, `/admin` and `/admin/users` already answered 404).
  `/api/documents` does the same before serving a private document to an admin — passports and
  medical certificates must not hang on a five-minute-old role.
- **A direct write to the `user` table must rewrite the cookie**: Better Auth does not know about
  it. `completeProfile` (role, name, phone) and `saveSpecialistProfile` (name) call
  `getSessionUncached` right after the update — without it a freshly registered specialist stayed
  a `parent` in the cookie for five minutes: `/specialist` answered «Вы вошли как родитель» and the
  wizard's actions answered `forbidden`. It works only where Next allows `Set-Cookie` — server
  actions and route handlers, never a server component. An admin editing **someone else's** name
  (`adminUpdateProfile`) cannot rewrite that person's cookie: their cabinet header shows the old
  name until the cache expires.
- The cookie holds the session and the user row (name, email, phone, role) — about 1.1 KB on every
  request, base64url + HMAC, **signed but not encrypted**, `HttpOnly`, in that person's own
  browser. Do not put anything into `user` that its owner may not see.
- To invalidate every cached session at once, add `version: "2"` to `cookieCache` and deploy; to
  turn the whole thing off, `enabled: false` — `session_token` keeps working and nobody has to
  sign in again.

## Admin panel — every section loads only what it shows

Rewritten 2026-09-16 (migration 0014). Until then one function, `getAdminData()`, ran thirteen
queries and pulled **every** profile, **every** document and the 200 oldest accounts — and both
`layout.tsx` (for the four sidebar badges) and the section's own `page.tsx` called it, so every
admin page cost that twice. Locally with 2 000 synthetic accounts and 2 000 profiles the HTML of `/admin/profiles`
was 4.98 МБ; the moderator could not find anyone who registered after the two-hundredth account,
because the search filtered those 200 rows in the browser.

- **One query set per section** (`src/lib/queries/admin.ts`): `getAdminNavCounts` (the four sidebar
  badges — and nothing else is what the layout loads), `getProfileTotals` («Опубликовано X из Y»),
  `getAdminStats` (the overview tiles), `getModerationQueue` (overview «Не в каталоге»),
  `getAdminProfilesPage`, `getDocumentQueue`, `searchUsers`, `getFlaggedUsers`,
  `getAdminReviewQueue`. The counters that both a badge and a caption need come from **one**
  `GROUP BY specialist_profiles.status`; `getAdminNavCounts`, `getProfileTotals`, `getAdminStats`
  and `getPendingReviewCount` are wrapped in React `cache`, so the layout and the page share them
  inside one render. That dedup lasts exactly one server render — a server action that calls them
  again pays again, which is fine and intended.
- **Page size is 50** (`PAGE_SIZE`), lists are paginated, and the list state lives in the URL —
  `?page=`, `?q=`, `?status=` — parsed by `src/lib/admin-params.ts` (page 1…10 000, query trimmed
  to 100 chars, unknown status → «все»). That is what makes `router.refresh()` after a decision
  return the same screen instead of the top of the list, and a link to «всех, кто ждёт решения»
  forwardable. `revalidatePath("/admin")` in the actions does nothing for these dynamic pages;
  `useAdminAction`'s `router.refresh()` is what updates them. `Pager` says nothing when the result
  is empty and does not repeat the list's own «на этой странице пусто» when the page is past the
  last one — it adds «Всего страниц: N» and the link back.
- **People are searched on the server** and sorted newest first. A query containing «@» is taken to
  be an address and matches the **start** of `lower(email)` through `user_email_lower_idx`
  (`text_pattern_ops`, because the database collation is not «C»); anything else matches a
  substring of name or email. So `?q=@nyanya.uz` finds nothing — a domain is not the start of an
  address; search the domain without the «@». **That rule is printed under the search box**, not
  only here: the field says «имя и адрес — по любой части, запрос со знаком @ — с начала адреса»,
  because a placeholder promising «поиск по почте» and a silent «Никого не найдено» is a lie the
  moderator cannot see through. `%`, `_` and `\` are escaped (`escapeLike`), or `?q=%` would
  return everyone.
- **Documents for the visible page only**: `documentsByProfile` reads them with one
  `inArray(...) GROUP BY` + `jsonb_agg` for the ≤50 profiles on screen, instead of reading the
  whole `documents` table to caption every row with «до премиума: x/y».
- Migration 0014 adds `user_email_lower_idx` and the partial `documents_pending_created_idx`
  (`(created_at) WHERE status = 'pending'`) — both `CREATE INDEX IF NOT EXISTS`, and the code works
  without them. Checked locally with 2 000 synthetic accounts: the email search is a Bitmap Index
  Scan on `user_email_lower_idx`, the document queue an Index Scan + incremental sort, and its
  count an Index Only Scan.
- **What is still a sequential scan**: the profile list orders by a `CASE` over `status`
  (pending → draft → rejected → hidden → active), and no index serves that. At 2 000 profiles the
  sort is invisible; at hundreds of thousands the list would need a different order or a
  materialised sort key. `ilike '%…%'` over names is a scan too — `pg_trgm` is the way out, and the
  owner's decision was **not** to add the extension now.
- `src/components/admin/`: `admin-overview`, `admin-profiles-table`, `admin-document-queue`,
  `admin-users-table` (one per route, markup carried over unchanged from the old `admin-view.tsx`),
  plus `pager.tsx`, `admin-ui.tsx` (labels, date formatting, button classes) and
  `use-admin-action.ts` (one moderator decision: busy row, human error text, refresh).
- **Prefetch of an admin section costs no queries**: the sidebar's `<Link>`s and the search
  `<Form action="/admin/users">` prefetch, but Next answers a prefetch of these dynamic routes with
  a 319-byte shell and runs no page code (checked locally 2026-09-16 with `log_statement='all'`:
  zero statements). Do not "optimise" that away with `prefetch={false}`.

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
  `style-src 'unsafe-inline'` is for the `style=` attributes of next/image and of the animation
  delays (hero, `Reveal`); `img-src data:` is the blur placeholders. Everything else is `'self'` — fonts are self-hosted by next/font.
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

## Railway — deploy, liveness, service scripts

Railway deploys this directory (`/nyanya-app`) from `master`. What the repository controls lives
in `railway.json`; everything else — backups, monitoring, the region, the Postgres CA — is the
owner's work and is written down step by step in **`../docs/operations/railway-runbook.md`**
(Russian, with the dashboard clicks, the CLI commands and what each thing costs). **None of it
is done yet**: there is no confirmed backup, no external monitor, no restore drill.

- **`/api/health` (`src/app/api/health/route.ts`)** answers `{"status":"ok","db":"ok","ms":N}`
  with 200, or the same shape with `"error"` and **503** when a `select 1` fails or takes longer
  than 3 s. No session, no role, no writes; GET and HEAD (a monitor may use either). The body
  carries nothing else — no error text, no database address, no env — because the address is
  public; the details go to the service log as `[health] база недоступна`. `Cache-Control:
  no-store` is set by the handler and survives, because `headers()` in `next.config.ts` does not
  set that key (a key it does set cannot be overridden by a handler — see «Security headers»).
  `src/proxy.ts` matches only `/account`, `/specialist`, `/admin`, so nothing redirects this
  route. Checked locally 2026-09-16: 200 with the database up; with `nyanya-postgres` stopped,
  503 in ~10 ms; against a TCP port that accepts and never answers, 503 after 3005 ms (the
  timeout, not a hang) — and the pending query is left to settle on its own.
- **`railway.json`**: `healthcheckPath: "/api/health"`, `healthcheckTimeout: 120`,
  `restartPolicyType: "ON_FAILURE"`, `restartPolicyMaxRetries: 10`. Railway queries the path
  **only during a deploy** — a container that starts but cannot see the database never receives
  traffic, the previous release keeps serving — and **never afterwards**: continuous monitoring
  is an external service, which the owner has not set up. The timeout is 120 s (Railway's default
  is 300) because pre-deploy migrations are not counted in it and `next start` boots in seconds.
  `ALWAYS` is deliberately not used: it is unavailable on the free and trial plans, while
  `ON_FAILURE` ×10 is Railway's own default and valid everywhere (it used to be ×3 — three
  restarts burn out in a minute).
- **Config as Code is deprecated: Railway stops reading `railway.json` on 2026-12-01.** Until the
  repository moves to `.railway/railway.ts` (runbook §7, do it by mid-November), the same five
  values must also be set by hand in the dashboard — otherwise pre-deploy migrations and the
  healthcheck disappear silently on that date.
- **Service scripts connect with `ssl: "require"`, which encrypts but does not verify the
  certificate.** In postgres 3.4.9 `require`, `allow` and `prefer` all set
  `rejectUnauthorized = false` (`node_modules/postgres/src/connection.js`), so all four scripts
  that reach production through the public proxy — `delete-accounts.mjs`, `set-password.mjs`,
  `set-gender.mjs`, `purge-orphan-files.mjs` — are equally unverified; `delete-accounts.mjs` used
  to say `{ rejectUnauthorized: false }`, which was the same thing spelled out. Real verification
  (verify-ca) needs the root certificate the Railway Postgres image generates on its own volume;
  only the owner can download it (`railway volume files download`, runbook §6), and the code that
  would use it is not written. Do not claim these scripts verify anything.
- **`scripts/purge-demo-accounts.mjs` and `scripts/db-seed-upgrade.mjs` are deleted** (2026-09-16).
  The first deleted every account *not* listed in `--keep` and had a `--force-active` flag that
  bypassed its only guard; the second overwrote profiles by slug, wrote `rating_avg` as a constant
  and replaced the reviews table with invented ones. The demo data they served was cleaned out
  2026-08-11; git history keeps both files. `delete-accounts.mjs` (deletes only the listed
  addresses, dry run by default, JSON dump before `--apply`) is the one account-removal script,
  and a script that deletes "everyone except" must not come back.

## Plan

`../docs/BACKEND-PLAN.md` — phases 1–7 are complete. Ф8 (notifications, toasts, skeletons) is next,
then Ф9 (production acceptance + a security review of action-level roles/ownership/IDOR).
