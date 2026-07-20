# nyanya.uz — Design System MASTER

Source of truth for all pages. Derived from the confirmed design reference
(`hf_20260720_030402_24fbfb15…png`, 2026-07-20 iteration — the "airy" version with the
featured-specialist card removed) + its generation prompt, plus the content structure doc.

## Design read

Premium trust-first family-services marketplace for affluent Tashkent families (RU locale).
Visual language: **quiet-luxury hotel brochure** — warm ivory-cream, deep espresso-charcoal
dark sections, muted champagne-bronze accents, editorial whitespace, thin hairlines, sharp
corners. Dials: variance 6 · motion 5 · density 3 (air dominates; elements shrink before
whitespace does).

## Color tokens

| Token | Hex | Use |
|---|---|---|
| `--color-cream` | `#F2EFE9` | page background (ivory) |
| `--color-cream-deep` | `#E9E4DA` | trust strip band, subtle fills |
| `--color-ink` | `#211F1A` | display text, dark buttons (espresso near-black; never #000) |
| `--color-ink-soft` | `#5D584E` | secondary/body text on cream |
| `--color-ink-faint` | `#8A8478` | metadata, placeholders |
| `--color-bronze` | `#96733A` | accent for icons, borders, the seal (non-text, 3:1 ok) |
| `--color-bronze-text` | `#7A5C2B` | bronze for TEXT on cream (5.4:1 AA) — eyebrows, step numbers, link hovers |
| `--color-bronze-soft` | `#C2A165` | solid CTA on dark band, hover fills |
| `--color-charcoal` | `#26231E` | dark CTA band, footer background |
| `--color-charcoal-2` | `#1E1B17` | footer bottom bar |
| `--color-line` | `#DBD5C8` | hairline dividers on cream |
| `--color-line-dark` | `rgba(242,239,233,.14)` | hairlines on charcoal |
| `--color-paper` | `#FBFAF7` | cards / elevated surfaces if needed |

Accent lock: bronze is the ONLY accent, used identically everywhere. No purple, no cool tones.
Shadows, when used, are warm-tinted (`rgba(33,31,26,…)`), never pure black.

## Typography

- **Display (serif):** Playfair Display (variable, Cyrillic subset) — high-contrast Didone
  feel per reference. Headings use weight 500–600, tight-ish leading (1.05–1.15),
  `letter-spacing -0.01em`. H1 ~clamp(2.75rem → 4.75rem).
- **Body + UI (sans):** Golos Text (Cyrillic-native geometric grotesque) — body 16–17px,
  line-height 1.6, `--color-ink-soft` on cream.
- **Micro-labels:** Golos Text, 11–12px, uppercase, tracking 0.16–0.22em. Used sparingly
  (eyebrow budget: ≤ ceil(sections/3)).
- Russian typographic norms apply: «ёлочки» quotes, тире (—) in copy is correct Russian
  punctuation and stays.

## Shape & materials

- Corners: **sharp (0px)** globally — buttons, bands, footer. Photo cards may use 2px
  anti-fringe rounding only. One exception by design: the **hero photo uses a soft
  feathered organic mask** (CSS mask, radial feather) and the circular seal — these are the
  brand's signature curves against an otherwise rectilinear system.
- Dividers: 1px hairlines (`--color-line`), generous section padding (py-24 → py-36 desktop).
- No glassmorphism, no gradients except photo-legibility scrims (charcoal → transparent).

## Signature element

The **circular rotating trust seal** («БЕЗОПАСНОСТЬ · ДОВЕРИЕ · ЗАБОТА» on a circular text
path around a heart-ligature mark) overlapping the hero photo edge. Slow 24s rotation,
frozen under `prefers-reduced-motion`. This is the one bold moment; everything else stays quiet.

## Motion (intensity 5)

- Hero: single orchestrated load sequence (fade + 24px rise, 80ms stagger).
- Sections: `whileInView` reveal, once, 0.6s, ease `[0.16,1,0.3,1]`.
- Hover: photo scale 1.03 (700ms), arrow slide, button `-translate-y-[1px]` on :active.
- Library: `motion/react` in isolated client leaves. All gated by `useReducedMotion`.
- No marquees, no scroll-hijack, no parallax on this page.

## Imagery

Warm natural window light, beige/cream tones, soft cinematic grade, editorial luxury
lifestyle (Kinfolk-adjacent). Generated via Higgsfield `gpt_image_2` @ 2k/high.
People: warm, local-feel (Central Asian + mixed), dignified, never stocky-corporate.

## Page structure (main page, confirmed reference order)

Header → Hero (split, photo right + seal on photo's lower-right edge) → Trust strip
(«Нам доверяют», INSET cream-deep panel, 5 fictional wordmarks — D2 placeholders) →
Services «Кого вы ищете?» (D1 self-serve heading) ×4 cards (full-bleed photo, charcoal
gradient scrim /95→/35→transparent, text overlaid — owner's call 2026-07-20, overriding
the review's solid-panel variant) → «Доверие, оформленное как роскошь»
(left rail + 3 columns, dividers only BETWEEN columns) → «Как это работает» (left
heading rail at xl, left-aligned steps, dashed connector) → Dark CTA band (INSET
charcoal panel, photo visible right, gradient left; 2 buttons, D4) → Footer (the only
full-bleed dark surface). **No featured-specialist block** — removed in the final
reference iteration.

Craft rules learned in review: header/footer live in root layout; images as sized JPEGs
(~150–350 KB) statically imported from `src/content/home.ts` (typed StaticImageData);
`preload` (not deprecated `priority`) on the LCP hero image; NBSP inside «10 000» and
phone numbers; min tap targets via padded link hit areas; footer text alpha floor
`cream/60`; trust-bar text `ink-soft` (never `ink-faint` on cream-deep).

## Stack

Next.js (latest, App Router, RSC default) · Tailwind v4 · motion/react ·
@phosphor-icons/react (one family, strokeWidth-consistent light/regular) ·
next/font/google (Playfair Display + Golos Text, cyrillic + latin subsets).

## Open decisions honored via fallback registry (content doc)

D1 self-serve · D2 placeholder wordmarks (replace before launch) · D3 «10 000 семей»
placeholder (replace before launch) · D4 two buttons in dark band · D7 category nav.
