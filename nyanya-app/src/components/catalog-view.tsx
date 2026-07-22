"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Funnel, X, MagnifyingGlass } from "@phosphor-icons/react";
import {
  specialists,
  categories,
  districts,
  type CategoryKey,
} from "@/content/specialists";
import { SpecialistCard } from "@/components/specialist-card";
import { ButtonLink } from "@/components/ui/button-link";

const PAGE_SIZE = 9; // D9: «Показать ещё»

const languages = ["Любой", "Русский", "Узбекский", "Английский"] as const;

const sorts = {
  trust: "По доверию",
  priceAsc: "Сначала дешевле",
  priceDesc: "Сначала дороже",
  experience: "По опыту",
} as const;

type SortKey = keyof typeof sorts;

type Toggles = {
  english: boolean;
  car: boolean;
  liveIn: boolean;
  night: boolean;
  newborn: boolean;
};

const toggleDefs: { key: keyof Toggles; label: string }[] = [
  { key: "english", label: "Знание английского" },
  { key: "car", label: "Наличие автомобиля" },
  { key: "liveIn", label: "С проживанием" },
  { key: "night", label: "Ночная няня" },
  { key: "newborn", label: "Для новорождённых" },
];

const selectClass =
  "min-h-12 w-full appearance-none border border-line bg-paper px-4 text-base text-ink focus:border-ink";
const inputClass =
  "min-h-12 w-full border border-line bg-paper px-4 text-base text-ink placeholder:text-ink-faint focus:border-ink";

export function CatalogView() {
  const params = useSearchParams();
  const paramCategory = params.get("category");
  const initialCategory: CategoryKey | "all" =
    paramCategory && paramCategory in categories
      ? (paramCategory as CategoryKey)
      : "all";

  const [category, setCategory] = useState<CategoryKey | "all">(initialCategory);
  const [district, setDistrict] = useState<string>("all");
  const [language, setLanguage] = useState<string>("Любой");
  const [maxPrice, setMaxPrice] = useState<string>("");
  const [minExp, setMinExp] = useState<string>("");
  const [toggles, setToggles] = useState<Toggles>({
    english: false,
    car: false,
    liveIn: false,
    night: false,
    newborn: false,
  });
  const [sort, setSort] = useState<SortKey>("trust");
  const [shown, setShown] = useState(PAGE_SIZE);
  const [mobileOpen, setMobileOpen] = useState(false);

  // категория из URL (клик по навигации, когда каталог уже открыт)
  useEffect(() => {
    setCategory(initialCategory);
    setShown(PAGE_SIZE);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paramCategory]);

  const filtered = useMemo(() => {
    let list = specialists.filter((s) => {
      if (category !== "all" && s.category !== category) return false;
      if (district !== "all" && s.district !== district) return false;
      if (language !== "Любой" && !s.languages.includes(language)) return false;
      const price = Number(maxPrice);
      if (maxPrice && !Number.isNaN(price) && s.priceFrom > price) return false;
      const exp = Number(minExp);
      if (minExp && !Number.isNaN(exp) && s.experienceYears < exp) return false;
      if (toggles.english && s.english === "Нет") return false;
      if (toggles.car && !s.attributes.includes("Свой автомобиль")) return false;
      if (toggles.liveIn && !s.attributes.includes("С проживанием")) return false;
      if (
        toggles.night &&
        !s.attributes.some((a) => a === "Ночные смены" || a === "Ночная няня")
      )
        return false;
      if (
        toggles.newborn &&
        !s.attributes.some(
          (a) => a === "Опыт с новорождёнными" || a === "Для новорождённых"
        )
      )
        return false;
      return true;
    });

    switch (sort) {
      case "priceAsc":
        list = [...list].sort((a, b) => a.priceFrom - b.priceFrom);
        break;
      case "priceDesc":
        list = [...list].sort((a, b) => b.priceFrom - a.priceFrom);
        break;
      case "experience":
        list = [...list].sort((a, b) => b.experienceYears - a.experienceYears);
        break;
      default:
        list = [...list].sort((a, b) => b.trustScore - a.trustScore);
    }
    return list;
  }, [category, district, language, maxPrice, minExp, toggles, sort]);

  const hasActiveFilters =
    category !== "all" ||
    district !== "all" ||
    language !== "Любой" ||
    maxPrice !== "" ||
    minExp !== "" ||
    Object.values(toggles).some(Boolean);

  const reset = () => {
    setCategory("all");
    setDistrict("all");
    setLanguage("Любой");
    setMaxPrice("");
    setMinExp("");
    setToggles({ english: false, car: false, liveIn: false, night: false, newborn: false });
    setShown(PAGE_SIZE);
  };

  // D10 — динамический H1
  const onlyCategoryActive =
    category !== "all" &&
    district === "all" &&
    language === "Любой" &&
    !maxPrice &&
    !minExp &&
    !Object.values(toggles).some(Boolean);
  const h1 =
    category !== "all" && onlyCategoryActive
      ? categories[category].catalogH1
      : "Каталог специалистов";

  // чипы активных фильтров (C2, new)
  const chips: { label: string; clear: () => void }[] = [];
  if (category !== "all")
    chips.push({
      label: categories[category].plural,
      clear: () => setCategory("all"),
    });
  if (district !== "all")
    chips.push({ label: `${district} район`, clear: () => setDistrict("all") });
  if (language !== "Любой")
    chips.push({ label: language, clear: () => setLanguage("Любой") });
  if (maxPrice)
    chips.push({
      label: `до ${Number(maxPrice).toLocaleString("ru-RU")} сум`,
      clear: () => setMaxPrice(""),
    });
  if (minExp)
    chips.push({ label: `опыт от ${minExp} лет`, clear: () => setMinExp("") });
  toggleDefs.forEach((t) => {
    if (toggles[t.key])
      chips.push({
        label: t.label,
        clear: () => setToggles((v) => ({ ...v, [t.key]: false })),
      });
  });

  const visible = filtered.slice(0, shown);

  const filterPanel = (
    <div className="space-y-5">
      <div className="grid gap-2">
        <label htmlFor="f-category" className="text-sm font-semibold text-ink">
          Категория
        </label>
        <select
          id="f-category"
          value={category}
          onChange={(e) => {
            setCategory(e.target.value as CategoryKey | "all");
            setShown(PAGE_SIZE);
          }}
          className={selectClass}
        >
          <option value="all">Все</option>
          {Object.entries(categories).map(([key, c]) => (
            <option key={key} value={key}>
              {c.plural}
            </option>
          ))}
        </select>
      </div>

      <div className="grid gap-2">
        <label htmlFor="f-district" className="text-sm font-semibold text-ink">
          Район
        </label>
        <select
          id="f-district"
          value={district}
          onChange={(e) => {
            setDistrict(e.target.value);
            setShown(PAGE_SIZE);
          }}
          className={selectClass}
        >
          <option value="all">Все</option>
          {districts.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
      </div>

      <div className="grid gap-2">
        <label htmlFor="f-language" className="text-sm font-semibold text-ink">
          Язык
        </label>
        <select
          id="f-language"
          value={language}
          onChange={(e) => {
            setLanguage(e.target.value);
            setShown(PAGE_SIZE);
          }}
          className={selectClass}
        >
          {languages.map((l) => (
            <option key={l} value={l}>
              {l}
            </option>
          ))}
        </select>
      </div>

      <div className="grid gap-2">
        <label htmlFor="f-price" className="text-sm font-semibold text-ink">
          Цена до, сум
        </label>
        <input
          id="f-price"
          type="number"
          inputMode="numeric"
          min={0}
          step={5000}
          value={maxPrice}
          onChange={(e) => {
            setMaxPrice(e.target.value);
            setShown(PAGE_SIZE);
          }}
          placeholder="50 000"
          className={inputClass}
        />
        <p className="text-xs text-ink-faint">Няни и водители — сум/час, сиделки — сум/день.</p>
      </div>

      <div className="grid gap-2">
        <label htmlFor="f-exp" className="text-sm font-semibold text-ink">
          Опыт от, лет
        </label>
        <input
          id="f-exp"
          type="number"
          inputMode="numeric"
          min={0}
          value={minExp}
          onChange={(e) => {
            setMinExp(e.target.value);
            setShown(PAGE_SIZE);
          }}
          placeholder="5"
          className={inputClass}
        />
      </div>

      <fieldset className="space-y-3 border-t border-line pt-5">
        <legend className="sr-only">Дополнительные условия</legend>
        {toggleDefs.map((t) => (
          <label
            key={t.key}
            className="flex min-h-6 cursor-pointer items-center gap-3 text-sm text-ink-soft"
          >
            <input
              type="checkbox"
              checked={toggles[t.key]}
              onChange={(e) => {
                setToggles((v) => ({ ...v, [t.key]: e.target.checked }));
                setShown(PAGE_SIZE);
              }}
              className="size-4 accent-[#96733a]"
            />
            {t.label}
          </label>
        ))}
      </fieldset>

      <button
        type="button"
        onClick={reset}
        className="label-caps min-h-11 border-b border-ink/30 pb-1 text-ink transition-colors duration-300 hover:border-bronze hover:text-bronze-text"
      >
        Сбросить фильтры
      </button>
    </div>
  );

  return (
    <div className="mx-auto max-w-[1400px] px-5 sm:px-8">
      {/* C1 — заголовок */}
      <div className="pt-14 pb-10 lg:pt-20">
        <h1 className="font-display text-4xl leading-[1.08] font-medium tracking-[-0.01em] text-ink sm:text-5xl lg:text-6xl">
          {h1}
        </h1>
        <p className="mt-4 text-base text-ink-soft">Найдено: {filtered.length}</p>
      </div>

      <div className="grid gap-10 pb-20 lg:grid-cols-[280px_1fr] lg:gap-14 lg:pb-28">
        {/* C2 — фильтры */}
        <aside>
          <button
            type="button"
            onClick={() => setMobileOpen((v) => !v)}
            aria-expanded={mobileOpen}
            className="label-caps mb-5 flex min-h-12 w-full items-center justify-center gap-3 border border-ink text-ink lg:hidden"
          >
            <Funnel size={16} aria-hidden="true" />
            {mobileOpen ? "Скрыть фильтры" : "Фильтры"}
          </button>
          <div className={`${mobileOpen ? "block" : "hidden"} lg:block`}>
            <h2 className="mb-5 hidden text-base font-semibold text-ink lg:block">
              Фильтры
            </h2>
            {filterPanel}
          </div>
        </aside>

        {/* C3 + C4 */}
        <div>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <ul className="flex flex-wrap gap-2">
              {chips.map((chip) => (
                <li key={chip.label}>
                  <button
                    type="button"
                    onClick={chip.clear}
                    className="flex min-h-9 items-center gap-2 border border-line bg-cream-deep px-3.5 text-sm text-ink transition-colors duration-300 hover:border-ink-faint"
                  >
                    {chip.label}
                    <X size={12} aria-hidden="true" className="text-ink-faint" />
                  </button>
                </li>
              ))}
            </ul>
            <div className="ml-auto grid gap-1">
              <label htmlFor="f-sort" className="sr-only">
                Сортировка
              </label>
              <select
                id="f-sort"
                value={sort}
                onChange={(e) => setSort(e.target.value as SortKey)}
                className="min-h-11 appearance-none border border-line bg-paper px-4 pr-8 text-sm text-ink focus:border-ink"
              >
                {Object.entries(sorts).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {visible.length > 0 ? (
            <>
              <ul className="mt-8 grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
                {visible.map((s) => (
                  <li key={s.slug}>
                    <SpecialistCard specialist={s} />
                  </li>
                ))}
              </ul>
              {filtered.length > shown && (
                <div className="mt-12 text-center">
                  <button
                    type="button"
                    onClick={() => setShown((v) => v + PAGE_SIZE)}
                    className="label-caps min-h-12 border border-ink px-8 text-ink transition-colors duration-300 hover:bg-ink hover:text-cream"
                  >
                    Показать ещё
                  </button>
                </div>
              )}
            </>
          ) : (
            /* C5 — пустое состояние */
            <div className="mt-8 flex flex-col items-center border border-line bg-paper px-8 py-20 text-center">
              <MagnifyingGlass size={36} weight="thin" className="text-bronze" />
              <p className="mt-6 max-w-sm text-base text-ink-soft">
                По вашему запросу специалистов не найдено. Попробуйте изменить
                фильтры.
              </p>
              <button
                type="button"
                onClick={reset}
                className="label-caps mt-8 inline-flex min-h-12 items-center bg-ink px-8 text-cream transition-colors duration-300 hover:bg-charcoal"
              >
                Сбросить фильтры
              </button>
            </div>
          )}
        </div>
      </div>

      {/* C7 — CTA-блок, вариант B (D12) */}
      <div className="mb-20 flex flex-col items-center justify-between gap-6 border-t border-line pt-12 sm:flex-row lg:mb-28">
        <h2 className="font-display text-2xl font-medium text-ink sm:text-3xl">
          Вы специалист?
        </h2>
        <ButtonLink href="/become-specialist">Разместить анкету</ButtonLink>
      </div>
    </div>
  );
}
