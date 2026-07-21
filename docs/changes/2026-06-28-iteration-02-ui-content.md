# Iteration 02 — UI polish, content realism, featured hero

**Date:** 2026-06-28 · **Focus:** fix visible UI defects from review, make seed content feel natural, wire the home hero to a real specialist.

## Fixes

### Filters showed raw `__all`
base-ui `Select` renders the raw `value` unless `Select.Root` is given an `items` map. Passed an `items: Record<value, label>` to every select (`catalog-filters.tsx`, `catalog-sort.tsx`, `specialist-profile-form.tsx`) so the trigger shows the label (e.g. "Все"), not the sentinel value. *(committed earlier as `fix(select)`; noted here for completeness.)*

### Verification badges barely visible
`VerificationBadge` was a low-contrast champagne-soft pill. Changed to solid high-contrast pills: **Premium Verified** → `bg-gold-ink text-white`, **Verified** → `bg-royal text-white`, both with `shadow-sm`. Now legible on photos and cards.

### Duplicate "Документы проверены"
The profile header rendered both `<VerificationBadge>` **and** a separate `BadgeCheck + verifiedDocs` span — visually redundant. Removed the second span (and the now-unused `BadgeCheck` import); the badge alone communicates status.

### TrustSeal label was hard-coded English "Trust"
Added `common.trust` to all three message catalogs (RU **Доверие** · UZ **Ishonch** · EN **Trust**) and the seal now renders `t("trust")`. Tuned size/letter-spacing so the word sits cleanly under the score.

### Uneven card / container heights
Catalog cards now stretch to a uniform height: the card `Link` is `flex h-full flex-col`, the content block is `flex flex-1 flex-col`, and the price row uses `mt-auto` so it pins to the bottom regardless of name/city length. Home feature cards got `flex flex-col` for the same reason.

### Home hero didn't link anywhere / used a static image
The hero is now driven by data. `getFeaturedSpecialist()` (highest-trust active profile that has a photo) feeds a clickable `<Link>` to `/catalog/{id}` showing the specialist's real photo, localized name, category, city, verification badge and Trust Score. Falls back to static copy if the catalog is empty.

## Content realism (seed)

- **Reviews** — replaced the 8 uniform testimonials with **15 varied-length** tri-lingual ones (short "Спасибо большое!" → long multi-sentence). Reviewer pool grew from 4 to **10 realistic names** (Aziz U., Dilbar M., Elena V., Olga P., …), assigned round-robin. No more "Родитель N".
- **Single-person portraits** — every specialist now shows **one person per image**. Cropped the multi-face source collages into 8 single-face portraits (`public/media/specialists/face-0X.png`) for the women; the remaining specialists use clean monogram avatars.
- **Name / ethnic diversity** — diversified names to reflect Uzbekistan's mix: e.g. caregiver → **Ольга Соколова** (Olga Sokolova), tutor → **Дмитрий Волков** (Dmitri Volkov), alongside the Uzbek majority. `LATIN_NAMES` updated so UZ/EN locales show the Latin spelling.

## Schema / query support

- `getFeaturedSpecialist()` added to `src/lib/queries.ts` (uses `isNotNull(photoKey)` + trust ordering).
- Localized content columns used throughout: `descriptionUz/En`, `educationUz/En`, `fullNameLatin` on profiles and `textUz/En` on reviews, surfaced via `localizedName()`.

## Verification

`npx tsc --noEmit` clean. Reseeded (`FORCE_SEED=true`) and verified in-browser across **RU / UZ / EN**: hero links through to the featured profile, badges legible, single-face photos, varied reviews with real names, equal card heights, seal label localized.

## Follow-up — localize the verification badges

Per request, the verification labels are no longer English brand terms. Localized the remaining holdouts (RU / UZ; EN stays as the source language):
- `common.verified` → **Проверен** · **Tasdiqlangan**
- `common.premiumVerified` → **Премиум-проверка** · **Premium tasdiqlangan**
- `common.trustScore` (specialist dashboard) → **Индекс доверия** · **Ishonch indeksi**
- `admin.trust` / `admin.makeVerified` / `admin.makePremium` (admin panel) → **Доверие / Проверен / Премиум** · **Ishonch / Tasdiqlangan / Premium**

The Trust *seal* label (`common.trust`) was already localized (Доверие / Ishonch / Trust). Verified in-browser: catalog badges render Cyrillic, no English brand terms remain.

## Follow-up — fix clipped portraits

The first crops were taken from the **top** cells of the 2×2 source collages, where each face sits against the image's top edge — so heads were clipped and a couple carried a watermark sliver. The hero (`hero.png`) had the same issue plus a watermark band.

Re-cut all 7 portraits from the collages' **bottom** cells, which have full heads with real headroom and sit clear of the centred watermark. Produced 7 **distinct** 4:5 crops (1 hero + 6 cards, no repeated faces), resized to web sizes and PNG-optimised — `hero.png` alone dropped **1.65 MB → 184 KB**, the six faces ≈110–160 KB each. Filenames unchanged, so no DB/seed change.

Verified through the real `next/image` pipeline (server-side, bypassing browser cache): all 7 render full-head, watermark-free. *Note:* a long-running `next dev` caches optimised variants in memory and won't notice a same-name source swap — restart dev (or hard-refresh) to see replacements locally; production serves the new files fresh. One spare clean crop (an older woman) remains available if we later want a photo for a caregiver instead of a monogram.

## Follow-up — translation completeness audit (100%)

Audited the whole app for i18n coverage, not just visible chrome:
- **Key parity** — all three catalogs hold the same 244 keys (no missing keys in any locale).
- **No hardcoded UI strings** — swept components for hardcoded Cyrillic and for literal JSX text/attributes; the only non-`t()` text is in seed data (which carries `{ru,uz,en}`) and code comments.

Fixed the gaps found:
- **Spoken languages rendered raw** — `specialist.languages` is stored canonically (Russian) and the profile page printed it verbatim, so EN/UZ visitors saw "Русский, Узбекский". Added a shared `LANGUAGES` list + `localizeLanguage()` in `lib/format.ts`; the profile page, the catalog filter, and the profile-form checkboxes all localize now (RU «Русский» · UZ «Rus tili» · EN "Russian"). Stored value is unchanged, so existing filters/data keep working.
- **`home.feature2Title`** was "Trust Score" in every locale → RU «Индекс доверия» · UZ «Ishonch indeksi» (matches the localized `common.trustScore`).
- **TrustSeal `aria-label`** was hardcoded `"Trust Score N of 100"` → now built from the localized `trustScore` key (screen-reader text follows the locale).
- **Email label** `Email` → RU «Эл. почта» (auth + admin). UZ keeps "Email" (standard loanword).

Remaining English-equal values are intentional: brand names (NANYA.UZ, Telegram, WhatsApp), a person's name, and accepted Uzbek loanwords ("Premium", "Administrator", "Email"). Notification titles already localize at render time via the `notif` namespace keyed on `type`. Verified RU/UZ/EN render correctly server-side.

## Follow-up — prod images 404 (stale seed)

**Symptom:** every portrait broke in production while fine locally.

**Root cause (confirmed against prod, not guessed):** the live catalog HTML referenced `/media/specialists/p1–p4.png` — the *original* seed's paths, which were deleted from the build when portraits were recut. Railway's seed is guarded against re-seeding a populated DB, so the prod DB kept the old `photoKey`s. `curl` proof: old `p1.png` → raw **404** / optimized **400**; new `face-01.png` & `hero.png` → **200** (files deployed, optimizer healthy). So it was purely stale data, not sharp/optimizer/static-serving.

**Fix:** made the seed **self-healing**. The guard now skips only when the DB is *already on the current seed* (detected by a `photoKey` under `/media/hero*` or `/media/specialists/face-*`). A populated-but-stale DB (old paths) is refreshed automatically on the next deploy, then skipped thereafter; `FORCE_SEED=true` still forces. This also lands the diversified names, varied reviews and localized content on prod. (Verified: migrations 0000–0002 already ship the i18n columns, so the reseed inserts cleanly.)

## Follow-ups

- **Full ethnically-diverse generated faces** (male drivers, older caregivers, Russian/Tatar faces) still need fresh Higgsfield generation — currently blocked by the account's **grace-period generation cap** (credits available, but daily generation limit reached; did not reset overnight). Until then those specialists use monograms. Re-run portrait generation once the cap clears, then reseed.
