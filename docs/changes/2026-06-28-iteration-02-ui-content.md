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

## Follow-ups

- **Full ethnically-diverse generated faces** (male drivers, older caregivers, Russian/Tatar faces) still need fresh Higgsfield generation — currently blocked by the account's **grace-period generation cap** (credits available, but daily generation limit reached; did not reset overnight). Until then those specialists use monograms. Re-run portrait generation once the cap clears, then reseed.
