@AGENTS.md

# nyanya.uz — repository guide

**The live application is [`nyanya-app/`](nyanya-app), not this directory.** Start there:
[`nyanya-app/CLAUDE.md`](nyanya-app/CLAUDE.md).

## Repository layout

| Path | What it is |
|---|---|
| `nyanya-app/` | **The current app.** Deployed to Railway (service `nyanya`, root directory `/nyanya-app`). |
| `src/`, `messages/`, `drizzle/`, `public/` in this root | **Legacy build** — the older application from the `main` branch, kept for reference. Not deployed, not maintained. |
| `docs/` | `ARCHITECTURE.md`, `BACKEND-PLAN.md` (the phase plan being executed), `changes/` |
| `design-system/MASTER.md` | Visual language reference |
| `assets-source/` | Source images for generated media |

Both trees carry their own `package.json` and lockfile. `nyanya-app/next.config.ts` pins the
Turbopack root so the root project's files are never picked up.

Branches: **`master` is the working branch and what Railway deploys.** `main` is stale (last
touched 2026-07-08) and holds only the legacy app.

## The legacy app in this root — how it differs

Do not carry assumptions from it into `nyanya-app`. It is **not** merely an older version:

- it gated contact reveal behind a **mock payment**; the current app opens contacts **free, after
  login** (see `docs/BACKEND-PLAN.md`)
- it was trilingual via `next-intl` under `src/app/[locale]/`; the current app is **Russian-only,
  with no locale routing and no `next-intl`**
- it had Vitest tests and a `src/lib/providers/` abstraction; the current app has **neither**
- its demo password logins and mock OTP (`123456`) do not exist in the current app

## Change history

`docs/CHANGELOG.md` indexes `docs/changes/*.md`. Note that the index stopped being maintained
after 2026-06-28 — the phase work since then is recorded in git history on `master`, not here.
