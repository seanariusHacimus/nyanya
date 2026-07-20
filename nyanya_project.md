# nyanya.uz — Content Structure (page by page)

Working document defining what content sits on each page and in what order. Grows one page per iteration: header, footer, and the main page are defined below (based on the design reference of 2026-07-17); remaining pages are queued at the end and will be added in future prompts.

Copy is written in Russian (primary locale). Uzbek and English translations follow the final RU.

**Status legend:** **build** = already exists in the current application · **ref** = introduced by the design reference · **new** = doesn't exist yet, must be created · **placeholder** = reference shows fake data, real data needed · **decision** = owner call required (see D-list).

**Element markers:**
🖼️ image / photo · 🌄 background image · 🔷 logo · ✨ icon / graphic · 🎥 video · 🔘 button · 🔗 link / clickable · 🧩 interactive control (switcher, menu, form element) · unmarked = plain text · **⛳ fallback value** — temporary working data, not final; every ⛳ is tracked as a task in `nyanya-backlog.md`

Companion document: `nyanya-project-description.md` (functionality, data, journeys).

---

## КАРТА ДОКУМЕНТА — all pages at a glance

✅ confirmed · ✅ auto — generated without review (post-sign-in / specialist pages, per owner rule 2026-07-20) · 🔄 draft, awaiting confirmation · ⏳ queued

| § | Page | Status |
|---|---|---|
| 1 | Header (global) | ✅ |
| 2 | Footer (global) | ✅ |
| 3 | Главная | ✅ |
| 4 | Каталог | ✅ (decisions D8–D12 open) |
| 5 | Профиль специалиста | ✅ (decisions D13–D18 open) |
| 6 | Как это работает | ✅ (decisions D19–D21 open) |
| 7 | Специалистам (landing) | ✅ (decisions D22–D24 open) |
| 8 | Анкета специалиста (onboarding + статус) | ✅ auto (D25–D27 open) |
| 9 | Вход / Регистрация / Подтверждение телефона | ✅ (decisions D29–D30 open) |
| 10 | Оплата открытия контактов | ✅ auto |
| 11 | Кабинет родителя | ✅ auto |
| 12 | Кабинет специалиста | ✅ auto (D28 open) |
| 13 | Админ-панель | ✅ auto |
| 14 | Проверка специалистов (new) | ✅ (fallback) |
| 15 | Контакты (new) | ✅ (fallback) |
| 16 | Вопросы и ответы (new) | ✅ (fallback) |
| 17 | Блог (new) | ✅ (fallback) |
| 18 | О сервисе | ✅ (fallback) |
| 19 | Пользовательское соглашение · Политика конфиденциальности | ✅ (fallback) |
| 20 | Системные страницы (404, пустые состояния) | ✅ (fallback) |

---

## 0. Content decisions raised by the reference (resolve before build)

| # | Decision | What the reference shows | What the build has | Options |
|---|---|---|---|---|
| D1 | **Core flow framing** | Concierge model: «Оставьте заявку → Мы подберём лучших» — a request form, platform picks for the family | Self-serve: browse catalog → pay to unlock contacts, no request form exists | (a) keep self-serve, rewrite steps/CTAs to match; (b) add a real «заявка» lead-form feature; (c) hybrid — self-serve catalog + optional «подобрать за меня» form |
| D2 | **Trust bar** | «Нам доверяют» + Hilton, Four Seasons, Ritz-Carlton, Bulgari, Aman logos | nothing | Placeholder luxury logos can't ship. Replace with: real partner/client logos, press mentions, verification-process badges, or platform numbers (specialists verified, documents checked) |
| D3 | **«10 000 семей» stat** | «С нами более 10 000 семей в Ташкенте» | 12 seeded profiles, no such metric | Use a real number when one exists; until then reframe («Каждый специалист проходит проверку документов» etc.) |
| D4 | **Dark band audience mismatch** | Headline addresses families («Присоединяйтесь…»), button addresses specialists («Стать специалистом») | — | Split into two CTAs (find / become) or align text and button to one audience |
| D5 | **Blocks in build but absent from reference** | — | Three trust features (Проверка документов · Индекс доверия · Прямой контакт) and the featured-specialist card | Keep (recommended: they explain the paid-unlock model), merge into another block, or cut |
| D6 | **New pages implied by the footer** | Блог, Вопросы и ответы, Контакты, Проверка специалистов | none of these exist; О сервисе / Соглашение / Конфиденциальность exist as stubs | Confirm scope: build all, or trim footer links to real pages |
| D7 | **Header navigation** | Categories as top-level nav items (Няни · Сиделки · Репетиторы · Водители · О сервисе) | Каталог · Специалистам · Как это работает | Adopt category nav (each item → pre-filtered catalog) or keep functional nav; affects every page |

---

## 1. HEADER (global, all pages)

| # | Element | Content (RU) | Action / link | Status & notes |
|---|---|---|---|---|
| 1.1 | 🔷 Logo | NYANYA.UZ (wordmark) | 🔗 → Главная | build (reference spells NANYA.UZ — keep nyanya.uz) |
| 1.2 | 🔗 Nav: category links | Няни · Сиделки · Репетиторы · Водители | → Каталог с фильтром категории | ref · decision D7; category set pending (3 vs 4 — see project-description §16) |
| 1.3 | 🔗 Nav: about link | О сервисе | → /about | ref (page is a stub — D6) |
| 1.4 | 🧩 Language switcher | RU ▾ (RU / UZ / EN) | switches locale | build |
| 1.5 | 🔘 Primary CTA button | Подобрать специалиста | → каталог **или** форма заявки | ref · decision D1 |
| 1.6 | 🔗 Authed state (not in reference) | Кабинет · Выйти (replaces CTA or sits beside it) | → /account | build; reference shows only logged-out state — define logged-in header |
| 1.7 | 🧩 Mobile burger (✨ icon) | Menu with items 1.2–1.5 | opens menu | build pattern exists |

Removed vs current build: explicit «Войти / Регистрация» links (reference folds entry into the CTA path). Decision: keep a quiet 🔗 «Войти» text link or route auth through CTA only.

## 2. FOOTER (global, all pages)

| # | Element | Content (RU) | Action / link | Status & notes |
|---|---|---|---|---|
| 2.1 | 🔷 Brand block | NYANYA.UZ + «Премиальный сервис по подбору специалистов для вашей семьи.» | — | ref (current tagline: «Платформа для поиска и взаимодействия между семьями и специалистами.» — pick one) |
| 2.2 | ✨🔗 Social icons ×3 | Instagram · Telegram · телефон/WhatsApp | external links | new — accounts must exist |
| 2.3 | 🔗 Column «Сервис» | Няни · Сиделки · Репетиторы · Водители | → filtered catalog | ref; mirrors 1.2 |
| 2.4 | 🔗 Column «О компании» | О сервисе · Как это работает · Проверка специалистов · Контакты | → pages | «Проверка специалистов» and «Контакты» = new pages (D6) |
| 2.5 | 🔗 Column «Полезное» | Блог · Вопросы и ответы · Для специалистов | → /blog, /faq, /become-specialist | Блог + FAQ = new (D6); «Для специалистов» = build |
| 2.6 | 🔗 Contacts | ⛳ +998 90 123 45 67 · ⛳ info@nyanya.uz | tel: / mailto: | fallback — replace with real number/inbox (backlog T1–T2) |
| 2.7 | 🔘 Footer CTA button | Подобрать специалиста | same as 1.5 | ref · D1 |
| 2.8 | Disclaimer | «Мы предоставляем платформу для поиска и взаимодействия. nyanya.uz не несёт ответственности за действия пользователей и не гарантирует качество услуг. Пользователь самостоятельно выбирает специалиста и принимает решение.» | — | build — **keep**; absent from reference but legally important for the unlock model |
| 2.9 | 🔗 Bottom bar | © 2026 nyanya.uz — Все права защищены · Пользовательское соглашение · Политика конфиденциальности · Ташкент, Узбекистан | → /terms, /privacy | build (stub pages need real text) |

## 3. MAIN PAGE

### 3.1 Block map (top to bottom)

| Order | Block | Purpose | Assets & actions | Status |
|---|---|---|---|---|
| B1 | Hero | Emotional promise + primary action | 🖼️ hero photo · ✨ seal badge · 🔘 CTA · 🔗 secondary | ref (replaces current hero) |
| B2 | Trust bar | Instant social proof | 🔷 ×5 logos | ref · D2 |
| B3 | Services (categories) | Route the visitor into the right catalog slice | 🖼️ ×4 card photos · 🔗 ×4 cards · 🔗 section link | ref (photographic upgrade of current category chooser) |
| B4 | How it works | Remove procedural doubt | ✨ ×4 step icons | ref · steps depend on D1 |
| B5 | CTA band (dark) | Second conversion moment + specialist funnel | 🌄 background photo · 🔘 CTA | ref · D3, D4 |
| B6 (optional) | Trust features / Почему nyanya | Explain verification, Trust Index, paid contacts | ✨ ×3 feature icons | build · D5 |
| B7 (optional) | Featured specialist | Proof of live, high-quality supply | 🖼️ portrait · ✨ trust seal · ✨ badge · 🔗 card | build · D5 |
| — | Footer | see §2 | — | — |

### 3.2 B1 — Hero

| Element | Content (RU) | Action / link | Notes |
|---|---|---|---|
| Eyebrow | ПРОВЕРЕННЫЕ СПЕЦИАЛИСТЫ ДЛЯ ВАШЕЙ СЕМЬИ | — | ref |
| H1 | Доверяйте главному | — | ref (current build: «Доверьте дом тем, кого проверили» — alternative) |
| Subtitle | Мы тщательно проверяем специалистов, чтобы вы были спокойны за самое важное. | — | ref |
| 🔘 Primary button | Подобрать специалиста | → каталог / форма заявки | D1 |
| 🔗 Secondary link | Как это работает | → /how-it-works or scroll to B4 | ref |
| 🖼️ Hero image | Warm lifestyle photo (caregiver + child, home setting) | — | asset needed; reference uses generated imagery |
| ✨ Seal element | Circular badge: «Безопасность · Доверие · Забота» | — | ref; can later carry the real Trust-Seal motif |

⚠️ Coherence note: the build's honesty line «Пока сервис работает только в Ташкенте» has no home in the reference hero. Geographic scope must live somewhere public — relocated to §16 F2 (FAQ) and optionally the eyebrow («Ташкент · Проверенные специалисты», build variant).

### 3.3 B2 — Trust bar

| Element | Content (RU) | Action / link | Notes |
|---|---|---|---|
| Label | Нам доверяют | — | ref |
| 🔷 Logo row (5 slots) | ⚠️ Reference shows Hilton / Four Seasons / Ritz-Carlton / Bulgari / Aman — placeholders, cannot ship | — | D2: real partners, press, or replace block with verification stats («100% анкет с проверкой документов», «Индекс доверия 0–100», …) |

### 3.4 B3 — Services

| Element | Content (RU) | Action / link | Notes |
|---|---|---|---|
| H2 | Мы подбираем для вас | — | ref; self-serve alternative: «Кого вы ищете?» (build) — D1 |
| 🔗 Section link | Смотреть все услуги | → /catalog | ref |
| 🖼️🔗 Card 1 | Photo + «Няни» + «Заботливые и опытные няни для ваших детей» + ✨ → | → catalog?category=nanny | ref copy ≈ build copy |
| 🖼️🔗 Card 2 | Photo + «Сиделки» + «Забота и поддержка для ваших близких» + ✨ → | → catalog?category=caregiver | ref |
| 🖼️🔗 Card 3 | Photo + «Водители» + «Надёжные водители для вашей семьи» + ✨ → | → catalog?category=driver | ref (order: reference places drivers 3rd) |
| 🖼️🔗 Card 4 | Photo + «Репетиторы» + «Опытные преподаватели для обучения и развития» + ✨ → | → catalog?category=tutor | ref |
| — | Category set = open decision (3 vs 4, cleaner?) | — | project-description §16.1 |

### 3.5 B4 — How it works

Each step = ✨ icon in a circle + step number + title + one-line description.

Reference version (concierge — requires D1 option b/c):

| Step | ✨ Icon | Title | Description |
|---|---|---|---|
| 01 | ✏️ pencil | Оставьте заявку | Заполните короткую форму на сайте |
| 02 | 🔍 magnifier | Мы подберём лучших | Подбираем специалистов, которые подходят вам |
| 03 | 💬 chat | Вы общаетесь | Знакомитесь и уточняете все детали |
| 04 | 🛡️ shield | Начните сотрудничество | Выбираете специалиста и начинаете работу |

Self-serve version matching the current product (D1 option a — rewrite of the same block):

| Step | ✨ Icon | Title | Description |
|---|---|---|---|
| 01 | ▦ category grid | Выберите категорию | Няня, сиделка, репетитор или водитель |
| 02 | 🔍 magnifier | Изучите анкеты | Фильтры, индекс доверия, отзывы и видео-визитки |
| 03 | 🔓 unlock | Откройте контакты | Оплатите доступ — телефон, Telegram и WhatsApp |
| 04 | 🤝 handshake | Начните сотрудничество | Договаривайтесь напрямую, без посредников |

### 3.6 B5 — CTA band (dark)

| Element | Content (RU) | Action / link | Notes |
|---|---|---|---|
| H2 | С нами более 10 000 семей в Ташкенте | — | placeholder stat — D3 |
| Subtitle | Присоединяйтесь к тем, кто уже доверил нам самое важное. | — | ref |
| 🔘 Button | Стать специалистом | → /become-specialist | ref; audience mismatch with headline — D4 (option: two buttons — 🔘 «Подобрать специалиста» + 🔘 «Стать специалистом») |
| 🌄 Background | Interior lifestyle photo | — | asset needed |

### 3.7 B6 (optional, from build) — Почему nyanya

| Element | Content (RU) |
|---|---|
| H2 | Доверие, оформленное как роскошь |
| ✨ Feature 1 (shield icon) | Проверка документов — Паспорт, медицинские справки и сертификаты проверяются модератором до публикации анкеты. |
| ✨ Feature 2 (gauge icon) | Индекс доверия — Показатель доверия от 0 до 100 на основе верификации, опыта и обращений. |
| ✨ Feature 3 (chat icon) | Прямой контакт — После оплаты открываются телефон, Telegram и WhatsApp — общайтесь напрямую. |

Keep/cut = D5. If kept, natural position: between B3 and B4, or merged into B2 as the trust-bar replacement.

### 3.8 B7 (optional, from build) — Featured specialist

🔗 Card: 🖼️ photo · name, age · category · district · ✨ Trust Seal score · ✨ verification badge → profile page. Purpose: shows real supply and previews the catalog card. Keep/cut = D5.

---

## 4. КАТАЛОГ — ✅ confirmed 2026-07-20 · decisions D8–D12 open

Source: current build (fully functional page) + design language of the main-page reference. No catalog reference image received yet — structure below is ready for one.

### 4.1 Block map (top to bottom)

| Order | Block | Purpose | Assets & actions | Status |
|---|---|---|---|---|
| C1 | Page head | Orient: what am I looking at, how many options | — | build |
| C2 | Filter panel | Narrow the list | 🧩 controls · 🔗 reset · 🔘 mobile trigger | build |
| C3 | Sort + result count row | Control ordering | 🧩 sort select | build |
| C4 | Specialist card grid | The inventory itself | 🖼️ photo per card · ✨ badges/seal | build |
| C5 | Empty state | Recover from over-filtering | ✨ graphic · 🔘 reset | build |
| C6 | Pagination / load more | Scale beyond one screen | 🔘 | new · D9 |
| C7 | Bottom CTA band (optional) | Catch users who didn't click a card | 🔘 | new · D12 |
| — | Footer | see §2 | — | — |

### 4.2 C1 — Page head

| Element | Content (RU) | Action / link | Notes |
|---|---|---|---|
| H1 | Каталог специалистов | — | build |
| H1 dynamic variant | «Няни в Ташкенте», «Сиделки — Юнусабадский район» when a category/district filter is active | — | new · D10 (SEO + orientation) |
| Result count | Найдено: 12 | — | build; lives here or in C3 row |

### 4.3 C2 — Filter panel (desktop: left sidebar · mobile: 🔘 «Фильтры» → 🧩 bottom sheet)

| Control | Type | Content / options (RU) | Notes |
|---|---|---|---|
| Категория | 🧩 select / segments | Все · Няни · Сиделки · Репетиторы · Водители | category set pending (3 vs 4) |
| Город | 🧩 select | Ташкент | single city — hide until multi-city? |
| Район | 🧩 select | Все · Юнусабадский · Мирзо-Улугбекский · Чиланзарский · Яккасарайский · Мирабадский · Шайхантахурский | build |
| Язык | 🧩 select | Любой · Русский · Узбекский · Английский | build |
| Цена до | 🧩 input / slider | сум | build; unit varies by category (час/день) — display note |
| Опыт от | 🧩 input | лет | build |
| Знание английского | 🧩 toggle | — | build |
| Наличие автомобиля | 🧩 toggle | — | build |
| С проживанием | 🧩 toggle | — | build · nanny/caregiver-specific |
| Ночная няня | 🧩 toggle | — | build · nanny-specific |
| Для новорождённых | 🧩 toggle | — | build · nanny-specific |
| Сбросить фильтры | 🔗 | — | build |
| Applied filters | 🧩 chip row above grid (each chip removable ✕) | e.g. «Няни ✕» «до 50 000 сум ✕» | new — recommended for mobile |

### 4.4 C3 — Sort

🧩 Select: **По доверию** (default) · Сначала дешевле · Сначала дороже · По опыту.

### 4.5 C4 — Specialist card (element inventory)

| Element | Content (RU) | Notes |
|---|---|---|
| 🖼️ Photo | portrait; fallback = monogram avatar (initials) | build; monogram must look premium, not gray-circle |
| ✨ Verification badge | Премиум-проверка / Проверен | build; unverified never shown in catalog |
| ✨ Trust seal / score | 84 · label «Доверие» | build; signature element |
| Category label | Няня / Сиделка / Репетитор / Водитель | build |
| Name + age | Севара Тошпулатова, 31 | build |
| ✨📍 District | Юнусабадский район | build |
| Experience | Опыт: 11 лет | build |
| ✨ Rating | ★ 4.8 (5) | build |
| Price | от 45 000 сум/час *(сиделки: сум/день)* | build |
| ♡ Favorite toggle | on-card icon button | D11 — currently on profile page; add to card? |
| 🔗 Whole card | → профиль специалиста | build |

### 4.6 C5 — Empty state

| Element | Content (RU) |
|---|---|
| ✨ Graphic | small neutral illustration / seal motif |
| Text | По вашему запросу специалистов не найдено. Попробуйте изменить фильтры. |
| 🔘 Button | Сбросить фильтры |

### 4.7 C6 — Pagination (D9)

Build currently renders all results (12 profiles). At scale choose: numbered pagination · 🔘 «Показать ещё» · infinite scroll.

### 4.8 C7 — Bottom CTA band (optional, D12)

Variant A (ties to D1 concierge/hybrid): «Не нашли подходящего специалиста?» + 🔘 «Оставить заявку».
Variant B (supply-side): «Вы специалист?» + 🔘 «Разместить анкету».

### 4.9 Decisions on this page

| # | Decision | Options |
|---|---|---|
| D8 | Universal filter set vs category-dependent | build = one set for all; nanny toggles look irrelevant for водители/репетиторы → show per-category filter groups? |
| D9 | Pagination pattern | numbered · load-more · infinite |
| D10 | Dynamic H1 per active filter | yes (SEO win) / keep static |
| D11 | ♡ favorite on cards | add (guests → login prompt) / profile-only |
| D12 | Bottom CTA band | variant A / variant B / none — depends on D1 |

---

## 5. ПРОФИЛЬ СПЕЦИАЛИСТА — ✅ confirmed 2026-07-20 · decisions D13–D18 open

The money page: converts "she looks good" into a paid contact unlock. Source: current build (fully functional) + reference design language. No profile reference image received yet.

### 5.1 Block map (top to bottom)

| Order | Block | Purpose | Assets & actions | Status |
|---|---|---|---|---|
| P1 | Back navigation | Return to filtered catalog without losing filters | 🔗 «← Каталог» or breadcrumb | build (simple back) |
| P2 | Profile hero | Identity + trust at one glance | 🖼️ photo · ✨ seal · ✨ badge · ✨ stars | build |
| P3 | Contact / unlock panel | The revenue interaction — 3 states | 🔘 CTA · ✨ contact icons · ♡ | build |
| P4 | О специалисте | Facts that justify the price | — | build |
| P5 | 🎥 Видео-визитка | Emotional proof, hear the voice | 🎥 player | schema-only · D13 |
| P6 | Отзывы | Social proof | ✨ stars per review | build (display) · D14 |
| P7 | Похожие специалисты (optional) | Keep the visitor if this one doesn't fit | 🖼️🔗 card row ×3–4 | new · D15 |
| P8 | Sticky mobile CTA bar | Price + unlock always reachable | 🔘 | new · D16 |
| — | Footer | see §2 | — | — |

### 5.2 P2 — Profile hero

| Element | Content (RU) | Notes |
|---|---|---|
| 🖼️ Photo | large portrait; fallback monogram | build |
| ✨ Trust seal | 84 · «Доверие» | build; large form of the catalog seal |
| ✨ Verification badge | Премиум-проверка / Проверен | build |
| Category chip | Няня | build |
| H1 | Севара Тошпулатова, 31 | build |
| ✨📍 District | Юнусабадский район | build |
| Experience | Опыт: 11 лет | build |
| ✨ Rating | ★ 4.8 · 🔗 «5 отзывов» → scroll to P6 | build (link = new micro-detail) |
| Price | от 45 000 сум/час *(сиделки: сум/день)* | build |
| ✨🔗 Share (optional) | «Поделиться» — copy link / Telegram | new — recommended: families forward profiles to spouses |

### 5.3 P3 — Contact / unlock panel (state machine)

| State | Elements | Content (RU) |
|---|---|---|
| Guest | hint + 🔘 button | «Откройте контакты, чтобы связаться напрямую — телефон, Telegram и WhatsApp» · 🔘 «Войдите, чтобы открыть контакты» → /login |
| Authed, not unlocked | hint + price + 🔘 button | 🔘 «Открыть контакты — 29 000 сум» *(price display to guests = D17)* |
| Payment processing | 🔘 disabled + spinner | «Обработка оплаты…» |
| Payment failed | error + 🔘 retry | «Оплата не прошла. Попробуйте ещё раз.» |
| Unlocked (permanent) | H3 «Контакты» + 3 rows | ✨📞 +998 __ ___ __ __ (tel:) · ✨ Telegram @username (t.me) · ✨ WhatsApp (wa.me) |
| Any state | ♡ 🔘 «В избранное» toggle | build; guests → login |
| Any state (optional) | 🔗 «Пожаловаться» | D18 — complaints exist in schema, no UI |

One-time payment per specialist, unlocked forever — worth stating in the panel: «Оплата разовая — контакты останутся доступны в вашем кабинете». (new copy, recommended)

### 5.4 P4 — О специалисте

| Element | Content (RU) | Notes |
|---|---|---|
| H2 | О специалисте | build |
| Description | free text, 2–4 paragraphs | build (trilingual in DB) |
| Fact row | Образование: Педагогический колледж | build |
| Fact row | Языки: Русский, Узбекский | build |
| Fact row | Опыт работы: 11 лет | build |
| Fact row | Английский язык: Базовый / Свободный | build (hidden if none) |
| ✨ Attribute chips (show only true) | Свой автомобиль · С проживанием · Ночные смены · Опыт с новорождёнными | build |

### 5.5 P5 — 🎥 Видео-визитка (D13)

| Element | Content (RU) |
|---|---|
| H2 | Видео-визитка |
| 🎥 Player | 30–60 sec vertical or 16:9 video, poster frame 🖼️ |
| Empty variant | block hidden entirely if no video |

Field exists in schema; upload + player not built. Options: build feature · show placeholder «Видео скоро появится» · hide block until feature ships.

### 5.6 P6 — Отзывы

| Element | Content (RU) | Notes |
|---|---|---|
| H2 | Отзывы (5) | build |
| Review item | ✨ ★★★★★ + text + автор «Sherzod K.» | build; date — add? |
| Empty state | «Пока нет отзывов» | build |
| 🔘 «Оставить отзыв» | opens review form | D14 — submission not built; if built, likely gated: only parents who unlocked contacts |

### 5.7 P7 — Похожие специалисты (optional, D15)

H2 «Похожие специалисты» + 🖼️🔗 3–4 catalog cards (same category, same/nearby district, similar price). Keeps the visitor in the funnel if this profile doesn't fit.

### 5.8 P8 — Sticky mobile CTA bar (D16)

Fixed bottom bar on mobile: price «от 45 000 сум/час» + 🔘 «Открыть контакты» (state-aware, mirrors P3). Recommended — this is the conversion page.

### 5.9 Decisions on this page

| # | Decision | Options |
|---|---|---|
| D13 | Видео-визитка block | build player now · placeholder text · hide until feature ships |
| D14 | Review submission | add 🔘 + form (gate: only after unlock?) · display-only for now |
| D15 | «Похожие специалисты» block | yes / no |
| D16 | Sticky mobile CTA bar | yes (recommended) / no |
| D17 | Show unlock price to guests | yes — transparency before login (recommended) · after login only (build) |
| D18 | «Пожаловаться» link | build complaints UI · skip for now |

## 6. КАК ЭТО РАБОТАЕТ — ✅ confirmed 2026-07-20 · decisions D19–D21 open

Current build is thin (H1 + the same 3 steps as home + one CTA). This page's real job: remove procedural doubt — above all «за что именно я плачу и когда». Family perspective only; the specialist process lives on §7/§8, cross-linked at the bottom.

### 6.1 Block map (top to bottom)

| Order | Block | Purpose | Assets & actions | Status |
|---|---|---|---|---|
| H1 | Page head | Set expectations | — | build |
| H2 | Steps, expanded | The journey in 4 steps with real detail | ✨ ×4 icons | build (expand) · variant per D1 |
| H3 | Что мы проверяем | Make «проверенные» concrete | ✨ ×4 doc icons · 🔗 → §14 | new |
| H4 | Индекс доверия | Explain the signature number | ✨ seal graphic | new · D21 |
| H5 | Что происходит после оплаты | Kill payment anxiety | ✨ ×3–4 icons | new · D19 |
| H6 | Мини-FAQ | Catch remaining doubts | 🧩 accordion · 🔗 → §16 | new · D20 |
| H7 | Final CTA band | Convert | 🔘 + 🔗 | new |
| — | Footer | see §2 | — | — |

### 6.2 H1 — Page head

| Element | Content (RU) |
|---|---|
| H1 | Как это работает |
| Subtitle | От выбора категории до первого рабочего дня — весь путь прозрачен. |

### 6.3 H2 — Steps, expanded (self-serve version; concierge variant = §3.5 / D1)

| Step | ✨ Icon | Title | Expanded description (RU) |
|---|---|---|---|
| 01 | ▦ grid | Выберите категорию | Няня, сиделка, репетитор или водитель — каждая категория ведёт в каталог с нужным фильтром. |
| 02 | 🔍 magnifier | Изучите анкеты | Фильтры по району, цене и опыту. Индекс доверия, отзывы и видео-визитки помогают сравнить и выбрать. |
| 03 | 🔓 unlock | Откройте контакты | Разовая оплата открывает телефон, Telegram и WhatsApp специалиста — навсегда, в вашем кабинете. |
| 04 | 🤝 handshake | Начните сотрудничество | Договаривайтесь напрямую: график, условия и оплату работы вы обсуждаете со специалистом без посредников. |

### 6.4 H3 — Что мы проверяем

| Element | Content (RU) | Notes |
|---|---|---|
| H2 | Что мы проверяем | |
| ✨ Item 1 | Паспорт — личность каждого специалиста подтверждена | build (doc types exist) |
| ✨ Item 2 | Медицинские справки — терапевт, психиатр, анализы; обязательны для нянь и сиделок | build |
| ✨ Item 3 | Дипломы и сертификаты — образование и квалификация | build |
| ✨ Item 4 | Рекомендации — предыдущие семьи и работодатели | build (optional doc type) |
| Closing line | Анкета публикуется в каталоге только после проверки модератором. | build |
| 🔗 Link | Подробнее о проверке специалистов → | → §14 page (new) |

### 6.5 H4 — Индекс доверия (D21)

| Element | Content (RU) |
|---|---|
| H2 | Индекс доверия |
| ✨ Graphic | seal showing a sample score (84) |
| Text | Каждый специалист получает индекс от 0 до 100. На него влияют: проверка документов, обращения семей, срок работы на платформе, отзывы и оценки. Индекс пересчитывается автоматически. |

D21: publish plain-language components only (recommended) vs the exact formula/weights (transparent but invites gaming).

### 6.6 H5 — Что происходит после оплаты (D19)

| Element | Content (RU) |
|---|---|
| H2 | Что происходит после оплаты |
| ✨ Point 1 | Оплата разовая — {29 000 сум} за одного специалиста *(показывать цену = D19)* |
| ✨ Point 2 | Контакты остаются доступны навсегда в вашем кабинете |
| ✨ Point 3 | Вы общаетесь напрямую — телефон, Telegram, WhatsApp |
| Honest line | nyanya.uz — платформа для поиска и проверки. Условия работы и оплату труда вы согласуете со специалистом самостоятельно. |

### 6.7 H6 — Мини-FAQ (🧩 accordion, D20)

Suggested questions: Сколько стоит открытие контактов? · Оплата разовая или подписка? · Как проверяются специалисты? · Что делать, если специалист не подошёл? · Кто отвечает за качество работы? · Можно ли оставить отзыв? — 🔗 «Все вопросы и ответы →» (§16).

### 6.8 H7 — Final CTA band

| Element | Content (RU) | Action |
|---|---|---|
| H2 | Готовы найти специалиста? | — |
| 🔘 Button | Перейти в каталог | → /catalog |
| 🔗 Cross-link | Вы специалист? Разместите анкету → | → /become-specialist |

### 6.9 Decisions on this page

| # | Decision | Options |
|---|---|---|
| D19 | Publish the unlock fee on info pages | yes — full transparency (recommended) · price only at payment step |
| D20 | FAQ placement | mini-FAQ here + full page §16 (recommended) · full FAQ only here, drop §16 · FAQ page only |
| D21 | Trust Index detail level | plain-language components (recommended) · exact formula with weights |

## 7. СПЕЦИАЛИСТАМ (landing) — ✅ confirmed 2026-07-20 · decisions D22–D24 open

Key reframe: the current build reuses family-facing hero copy and features on this page. Everything below is rewritten in the **specialist's voice** — the audience is a working nanny/caregiver/tutor/driver deciding whether the paperwork is worth it. Tone: professional dignity (invitation to a guild, not a gig-app signup). Mobile-first — this audience is smartphone-heavy.

### 7.1 Block map (top to bottom)

| Order | Block | Purpose | Assets & actions | Status |
|---|---|---|---|---|
| S1 | Hero | The offer in one line + primary action | 🖼️ portrait photo · 🔘 CTA | build (rewrite copy) |
| S2 | Что вы получаете | Benefits, supply-side | ✨ ×4 icons | new (replaces family features) |
| S3 | Как разместить анкету | 4 steps to being published | ✨ ×4 icons | new |
| S4 | Какие документы нужны | Remove paperwork fear | ✨ ×4 doc icons · 🔗 → §14 | new |
| S5 | Пример анкеты | Show the aspiration | 🖼️ profile-card preview | new — recommended |
| S6 | Сколько можно зарабатывать | Motivation with market ranges | — | new · D23 |
| S7 | Условия размещения | Honest terms (fee or free) | — | new · D22 |
| S8 | FAQ для специалистов | Remaining doubts | 🧩 accordion | new |
| S9 | Final CTA | Convert | 🔘 + 🔗 | build (expand) |
| — | Footer | see §2 | — | — |

### 7.2 S1 — Hero

| Element | Content (RU) | Notes |
|---|---|---|
| Eyebrow | ДЛЯ НЯНЬ · СИДЕЛОК · РЕПЕТИТОРОВ · ВОДИТЕЛЕЙ | category set pending |
| H1 | Работайте с семьями, которые вам доверяют | supply-side reframe (build: «Стать специалистом» as H1 — can stay as eyebrow/CTA) |
| Subtitle | Разместите анкету на nyanya.uz — премиальной платформе проверенных специалистов Ташкента. Семьи платят за доступ к вашим контактам и связываются с вами напрямую. | |
| 🔘 Primary button | Разместить анкету | → регистрация специалиста / §8 |
| 🔗 Secondary link | Как проходит проверка | → S4 / §14 |
| 🖼️ Hero image | dignified professional portrait (specialist at work) | asset needed |

### 7.3 S2 — Что вы получаете

| Element | Content (RU) |
|---|---|
| H2 | Что вы получаете |
| ✨ Benefit 1 | Достойная витрина — премиальная анкета с фото, видео-визиткой и отзывами. Ваш профессиональный профиль, а не объявление. |
| ✨ Benefit 2 | Статус «Проверен» — проверка документов выделяет вас среди объявлений и оправдывает достойную цену. |
| ✨ Benefit 3 | Прямые обращения — семьи платят платформе за ваши контакты и звонят напрямую. Мы не берём процент с вашей работы. |
| ✨ Benefit 4 | Индекс доверия — растёт с опытом, обращениями и отзывами и поднимает анкету выше в каталоге. |

«Мы не берём процент с вашей работы» — the strongest supply-side argument of the unlock model; recommend keeping it prominent.

### 7.4 S3 — Как разместить анкету

| Step | ✨ Icon | Title | Description (RU) |
|---|---|---|---|
| 01 | 👤 | Зарегистрируйтесь | Аккаунт специалиста и подтверждение телефона — 2 минуты. |
| 02 | ✏️ | Заполните анкету | Опыт, образование, цена, фото и видео-визитка. |
| 03 | 🛡️ | Пройдите проверку | Загрузите документы — модератор проверит анкету ⛳ обычно за 1–2 рабочих дня. |
| 04 | 🔔 | Получайте обращения | Анкета в каталоге; когда семья открывает контакты — приходит уведомление. |

### 7.5 S4 — Какие документы нужны

| Element | Content (RU) | Notes |
|---|---|---|
| H2 | Какие документы нужны | |
| ✨ Item 1 | Паспорт — для всех специалистов | build |
| ✨ Item 2 | Медицинские справки — для нянь и сиделок | build |
| ✨ Item 3 | Дипломы и сертификаты — подтверждают квалификацию | build |
| ✨ Item 4 | Рекомендации — по желанию, повышают доверие | build |
| 🔗 Link | Подробнее о проверке → | → §14 |

### 7.6 S5 — Пример анкеты (recommended)

H2 «Так выглядит ваша анкета» + 🖼️ preview of a finished profile card (photo, ✨ seal 84, ✨ badge «Премиум-проверка», rating, price). One line: «Анкета с проверкой получает индекс доверия и место в каталоге.»

### 7.7 S6 — Сколько можно зарабатывать (D23)

H2 «Сколько зарабатывают специалисты» + range rows: Няни — 22 000–45 000 сум/час · Репетиторы — до 70 000 сум/час · Сиделки — 350 000–400 000 сум/день · Водители — 25 000–35 000 сум/час. Line: «Цену вы устанавливаете сами.» *(ranges from current catalog data — publish or not = D23)*

### 7.8 S7 — Условия размещения (D22)

⛳ Fallback = вариант (a): «Размещение анкеты — бесплатно. Платформа зарабатывает только на открытии контактов.» *(соответствует коду — сбор не реализован; альтернативы: (b) разовая оплата 149 000 сум · (c) «сейчас бесплатно» — финальное решение D22 в backlog)*

### 7.9 S8 — FAQ для специалистов (🧩 accordion)

Сколько стоит размещение? · Как долго идёт проверка? · Кто видит мои контакты? (только семьи, оплатившие доступ) · Можно ли скрыть анкету на время? · Как повысить индекс доверия? · Что делать при отклонении анкеты? — 🔗 «Все вопросы →» (§16)

### 7.10 S9 — Final CTA

H2 «Готовы начать?» + 🔘 «Разместить анкету» + 🔗 «Остались вопросы? Напишите нам» → §15 Контакты.

### 7.11 Decisions on this page

| # | Decision | Options |
|---|---|---|
| D22 | Listing fee policy | free — monetize unlocks only · charge 149 000 сум (as coded copy hints) · free at launch, fee later. Page copy S7 depends on it |
| D23 | Publish earnings ranges | yes — strong motivator · no — avoids committing to numbers |
| D24 | Moderation SLA promise | commit «1–2 дня» · vague «обычно быстро» — whichever ops can honestly keep |

## 8. АНКЕТА СПЕЦИАЛИСТА (onboarding + статус) — ✅ auto 2026-07-20 · decisions D25–D27 open

Authenticated page `/specialist`. Two jobs: (1) collect a complete, verifiable application with minimal drop-off on a phone; (2) after submission — show the specialist exactly where their profile stands. In the build this is one long form + status banner; whether it becomes a multi-step wizard = D25.

### 8.1 Block map (top to bottom)

| Order | Block | Purpose | Assets & actions | Status |
|---|---|---|---|---|
| A1 | Page head + status banner | Instant answer: where is my анкета | ✨ status icon · 🔗 | build |
| A2 | Form: Основное | Identity & placement | 🧩 fields | build |
| A3 | Form: Опыт и образование | Professional facts | 🧩 fields | build |
| A4 | Form: Условия работы | Price + attributes | 🧩 fields | build |
| A5 | Form: О себе | The pitch text | 🧩 textarea | build |
| A6 | Form: Медиа | Photo + video | 🖼️ upload · 🎥 upload | photo build · video D13 |
| A7 | Документы для верификации | Upload + per-doc status | 🧩 upload cards ×4 · ✨ status icons | build (upload simulated) |
| A8 | Submit area | Send to moderation + expectations | 🔘 | build |
| — | Footer | see §2 | — | — |

### 8.2 A1 — Status banner (state machine)

| State | ✨ | Content (RU) | Extras |
|---|---|---|---|
| Черновик | ○ | Анкета не отправлена. Заполните обязательные поля и отправьте на проверку. | — |
| На проверке | ⏳ | Анкета на проверке у администратора. ⛳ Обычно это занимает 1–2 рабочих дня. | — |
| Опубликована | ✅ | Анкета опубликована в каталоге. | 🔗 «Открыть в каталоге» → public profile |
| Отклонена | ⚠️ | Анкета отклонена. Причина: {текст модератора}. Исправьте и отправьте снова. | reason must be specific, kind |
| Скрыта | 🚫 | Анкета скрыта и не отображается в каталоге. | 🔗 contact support |

### 8.3 A2 — Основное

| Field | 🧩 Type | Content / options (RU) | Notes |
|---|---|---|---|
| ФИО | text | Имя и фамилия | build (+ latin variant field exists) |
| Категория | select | Няня · Сиделка · Репетитор · Водитель | category set pending |
| Дата рождения | date | — | build; shown publicly as age only |
| Город | select | Ташкент | hidden while single-city |
| Район | select | 6 districts | build |

### 8.4 A3 — Опыт и образование

| Field | 🧩 Type | Content (RU) | Notes |
|---|---|---|---|
| Опыт | number | лет | build |
| Образование | text | училище / вуз / курсы | build (trilingual in DB) |
| Языки | checkboxes | Русский · Узбекский · Английский | build |
| Уровень английского | select | Нет · Базовый · Свободный | build |

### 8.5 A4 — Условия работы

| Field | 🧩 Type | Content (RU) | Notes |
|---|---|---|---|
| Стоимость | number + select | сум · за час / за день / за месяц | build (месяц in schema, unused) |
| Свой автомобиль | toggle | — | build |
| С проживанием | toggle | — | build · nanny/caregiver |
| Ночные смены | toggle | — | build · nanny |
| Опыт с новорождёнными | toggle | — | build · nanny — per-category field groups tie to D8 |

### 8.6 A5 — О себе

🧩 Textarea «Описание» + helper microcopy (new, recommended): «Расскажите о подходе к работе, опыте и семьях, с которыми работали. 3–5 предложений достаточно.»

### 8.7 A6 — Медиа

| Element | Content (RU) | Notes |
|---|---|---|
| 🖼️ Фото профиля | upload + guidelines: «Дневной свет, нейтральный фон, без фильтров» | build (doc type profile_photo); guidelines = new copy |
| 🎥 Видео-визитка | upload, 30–60 сек + one-line script hint | D13; field in schema, upload not built |

### 8.8 A7 — Документы для верификации (🧩 upload card per doc)

| Doc | Required for | Statuses |
|---|---|---|
| Паспорт | все | ○ не загружено · ⏳ на проверке · ✅ подтверждено · ⚠️ отклонено + причина |
| Медицинские справки | няни, сиделки | same |
| Дипломы / сертификаты | по желанию (репетиторы — рекомендуется) | same |
| Рекомендации | по желанию | same |

Upload is currently **simulated** in the build (demo note shown). Rejection copy must be specific: «Фото паспорта размыто — переснимите при дневном свете», never a generic error.

### 8.9 A8 — Submit area

| Element | Content (RU) | Notes |
|---|---|---|
| 🔘 Button | Сохранить и отправить на проверку | build |
| Expectation line | После отправки анкета попадёт к модератору. {SLA — D24} | build (expand) |
| Fee line | ⛳ скрыта (размещение бесплатно, D22 fallback); демо-копию build удалить | build has demo copy — backlog |
| Re-moderation note | «Изменения в анкете отправляются на повторную проверку» | build behavior — policy = D27 |

### 8.10 Decisions on this page

| # | Decision | Options |
|---|---|---|
| D25 | Form format | one long form (build) · multi-step wizard 4–5 шагов (recommended mobile-first: less drop-off, resumable) |
| D26 | Draft autosave | yes (recommended — specialists fill on phones, interruptions frequent) · manual save only |
| D27 | Re-moderation on edits | every save returns to «На проверке» (build — safe, slow) · only substantive fields (price/photo/описание) trigger re-review |

## 9. ВХОД / РЕГИСТРАЦИЯ / ПОДТВЕРЖДЕНИЕ ТЕЛЕФОНА — ✅ confirmed 2026-07-20 · decisions D29–D30 open

Public gateway for both audiences. The account-type fork here routes everything downstream: родитель → back to what they were doing; специалист → §8 анкета. One card per screen, brand carried by type and the seal mark — no decoration.

### 9.1 Block map

| Order | Screen | Purpose | Assets & actions | Status |
|---|---|---|---|---|
| R1 | Вход | Return users in seconds | 🧩 ×2 · 🔘 | build |
| R2 | Регистрация | Create account + role fork | 🧩 ×5 · 🔘 | build |
| R3 | Подтверждение телефона | Verify the phone (OTP) | 🧩 code · 🔘 | build (mock SMS) |
| R4 | Cross-cutting behaviors | Redirects, errors, locale | — | rules below |

### 9.2 R1 — Вход

| Element | Content (RU) | Notes |
|---|---|---|
| 🔷 Logo mark + H1 | Вход | build |
| 🧩 Email · 🧩 Пароль | — | build · auth method itself = D30 |
| 🔘 Button | Войти | build |
| 🔗 Link | Нет аккаунта? Зарегистрируйтесь | build |
| 🔗 Link | Забыли пароль? | **new — required before launch** · D29 |
| Error | Неверный email или пароль. | build |
| Error (banned) | Аккаунт заблокирован. Свяжитесь с поддержкой → | 🔗 §15; ties to admin block action (13) |

### 9.3 R2 — Регистрация

| Element | Content (RU) | Notes |
|---|---|---|
| H1 | Регистрация | build |
| 🧩 Имя · Email · Телефон (+998 маска) · Пароль | — | build |
| 🧩 Account type (2 cards) | Я родитель — ищу специалиста · Я специалист — размещаю анкету | build; routes post-OTP |
| Consent line | Регистрируясь, вы принимаете 🔗 Пользовательское соглашение и 🔗 Политику конфиденциальности | new — required (→ §19) |
| 🔘 Button | Создать аккаунт → R3 | build |
| 🔗 Link | Уже есть аккаунт? Войти | build |

### 9.4 R3 — Подтверждение телефона

| Element | Content (RU) | Notes |
|---|---|---|
| H1 | Подтверждение телефона | build |
| Text | Мы отправили код на +998 __ ___ __ __ | build |
| 🧩 Code input | 6 цифр | build |
| 🔘 Button | Подтвердить | build |
| 🔗 Link | Отправить код ещё раз (доступно через 0:60) | build + timer = new detail |
| 🔗 Link | Изменить номер | new |
| ⚠️ Demo hint | «В демо-режиме используйте код 123456» | build — **remove in production**; SMS: mock → Eskiz |

### 9.5 R4 — Behaviors (coherence rules)

Redirect-back: after login/registration the user returns to the page that initiated auth — critical for the §5 P3 funnel (guest pressed «Войдите, чтобы открыть контакты» → after OTP lands back on that profile). Specialist post-registration → §8. Locale preserved through the whole flow. Banned users blocked at login with the R1 error.

### 9.6 Decisions on this page

| # | Decision | Options |
|---|---|---|
| D29 | Password recovery | email link · SMS code — required before launch |
| D30 | Auth identifier | (a) email+пароль + подтверждение телефона (build) · (b) phone-first: телефон + OTP как основной вход (местная норма, меньше трения) · (c) добавить вход через Telegram |

---

## 10. ОПЛАТА ОТКРЫТИЯ КОНТАКТОВ — ✅ auto

Modal / bottom sheet over the profile (context never disappears). Single price source: 29 000 сум (`UNLOCK_FEE_UZS`) — same number as §5 P3, §6 H5; visibility governed by D17/D19. Build fires a mock charge inline; this structure adds the states real providers need.

### 10.1 Flow states

| State | Elements | Content (RU) |
|---|---|---|
| U1 Confirmation | 🖼️ мини-карточка (фото, имя, ✨ доверие) · list ✨📞 Телефон ✨ Telegram ✨ WhatsApp · price · 🧩 способ оплаты (Payme · Click · Uzum · карта — mock сейчас) · 🔘 «Оплатить 29 000 сум» · 🔗 Отмена | «Оплата разовая — контакты останутся доступны в вашем кабинете.» *(identical wording to §5 P3)* + microline «Нажимая "Оплатить", вы принимаете 🔗 условия» |
| U2 Processing | ✨ spinner | «Обработка оплаты…» (при реальном провайдере — редирект и возврат) |
| U3 Success | ✅ + auto-close | «Контакты открыты» → панель P3 переключается в состояние unlocked; специалисту уходит уведомление (§12 SP8); запись в §11 K5 |
| U4 Failure | ⚠️ + 🔘 «Повторить» · 🔗 выбрать другой способ | «Оплата не прошла. Попробуйте ещё раз.» *(same copy as §5 P3)* |
| U5 Already unlocked | — | кнопка скрыта, контакты показаны (build idempotency) |

---

## 11. КАБИНЕТ РОДИТЕЛЯ — ✅ auto

Route `/account` + subpages. Coherence obligation: §5 P3 and §10 promise «контакты останутся доступны в вашем кабинете» — therefore block K4 is **required**, even though the build lacks it today.

### 11.1 Block map

| Order | Block | Elements & content (RU) | Status |
|---|---|---|---|
| K1 | Head | Имя · роль «Родитель» · ✨ «Телефон подтверждён / не подтверждён» | build |
| K2 | Nav cards | 🔗 Каталог · 🔗 Избранное · 🔗 Открытые контакты · 🔗 Уведомления · 🔘 Выйти *(+ 🔗 Мои отзывы — only if D14 ships)* | build + new |
| K3 | Избранное | grid of §4.5 cards · ♡ снять · empty: «В избранном пока пусто» + 🔘 «Перейти в каталог» | build |
| K4 | Открытые контакты | rows: 🖼️ мини-карточка → 🔗 профиль · ✨📞 Telegram · WhatsApp кнопки живые · дата открытия · empty: «Вы ещё не открывали контакты» + 🔘 каталог | **new — required (P3 promise)** |
| K5 | История платежей | rows: дата · специалист · сумма · статус (данные есть в БД, UI нет) | new — recommended |
| K6 | Уведомления | list: title · body · date · read-state · empty: «Уведомлений пока нет» | build (parent-relevant events пока минимальны) |
| K7 | Настройки (minimal) | смена пароля (ties D29) · язык | new — optional |

---

## 12. КАБИНЕТ СПЕЦИАЛИСТА — ✅ auto · D28 open

Same route as §8 (`/specialist`): §8 is the form/onboarding; §12 is the dashboard layer a specialist sees once published. Status banner = exactly the machine of §8.2 (single source, don't duplicate copy).

### 12.1 Block map

| Order | Block | Elements & content (RU) | Status |
|---|---|---|---|
| SP1 | Status banner | see §8.2 — same five states, same copy | build |
| SP2 | Показатели | ✨ Индекс доверия: 84 (🔗 «как считается» → §6 H4) · Открытий контактов: N · Отзывы: N · ★ 4.8 *(просмотры анкеты — не трекаются, optional new)* | build data + new layout |
| SP3 | Полнота анкеты | progress ring + подсказки: «Добавьте видео-визитку» (D13) · «Загрузите рекомендации» | new — recommended |
| SP4 | Анкета | 🔘 «Редактировать анкету» → §8 form · warning: «Изменения отправляются на повторную проверку» *(same wording as §8.9, policy D27)* | build |
| SP5 | Документы | per-doc status summary — mirrors §8.8 statuses exactly | build (upload simulated) |
| SP6 | Отзывы обо мне | list: ✨ stars · text · автор · empty: «Пока нет отзывов» *(ответ на отзыв — вне scope)* | build data |
| SP7 | Видимость анкеты | 🧩 toggle «Скрыть анкету временно» — сейчас скрыть может только админ | **new · D28**: self-hide toggle — build feature / keep admin-only |
| SP8 | Уведомления | «Ваши контакты открыли» · «Статус проверки обновлён» · «Анкета опубликована» — types from build | build |

---

## 13. АДМИН-ПАНЕЛЬ — ✅ auto

Internal, role-gated. Every action here must produce the user-facing states already defined: rejection reasons feed §8.2, blocking feeds §9 R1's banned error, verification changes feed §12 SP8 notifications and the Trust Score.

### 13.1 Block map

| Order | Block | Elements & content (RU) | Status |
|---|---|---|---|
| AD1 | Статистика | Родители · Специалисты · Открытий контактов · Оплаты · Доход (сум) · Конверсия (%) | build |
| AD2 | Модерация специалистов | table: Имя · Категория · Статус · Верификация · Доверие · actions: 🔘 Проверен · 🔘 Премиум · 🔘 Скрыть · 🔘 Опубликовать · **🔘 Отклонить + 🧩 причина** (reason field required — §8.2 shows it to the specialist) | build + new reject-reason |
| AD3 | Проверка документов | queue: per-doc 🔘 Подтвердить / 🔘 Отклонить + 🧩 причина — mirrors §8.8 | new — required when real uploads ship |
| AD4 | Пользователи | table: Имя · Роль · Email · 🔘 Заблокировать / Разблокировать | build |
| AD5 | Жалобы | queue: категория · текст · статус (открыта → решена) | conditional on D18 |
| AD6 | Обращения с сайта | inbox: имя · контакт · сообщение · статус — receives §15 CT3 form submissions | conditional on D33 (alternative: form → email only) |

## 14. ПРОВЕРКА СПЕЦИАЛИСТОВ — ✅ fallback-complete 2026-07-20

New public page. Job: make «проверенные» fully concrete — for families (why to trust) and specialists (what awaits). Linked from §6 H3, §7 S4, footer 2.4.

### 14.1 Block map

| Order | Block | Elements & content (RU) | Status |
|---|---|---|---|
| V1 | Head | H1 «Как мы проверяем специалистов» + subtitle «Каждая анкета проходит проверку модератором до публикации.» | new |
| V2 | Этапы проверки (timeline ✨×3) | 01 Анкета и документы — специалист загружает паспорт, справки и сертификаты → 02 Проверка модератором — документы и данные анкеты сверяются вручную → 03 Публикация со статусом — анкета получает бейдж и индекс доверия. + line: «Изменения в анкете проходят повторную проверку» (D27) | new |
| V3 | Документы по категориям (table) | Няня: паспорт · медсправки (терапевт, психиатр, анализы) · Сиделка: паспорт · медсправки · Репетитор: паспорт · дипломы (рекомендуется) · Водитель: паспорт · **водительское удостоверение — D32** · Все: рекомендации по желанию | build types + gap |
| V4 | Уровни проверки | ✨ «Проверен» — личность и обязательные документы подтверждены · ✨ «Премиум-проверка» — {критерии не определены — D31: например, полный пакет документов + рекомендации + видео-визитка *(видео-критерий возможен только если D13 = build)*} | **D31 — criteria undefined in build** |
| V5 | Индекс доверия | reference §6 H4 (same components, same ✨ seal — do not duplicate copy) | — |
| V6 | Честные границы | «Мы проверяем документы и личность. Решение о найме принимаете вы: познакомьтесь лично, проведите собеседование, обсудите условия.» *(tone-consistent with disclaimer 2.8)* + 🔗 «Чек-лист собеседования» → §17 blog *(link only if D34 = launch; otherwise omit)* | new |
| V7 | Dual CTA | 🔘 «Перейти в каталог» · 🔗 «Разместить анкету» | new |

### 14.2 Decisions: **D31** — define Премиум-проверка criteria (badge exists, criteria nowhere) · **D32** — водительское удостоверение as a doc type (required if водители stay in the category set)

---

## 15. КОНТАКТЫ — ✅ fallback-complete 2026-07-20

New thin page. Single source for contact data = footer 2.6 (same placeholders, change once).

| Order | Block | Elements & content (RU) | Status |
|---|---|---|---|
| CT1 | Head | H1 «Контакты» + ⛳ «Отвечаем ежедневно с 9:00 до 21:00» | new |
| CT2 | Каналы | ⛳ ✨📞 +998 90 123 45 67 (tel:) · ⛳ ✨ Telegram @nyanya_uz (t.me) · ⛳ ✨ ✉️ info@nyanya.uz (mailto:) · ⛳ ✨🔗 Instagram @nyanya.uz | fallback — create real accounts (= 2.2/2.6) |
| CT3 | Форма обращения (optional) | 🧩 Имя · 🧩 Телефон или email · 🧩 Сообщение · 🔘 «Отправить» + success «Мы свяжемся с вами» | new · D33 |
| CT4 | Реквизиты | ⛳ ООО «NYANYA», г. Ташкент — required for §19 | fallback — real legal entity data |

### 15.1 Decisions: **D33** — contact form vs direct channels only. If form: submissions need a destination — §13 AD6 admin inbox or plain email forwarding; without one, the form silently loses messages

---

## 16. ВОПРОСЫ И ОТВЕТЫ — ✅ fallback-complete 2026-07-20

Master FAQ. The mini-FAQs on §6.7 and §7.9 are subsets of this list — single source, edit here. Many answers depend on open decisions (marked).

| Order | Block | Elements & content (RU) | Status |
|---|---|---|---|
| F1 | Head | H1 «Вопросы и ответы» + 🧩 group tabs: Для семей · Оплата · Проверка · Для специалистов | new |
| F2 | Для семей (🧩 accordion) | В каких городах работает сервис? (пока только Ташкент — honesty line relocated from hero, §3.2 note) · Как выбрать специалиста? · Что означает индекс доверия? · Можно ли добавить в избранное? · Что делать, если специалист не подошёл? · Как оставить отзыв? *(D14)* · Как пожаловаться? *(D18)* | new |
| F3 | Оплата | Сколько стоит открытие контактов? *(29 000 сум — D19)* · Оплата разовая или подписка? (разовая, навсегда) · Какие способы оплаты? (Payme · Click · Uzum — по мере подключения) · Возможен ли возврат? *(D36)* | new |
| F4 | Проверка | Какие документы проверяются? → §14 · Чем «Премиум-проверка» отличается от «Проверен»? *(D31)* · Гарантирует ли платформа качество? (нет — честный ответ, tone 2.8) | new |
| F5 | Для специалистов | Сколько стоит размещение? *(D22)* · Как долго идёт проверка? *(D24)* · Кто видит мои контакты? (только оплатившие семьи) · Почему анкета пропала из каталога после правок? *(re-moderation, D27)* · Как скрыть анкету? *(D28)* · Как повысить индекс доверия? | new |
| F6 | Fallback | «Не нашли ответ?» + 🔘 «Написать нам» → §15 | new |

---

## 17. БЛОГ — ✅ fallback-complete 2026-07-20

New. Primary role: SEO engine for «няня Ташкент»-type queries + trust content. If deferred (D34), footer link 2.5 must be removed until launch.

| Order | Block | Elements & content (RU) | Status |
|---|---|---|---|
| BL1 | Index head | H1 «Блог» + subtitle «О доверии, заботе и правильном выборе» + 🧩 category filter: Все · Семьям · Специалистам · Новости | new |
| BL2 | Featured article | 🖼️ large cover + category tag + title + date | new |
| BL3 | Article grid | cards: 🖼️ cover · tag · title · дата · время чтения · 🔗 | new |
| BL4 | Article page | 🖼️ cover · H1 · meta (дата, время чтения) · body · ✨ share · «Читайте также» 🖼️🔗 ×3 · CTA band → каталог | new |
| BL5 | Launch topics (seed list) | «Как выбрать няню: чек-лист» · «10 вопросов для собеседования с няней» · «Как проверить сиделку для пожилого человека» · «Сколько стоит няня в Ташкенте» · «Водитель для ребёнка: на что смотреть» · «Как подготовить документы специалисту» | content plan |

### 17.1 Decisions: **D34** — launch with 5–8 seed articles vs defer blog (and pull the footer link)

---

## 18. О СЕРВИСЕ — ✅ fallback-complete 2026-07-20

Currently a stub. Job: the founder story + principles — why this isn't OLX.

| Order | Block | Elements & content (RU) | Status |
|---|---|---|---|
| O1 | Hero | H1 «О сервисе» + mission: «Мы создали nyanya.uz, потому что поиск человека, которому вы доверите дом и близких, не должен происходить среди объявлений. Мы проверяем специалистов до публикации — вы выбираете спокойно.» | new |
| O2 | Принципы (✨×3) | Проверка до публикации · Прозрачный индекс доверия · Прямой контакт — без комиссий с работы специалиста *(same claims as §3 B6 / §7 S2 — single wording)* | new |
| O3 | Цифры (optional) | категории · районы Ташкента · специалистов в каталоге — **only real numbers** (D3 discipline) | new |
| O4 | Команда (optional) | 🖼️ founder/team photo + short text — or stay a brand without faces | new · D35 |
| O5 | Dual CTA | 🔘 «Перейти в каталог» · 🔗 «Стать специалистом» | new |

### 18.1 Decisions: **D35** — show founder/team or anonymous brand

---

## 19. ПРАВОВЫЕ СТРАНИЦЫ — ✅ fallback-complete 2026-07-20

Structure only — final text requires a lawyer (Республика Узбекистан). Both pages: single-column article layout, dates of last update, 🔗 cross-links.

**L1 Пользовательское соглашение — section outline:** Термины и стороны · Предмет: информационная платформа, не агентство и не работодатель · Возрастные требования (18+ для обеих ролей — специалисты указывают дату рождения, §8.3) · Аккаунты и роли (родитель / специалист) · Публикация анкет и модерация · Оплата открытия контактов: разовая, {29 000 сум}, **политика возвратов — D36** · Обязанности и запреты пользователей · Ограничение ответственности *(canonical form of disclaimer 2.8)* · Персональные данные → Политика · Изменения условий · Юрисдикция.

**L2 Политика конфиденциальности — section outline:** Какие данные собираем (имя, телефон, email; для специалистов — паспортные данные, **медицинские справки = особая категория**) · Цели обработки · Хранение и локализация *(данные граждан УзР — на территории Узбекистана, закон ЗРУ-547 — pre-launch gate from project description)* · Передача третьим лицам (платёжные провайдеры, SMS-шлюз) · Права пользователя (доступ, удаление) · Cookies · Контакты оператора *(реквизиты = §15 CT4)*.

### 19.1 Decisions: **D36** — refund policy for contact unlocks (нет возврата после открытия · возврат при недоступном специалисте · case-by-case) — schema already has a `refunded` payment status

---

## 20. СИСТЕМНЫЕ СТРАНИЦЫ И СОСТОЯНИЯ — ✅ fallback-complete 2026-07-20

Registry — most empty states are already defined inside their pages; this section indexes them so nothing is designed twice.

| Item | Content (RU) | Source |
|---|---|---|
| 404 | ✨ graphic + «Такой страницы нет — но специалисты на месте.» + 🔘 «В каталог» · 🔗 «На главную» | new |
| Ошибка сервера / offline | «Что-то пошло не так. Обновите страницу.» + 🔘 «Обновить» | new |
| Каталог пуст | see §4.6 | defined |
| Избранное пусто | see §11 K3 | defined |
| Открытые контакты пусты | see §11 K4 | defined |
| Уведомлений нет | see §11 K6 | defined |
| Отзывов нет | see §5 P6 | defined |
| Профиль скрыт/удалён | «Анкета больше не доступна.» + 🔘 «Похожие специалисты» *(ties D15)* | new |
| Skeleton loaders | card-shaped, geometry of §4.5 | new |
| Toasts registry | «Контакты открыты» ✅ · «Оплата не прошла» ⚠️ · «Сохранено» · «Анкета отправлена на проверку» *(§8 A8 submit)* · «Ссылка скопирована» *(share, §5 P2)* · «Добавлено в избранное» ♡ | new |
| Cookie-баннер | по заключению юриста при §19 L2 (cookies section); если не требуется — не добавлять | lawyer-dependent |

---

## РЕЕСТР РЕШЕНИЙ — все открытые D-вопросы в одном месте

| D | Тема | Где | ⛳ Fallback (действует сейчас) |
|---|---|---|---|
| D1 | Concierge-заявка vs self-serve каталог | §0, §3.5 | self-serve (как в коде); «Подобрать специалиста» → каталог |
| D2 | Trust bar: чем заменить логотипы отелей | §3.3 | ⛳ логотипы-заглушки референса; **заменить до запуска** |
| D3 | Стата «10 000 семей» | §3.6 | ⛳ строка остаётся как заглушка; **заменить до запуска** |
| D4 | Тёмный CTA-блок: аудитория и кнопки | §3.6 | две кнопки: «Подобрать специалиста» + «Стать специалистом» |
| D5 | Блоки B6/B7: оставить/убрать | §3.7–3.8 | оставить оба |
| D6 | Scope новых страниц из футера | §0 | строить все четыре (§14–§17) |
| D7 | Навигация: категории vs функциональные | §1 | категории (референс) |
| D8 | Фильтры: универсальные vs по категориям | §4.9 | универсальный набор (build) |
| D9 | Пагинация каталога | §4.9 | 🔘 «Показать ещё» |
| D10 | Динамический H1 (SEO) | §4.9 | да |
| D11 | ♡ на карточках | §4.9 | да |
| D12 | CTA-блок под каталогом | §4.9 | вариант B «Вы специалист?» |
| D13 | Видео-визитка | §5.9 | скрыть блок до готовности функции |
| D14 | Отправка отзывов | §5.9 | только отображение; FAQ-ответ: «функция скоро» |
| D15 | «Похожие специалисты» | §5.9 | да |
| D16 | Sticky CTA-бар (моб. профиль) | §5.9 | да |
| D17 | Цена открытия — гостям | §5.9 | показывать |
| D18 | «Пожаловаться» + жалобы UI | §5.9 | ссылку скрыть; жалобы через §15 Контакты |
| D19 | Цена на инфо-страницах | §6.9 | публиковать (29 000 сум) |
| D20 | Размещение FAQ | §6.9 | мини-FAQ + полная страница §16 |
| D21 | Глубина индекса доверия | §6.9 | простые компоненты, без формулы |
| D22 | Плата за размещение анкеты | §7.11 | ⛳ бесплатно (сбор не реализован в коде) |
| D23 | Диапазоны заработка | §7.11 | публиковать (из данных каталога) |
| D24 | Срок модерации | §7.11 | ⛳ «обычно 1–2 рабочих дня» |
| D25 | Форма анкеты: страница vs визард | §8.10 | одна форма (build); визард — после запуска |
| D26 | Автосохранение черновика | §8.10 | нет (build); добавить после запуска |
| D27 | Повторная модерация при правках | §8.10 | любая правка → повторная проверка (build) |
| D28 | Самоскрытие анкеты | §12 SP7 | только админ (build); специалист → поддержка |
| D29 | Восстановление пароля | §9.6 | email-ссылка — **построить до запуска** |
| D30 | Метод входа | §9.6 | email+пароль (build); phone-first — после запуска |
| D31 | Критерии «Премиум-проверки» | §14.2 | ⛳ полный пакет документов + рекомендации |
| D32 | Водительское удостоверение (тип документа) | §14.2 | добавить тип — **до запуска, если водители в наборе** |
| D33 | Форма обращений на «Контактах» | §15.1 | форма → пересылка на email (без AD6) |
| D34 | Блог: запуск | §17.1 | запуск с 6 статьями (BL5) |
| D35 | Команда на «О сервисе» | §18.1 | без блока команды (бренд без лиц) |
| D36 | Политика возвратов | §19.1 | ⛳ возврат, если анкета скрыта/контакты недоступны до обращения; иначе — нет |

---

*Документ полон: все 20 секций закрыты, каждое открытое решение получило ⛳ fallback-значение (реестр выше) — структура готова кормить дизайн-этап. Всё временное и недостающее вынесено задачами в `nyanya-backlog.md`.*
