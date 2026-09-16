"use client";

import {
  useEffect,
  useOptimistic,
  useRef,
  useState,
  useTransition,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import { Funnel, X, MagnifyingGlass } from "@phosphor-icons/react";
import {
  categories,
  type UiSpecialist,
  yearsLabel,
} from "@/lib/specialists-shared";
import {
  CATALOG_LANGS,
  CATALOG_MAX_CARDS,
  CATALOG_MAX_PAGE,
  CATALOG_SORTS,
  CATALOG_TOGGLES,
  catalogHasFilters,
  catalogQueryString,
  parseCatalogQuery,
  type CatalogLang,
  type CatalogQuery,
  type CatalogSort,
  type CatalogToggle,
} from "@/lib/catalog-params";
import type { CatalogDistrict } from "@/lib/queries/districts";
import { SpecialistCard } from "@/components/specialist-card";
import { ButtonLink } from "@/components/ui/button-link";

/**
 * Каталог рисует то, что отобрала база, и больше ничего не решает: фильтры,
 * сортировка и страница живут в адресе, а элементы управления только меняют
 * адрес. Раньше сюда приезжали все опубликованные анкеты целиком, и браузер
 * фильтровал их сам — при 10 000 анкет это 8,9 МБ разметки на первый экран.
 *
 * Не заводите здесь фильтр «в браузере» снова: он молча разойдётся с тем, что
 * считает «Найдено», и вернёт страницу к выгрузке всего каталога.
 */

/**
 * Пауза после последнего нажатия клавиши в «Цена до» и «Опыт от». Без неё
 * каждая цифра была бы отдельным запросом к серверу.
 */
const TEXT_FIELD_DELAY_MS = 400;

/** Пустой набор фильтров — то же, что даёт чистый адрес `/catalog`. */
const EMPTY_QUERY = parseCatalogQuery({});

const selectClass =
  "min-h-12 w-full appearance-none border border-line bg-paper px-4 text-base text-ink focus:border-ink";
const inputClass =
  "min-h-12 w-full border border-line bg-paper px-4 text-base text-ink placeholder:text-ink-faint focus:border-ink";

/**
 * Текстовое поле фильтра: черновик в браузере, адрес — через 400 мс после
 * остановки ввода.
 *
 * `sent` хранит значение, которое поле само отправило в адрес. Без него
 * вернувшийся адрес затирал бы то, что человек успел дописать за время
 * перехода. Значение, пришедшее снаружи (чип, «Сбросить фильтры», кнопка
 * «назад»), черновик, наоборот, обязан показать.
 */
function useDebouncedNumberField(
  urlValue: number | undefined,
  submit: (value: number | undefined) => void
) {
  const asText = (value: number | undefined) =>
    value === undefined ? "" : String(value);
  const [draft, setDraft] = useState(() => asText(urlValue));
  const [seen, setSeen] = useState(urlValue);
  const [sent, setSent] = useState(urlValue);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** Значение, которое отправится, когда истечёт пауза. */
  const pending = useRef<{ value: number | undefined } | null>(null);

  const cancel = () => {
    pending.current = null;
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
  };

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    []
  );

  // Значение в адресе изменилось. Своё собственное, только что отправленное,
  // черновик не трогает — иначе адрес затирал бы дописанные за время перехода
  // цифры. Чужое (чип, «Сбросить фильтры», кнопка «назад») поле обязано
  // показать.
  if (urlValue !== seen) {
    setSeen(urlValue);
    if (urlValue !== sent) {
      setSent(urlValue);
      setDraft(asText(urlValue));
    }
  }

  const change = (value: string) => {
    setDraft(value);
    cancel();
    const text = value.trim();
    const next = /^\d{1,9}$/.test(text) ? Number.parseInt(text, 10) : undefined;
    pending.current = { value: next };
    timer.current = setTimeout(() => {
      timer.current = null;
      pending.current = null;
      setSent(next);
      submit(next);
    }, TEXT_FIELD_DELAY_MS);
  };

  /**
   * Отдать отложенное значение прямо сейчас, если оно есть.
   *
   * Его забирает любой соседний фильтр: человек набирает цену и, не дождавшись
   * паузы, щёлкает район — набранное должно уехать вместе с районом, а не
   * прилететь через 400 мс отдельным переходом, собранным из уже устаревшего
   * состояния (тогда район молча снимался бы).
   */
  const flush = () => {
    const value = pending.current;
    if (!value) return null;
    cancel();
    setSent(value.value);
    return value;
  };

  /** Поле очистили не из него самого: отменяем отложенную отправку. */
  const clear = () => {
    cancel();
    setSent(undefined);
    setDraft("");
  };

  return { draft, change, clear, flush };
}

export function CatalogView({
  query,
  items,
  total,
  catalogEmpty,
  districts,
  favoriteSlugs = [],
  authed = false,
}: {
  query: CatalogQuery;
  items: UiSpecialist[];
  total: number;
  catalogEmpty: boolean;
  districts: CatalogDistrict[];
  favoriteSlugs?: string[];
  authed?: boolean;
}) {
  const favorites = new Set(favoriteSlugs);
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();
  const [mobileOpen, setMobileOpen] = useState(false);

  /**
   * Что показывают элементы управления, пока сервер готовит новую выборку.
   *
   * Без этого щелчок отменял сам себя: `query` приходит с сервера, и до конца
   * перехода флажок рисовался прежним значением — человек ставил галочку,
   * она снималась и возвращалась только с ответом. На быстром localhost это
   * один кадр, а на телефоне с ответом в 900 мс (проверено с задержкой
   * запроса) — почти секунда, за которую кажется, что нажатие не сработало.
   */
  const [shownQuery, setShownQuery] = useOptimistic(query);

  const go = (next: CatalogQuery) => {
    const qs = catalogQueryString(next);
    startTransition(() => {
      // элементы управления показывают новое состояние сразу, не дожидаясь
      // ответа сервера — иначе второй щелчок собрал бы адрес без первого
      setShownQuery(next);
      // replace, а не push: каждый щелчок по чекбоксу не должен становиться
      // записью в истории. scroll: false — страница не прыгает вверх.
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    });
  };

  const price = useDebouncedNumberField(shownQuery.price, (value) =>
    apply({ price: value })
  );
  const experience = useDebouncedNumberField(shownQuery.exp, (value) =>
    apply({ exp: value })
  );

  /**
   * Следующий набор фильтров: показанный сейчас плюс то, что человек уже
   * набрал в текстовых полях, но пауза ещё не истекла, плюс сама правка.
   * Любой фильтр возвращает к первой странице; «Показать ещё» и сортировка
   * передают `page` явно.
   */
  const nextQuery = (patch: Partial<CatalogQuery>): CatalogQuery => {
    const next: CatalogQuery = { ...shownQuery, page: 1 };
    const pendingPrice = price.flush();
    if (pendingPrice) next.price = pendingPrice.value;
    const pendingExp = experience.flush();
    if (pendingExp) next.exp = pendingExp.value;
    return { ...next, ...patch };
  };

  function apply(patch: Partial<CatalogQuery>) {
    go(nextQuery(patch));
  }

  const applyToggle = (key: CatalogToggle, value: boolean) => {
    const next = nextQuery({});
    next[key] = value;
    go(next);
  };

  const reset = () => {
    price.clear();
    experience.clear();
    go(EMPTY_QUERY);
  };

  const selectedDistrict = districts.find(
    (d) => d.token === shownQuery.district
  );

  // D10 — динамический H1: только категория и ничего больше
  const onlyCategory =
    Boolean(shownQuery.category) &&
    !catalogHasFilters({ ...shownQuery, category: undefined });
  const h1 =
    shownQuery.category && onlyCategory
      ? categories[shownQuery.category].catalogH1
      : "Каталог специалистов";

  // чипы активных фильтров (C2)
  const chips: { label: string; clear: () => void }[] = [];
  if (shownQuery.category)
    chips.push({
      label: categories[shownQuery.category].plural,
      clear: () => apply({ category: undefined }),
    });
  if (selectedDistrict)
    chips.push({
      label: `${selectedDistrict.name} район`,
      clear: () => apply({ district: undefined }),
    });
  if (shownQuery.lang)
    chips.push({
      label: CATALOG_LANGS[shownQuery.lang],
      clear: () => apply({ lang: undefined }),
    });
  if (shownQuery.price !== undefined)
    chips.push({
      label: `до ${shownQuery.price.toLocaleString("ru-RU")} сум`,
      clear: () => {
        price.clear();
        apply({ price: undefined });
      },
    });
  if (shownQuery.exp !== undefined)
    chips.push({
      label: `опыт от ${yearsLabel(shownQuery.exp)}`,
      clear: () => {
        experience.clear();
        apply({ exp: undefined });
      },
    });
  for (const toggle of CATALOG_TOGGLES) {
    if (shownQuery[toggle.key])
      chips.push({
        label: toggle.label,
        clear: () => applyToggle(toggle.key, false),
      });
  }

  const filterPanel = (
    <div className="space-y-5">
      <div className="grid gap-2">
        <label htmlFor="f-category" className="text-sm font-semibold text-ink">
          Категория
        </label>
        <select
          id="f-category"
          value={shownQuery.category ?? "all"}
          onChange={(e) =>
            apply({
              category:
                e.target.value === "all"
                  ? undefined
                  : (e.target.value as NonNullable<CatalogQuery["category"]>),
            })
          }
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
          value={selectedDistrict?.token ?? "all"}
          onChange={(e) =>
            apply({
              district: e.target.value === "all" ? undefined : e.target.value,
            })
          }
          className={selectClass}
        >
          <option value="all">Все</option>
          {districts.map((d) => (
            <option key={d.token} value={d.token}>
              {d.name}
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
          value={shownQuery.lang ?? "any"}
          onChange={(e) =>
            apply({
              lang:
                e.target.value === "any"
                  ? undefined
                  : (e.target.value as CatalogLang),
            })
          }
          className={selectClass}
        >
          <option value="any">Любой</option>
          {Object.entries(CATALOG_LANGS).map(([key, label]) => (
            <option key={key} value={key}>
              {label}
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
          value={price.draft}
          onChange={(e) => price.change(e.target.value)}
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
          value={experience.draft}
          onChange={(e) => experience.change(e.target.value)}
          placeholder="5"
          className={inputClass}
        />
      </div>

      <fieldset className="space-y-3 border-t border-line pt-5">
        <legend className="sr-only">Дополнительные условия</legend>
        {CATALOG_TOGGLES.map((t) => (
          <label
            key={t.key}
            className="flex min-h-6 cursor-pointer items-center gap-3 text-sm text-ink-soft"
          >
            <input
              type="checkbox"
              checked={shownQuery[t.key]}
              onChange={(e) => applyToggle(t.key, e.target.checked)}
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
        <p className="mt-4 text-base text-ink-soft">Найдено: {total}</p>
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
                value={shownQuery.sort}
                onChange={(e) =>
                  // сортировка не сбрасывает накопленные страницы — как было
                  apply({
                    sort: e.target.value as CatalogSort,
                    page: shownQuery.page,
                  })
                }
                className="min-h-11 appearance-none border border-line bg-paper px-4 pr-8 text-sm text-ink focus:border-ink"
              >
                {Object.entries(CATALOG_SORTS).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {items.length > 0 ? (
            <>
              <ul
                aria-busy={isPending}
                className={`mt-8 grid gap-6 transition-opacity duration-200 sm:grid-cols-2 xl:grid-cols-3 ${
                  isPending ? "opacity-60" : ""
                }`}
              >
                {items.map((s) => (
                  <li key={s.slug}>
                    <SpecialistCard
                      specialist={s}
                      favorite={favorites.has(s.slug)}
                      authed={authed}
                    />
                  </li>
                ))}
              </ul>
              {items.length < total &&
                (shownQuery.page < CATALOG_MAX_PAGE ? (
                  <div className="mt-12 text-center">
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => apply({ page: shownQuery.page + 1 })}
                      className="label-caps min-h-12 border border-ink px-8 text-ink transition-colors duration-300 hover:bg-ink hover:text-cream disabled:opacity-50"
                    >
                      Показать ещё
                    </button>
                  </div>
                ) : (
                  /* Потолок накопительного показа: честно говорим, что список
                     обрезан, вместо кнопки, которая ничего не добавит. */
                  <p className="mt-12 text-center text-sm text-ink-soft">
                    Показаны первые {CATALOG_MAX_CARDS} анкет — уточните фильтры.
                  </p>
                ))}
            </>
          ) : (
            /* C5 — пустое состояние. Пустой каталог и пустая выборка — разные
               вещи: предлагать сброс фильтров, когда анкет вообще нет, значит
               посылать человека по кругу. */
            <div className="mt-8 flex flex-col items-center border border-line bg-paper px-8 py-20 text-center">
              <MagnifyingGlass size={36} weight="thin" className="text-bronze" />
              <p className="mt-6 max-w-sm text-base text-ink-soft">
                {catalogEmpty
                  ? "Каталог пока пуст: анкеты появятся здесь сразу после модерации."
                  : "По вашему запросу специалистов не найдено. Попробуйте изменить фильтры."}
              </p>
              {catalogEmpty ? (
                <ButtonLink href="/become-specialist" className="mt-8">
                  Разместить анкету
                </ButtonLink>
              ) : (
                <button
                  type="button"
                  onClick={reset}
                  className="label-caps mt-8 inline-flex min-h-12 items-center bg-ink px-8 text-cream transition-colors duration-300 hover:bg-charcoal"
                >
                  Сбросить фильтры
                </button>
              )}
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
