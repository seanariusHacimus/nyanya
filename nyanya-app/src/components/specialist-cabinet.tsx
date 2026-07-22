"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Circle,
  HourglassMedium,
  CheckCircle,
  Gauge,
  PhoneCall,
  Star,
  SignOut,
  UploadSimple,
  Info,
} from "@phosphor-icons/react";
import {
  getSession,
  clearSession,
  subscribeDemo,
  getProfileStatus,
  setProfileStatus,
  getProfileDraft,
  saveProfileDraft,
  type DemoSession,
  type ProfileStatus,
  type ProfileDraft,
} from "@/lib/demo";
import { districts } from "@/content/specialists";
import { ButtonLink } from "@/components/ui/button-link";

const inputClass =
  "min-h-12 w-full border border-line bg-paper px-4 text-base text-ink placeholder:text-ink-faint focus:border-ink";
const selectClass =
  "min-h-12 w-full appearance-none border border-line bg-paper px-4 text-base text-ink focus:border-ink";

// §8.2 — статус-машина анкеты
const banners: Record<
  ProfileStatus,
  { icon: typeof Circle; title: string; text: string; tone: string }
> = {
  draft: {
    icon: Circle,
    title: "Черновик",
    text: "Анкета не отправлена. Заполните обязательные поля и отправьте на проверку.",
    tone: "border-line bg-paper",
  },
  review: {
    icon: HourglassMedium,
    title: "На проверке",
    text: "Анкета на проверке у администратора. Обычно это занимает 1–2 рабочих дня. В демо-режиме проверка занимает несколько секунд.",
    tone: "border-bronze/50 bg-cream-deep",
  },
  published: {
    icon: CheckCircle,
    title: "Опубликована",
    text: "Анкета опубликована в каталоге.",
    tone: "border-bronze bg-cream-deep",
  },
};

// §8.8 — документы для верификации (загрузка симулируется)
const docTypes = [
  { key: "doc-passport", title: "Паспорт", note: "для всех специалистов" },
  {
    key: "doc-medical",
    title: "Медицинские справки",
    note: "няни и сиделки",
  },
  {
    key: "doc-diploma",
    title: "Дипломы / сертификаты",
    note: "по желанию, репетиторам — рекомендуется",
  },
  { key: "doc-references", title: "Рекомендации", note: "по желанию" },
];

const requiredFields = [
  "name",
  "category",
  "birthdate",
  "district",
  "experience",
  "education",
  "price",
  "about",
  "photo",
  "doc-passport",
];

/** §8 (анкета + статусы) и §12 (кабинет) — один маршрут /specialist. */
export function SpecialistCabinet() {
  const [session, setSession] = useState<DemoSession | null>(null);
  const [status, setStatus] = useState<ProfileStatus>("draft");
  const [draft, setDraft] = useState<ProfileDraft>({});
  const [hydrated, setHydrated] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const moderationTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const sync = () => {
      setSession(getSession());
      setStatus(getProfileStatus());
    };
    sync();
    setDraft(getProfileDraft());
    setHydrated(true);
    return subscribeDemo(sync);
  }, []);

  useEffect(
    () => () => {
      if (moderationTimer.current) clearTimeout(moderationTimer.current);
    },
    []
  );

  const set = (key: string, value: string | boolean) => {
    setDraft((d) => {
      const next = { ...d, [key]: value };
      saveProfileDraft(next); // D26 — автосохранение черновика (демо)
      return next;
    });
  };

  const str = (key: string) => String(draft[key] ?? "");
  const bool = (key: string) => Boolean(draft[key]);

  const completeness = Math.round(
    (requiredFields.filter((f) => draft[f]).length / requiredFields.length) * 100
  );

  const submit = () => {
    setProfileStatus("review");
    setJustSaved(true);
    // ⛳ демо: модерация «проходит» автоматически
    moderationTimer.current = setTimeout(
      () => setProfileStatus("published"),
      4500
    );
  };

  if (!hydrated) return <div className="min-h-[50vh]" />;

  if (!session) {
    return (
      <div className="mx-auto max-w-[1400px] px-5 py-28 text-center sm:px-8">
        <h1 className="font-display text-4xl font-medium text-ink">
          Кабинет специалиста
        </h1>
        <p className="mx-auto mt-5 max-w-md text-lg text-ink-soft">
          Войдите или зарегистрируйтесь как специалист, чтобы заполнить анкету.
        </p>
        <div className="mt-10 flex flex-wrap items-center justify-center gap-x-8 gap-y-5">
          <ButtonLink href="/register">Разместить анкету</ButtonLink>
          <Link
            href="/login?next=/specialist"
            className="label-caps border-b border-ink/30 pb-1 text-ink transition-colors duration-300 hover:border-bronze hover:text-bronze-text"
          >
            Войти
          </Link>
        </div>
      </div>
    );
  }

  if (session.role !== "specialist") {
    return (
      <div className="mx-auto max-w-[1400px] px-5 py-28 text-center sm:px-8">
        <h1 className="font-display text-4xl font-medium text-ink">
          Раздел для специалистов
        </h1>
        <p className="mx-auto mt-5 max-w-md text-lg text-ink-soft">
          Вы вошли как родитель. Анкету размещают специалисты — няни, сиделки,
          репетиторы и водители.
        </p>
        <div className="mt-10 flex flex-wrap items-center justify-center gap-x-8 gap-y-5">
          <ButtonLink href="/account">Мой кабинет</ButtonLink>
          <Link
            href="/become-specialist"
            className="label-caps border-b border-ink/30 pb-1 text-ink transition-colors duration-300 hover:border-bronze hover:text-bronze-text"
          >
            Узнать об условиях для специалистов
          </Link>
        </div>
      </div>
    );
  }

  const banner = banners[status];

  return (
    <div className="mx-auto max-w-[900px] px-5 pt-14 pb-24 sm:px-8 lg:pt-20">
      {/* шапка кабинета */}
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className="label-caps text-bronze-text">Кабинет · Специалист</p>
          <h1 className="mt-3 font-display text-4xl leading-[1.08] font-medium text-ink sm:text-5xl">
            {session.name}
          </h1>
        </div>
        <button
          type="button"
          onClick={() => clearSession()}
          className="label-caps flex min-h-11 items-center gap-2 text-ink-soft transition-colors duration-300 hover:text-ink"
        >
          <SignOut size={16} aria-hidden="true" />
          Выйти
        </button>
      </div>

      {/* §8.2 / §12 SP1 — статус-баннер */}
      <div
        className={`mt-10 flex items-start gap-4 border p-6 ${banner.tone}`}
        aria-live="polite"
      >
        <banner.icon size={26} weight="thin" className="shrink-0 text-bronze" />
        <div>
          <p className="text-base font-semibold text-ink">{banner.title}</p>
          <p className="mt-1 text-sm leading-relaxed text-ink-soft">
            {banner.text}
          </p>
          {status === "published" && (
            <Link
              href="/catalog"
              className="label-caps mt-3 inline-block border-b border-ink/30 pb-0.5 text-ink transition-colors duration-300 hover:border-bronze hover:text-bronze-text"
            >
              Открыть в каталоге
            </Link>
          )}
        </div>
      </div>

      {/* §12 SP2 — показатели (после публикации) */}
      {status === "published" && (
        <dl className="mt-8 grid gap-4 sm:grid-cols-3">
          <div className="border border-line bg-paper p-6">
            <dt className="label-caps flex items-center gap-2 text-ink-faint">
              <Gauge size={15} className="text-bronze" /> Индекс доверия
            </dt>
            <dd className="mt-3 font-display text-4xl font-medium text-ink">
              72
            </dd>
            <Link
              href="/how-it-works"
              className="mt-2 inline-block text-xs text-ink-soft underline hover:text-bronze-text"
            >
              как считается
            </Link>
          </div>
          <div className="border border-line bg-paper p-6">
            <dt className="label-caps flex items-center gap-2 text-ink-faint">
              <PhoneCall size={15} className="text-bronze" /> Открытий контактов
            </dt>
            <dd className="mt-3 font-display text-4xl font-medium text-ink">0</dd>
          </div>
          <div className="border border-line bg-paper p-6">
            <dt className="label-caps flex items-center gap-2 text-ink-faint">
              <Star size={15} className="text-bronze" /> Отзывы
            </dt>
            <dd className="mt-3 font-display text-4xl font-medium text-ink">0</dd>
          </div>
        </dl>
      )}

      {/* §12 SP3 — полнота анкеты */}
      <div className="mt-8 border border-line bg-paper p-6">
        <div className="flex items-center justify-between gap-4">
          <p className="text-sm font-semibold text-ink">Полнота анкеты</p>
          <p className="font-display text-xl font-medium text-bronze-text">
            {completeness}%
          </p>
        </div>
        <div
          role="progressbar"
          aria-valuenow={completeness}
          aria-valuemin={0}
          aria-valuemax={100}
          className="mt-3 h-1 w-full bg-line"
        >
          <div
            className="h-full bg-bronze transition-all duration-500"
            style={{ width: `${completeness}%` }}
          />
        </div>
        {completeness < 100 && (
          <p className="mt-3 text-xs text-ink-soft">
            Заполненная анкета получает больше обращений: добавьте фото и
            документы.
          </p>
        )}
      </div>

      {/* §8 — анкета */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        className="mt-14 space-y-14"
      >
        {/* A2 — основное */}
        <section>
          <h2 className="font-display text-2xl font-medium text-ink">
            Основное
          </h2>
          <div className="mt-6 grid gap-5 sm:grid-cols-2">
            <div className="grid gap-2 sm:col-span-2">
              <label htmlFor="sp-name" className="text-sm font-semibold text-ink">
                ФИО
              </label>
              <input
                id="sp-name"
                type="text"
                value={str("name")}
                onChange={(e) => set("name", e.target.value)}
                required
                className={inputClass}
                placeholder="Имя и фамилия"
              />
            </div>
            <div className="grid gap-2">
              <label
                htmlFor="sp-category"
                className="text-sm font-semibold text-ink"
              >
                Категория
              </label>
              <select
                id="sp-category"
                value={str("category")}
                onChange={(e) => set("category", e.target.value)}
                required
                className={selectClass}
              >
                <option value="">Выберите…</option>
                <option>Няня</option>
                <option>Сиделка</option>
                <option>Репетитор</option>
                <option>Водитель</option>
              </select>
            </div>
            <div className="grid gap-2">
              <label
                htmlFor="sp-birthdate"
                className="text-sm font-semibold text-ink"
              >
                Дата рождения
              </label>
              <input
                id="sp-birthdate"
                type="date"
                value={str("birthdate")}
                onChange={(e) => set("birthdate", e.target.value)}
                required
                className={inputClass}
              />
              <p className="text-xs text-ink-faint">
                В анкете показывается только возраст.
              </p>
            </div>
            <div className="grid gap-2">
              <label
                htmlFor="sp-district"
                className="text-sm font-semibold text-ink"
              >
                Район
              </label>
              <select
                id="sp-district"
                value={str("district")}
                onChange={(e) => set("district", e.target.value)}
                required
                className={selectClass}
              >
                <option value="">Выберите…</option>
                {districts.map((d) => (
                  <option key={d}>{d}</option>
                ))}
              </select>
            </div>
          </div>
        </section>

        {/* A3 — опыт и образование */}
        <section>
          <h2 className="font-display text-2xl font-medium text-ink">
            Опыт и образование
          </h2>
          <div className="mt-6 grid gap-5 sm:grid-cols-2">
            <div className="grid gap-2">
              <label htmlFor="sp-exp" className="text-sm font-semibold text-ink">
                Опыт, лет
              </label>
              <input
                id="sp-exp"
                type="number"
                min={0}
                value={str("experience")}
                onChange={(e) => set("experience", e.target.value)}
                required
                className={inputClass}
                placeholder="5"
              />
            </div>
            <div className="grid gap-2">
              <label htmlFor="sp-edu" className="text-sm font-semibold text-ink">
                Образование
              </label>
              <input
                id="sp-edu"
                type="text"
                value={str("education")}
                onChange={(e) => set("education", e.target.value)}
                required
                className={inputClass}
                placeholder="Училище, вуз или курсы"
              />
            </div>
            <fieldset className="grid gap-3">
              <legend className="text-sm font-semibold text-ink">Языки</legend>
              {["Русский", "Узбекский", "Английский"].map((lang) => (
                <label
                  key={lang}
                  className="flex cursor-pointer items-center gap-3 text-sm text-ink-soft"
                >
                  <input
                    type="checkbox"
                    checked={bool(`lang-${lang}`)}
                    onChange={(e) => set(`lang-${lang}`, e.target.checked)}
                    className="size-4 accent-[#96733a]"
                  />
                  {lang}
                </label>
              ))}
            </fieldset>
            <div className="grid gap-2">
              <label htmlFor="sp-eng" className="text-sm font-semibold text-ink">
                Уровень английского
              </label>
              <select
                id="sp-eng"
                value={str("english")}
                onChange={(e) => set("english", e.target.value)}
                className={selectClass}
              >
                <option>Нет</option>
                <option>Базовый</option>
                <option>Свободный</option>
              </select>
            </div>
          </div>
        </section>

        {/* A4 — условия работы */}
        <section>
          <h2 className="font-display text-2xl font-medium text-ink">
            Условия работы
          </h2>
          <div className="mt-6 grid gap-5 sm:grid-cols-2">
            <div className="grid gap-2">
              <label htmlFor="sp-price" className="text-sm font-semibold text-ink">
                Стоимость, сум
              </label>
              <input
                id="sp-price"
                type="number"
                min={0}
                step={1000}
                value={str("price")}
                onChange={(e) => set("price", e.target.value)}
                required
                className={inputClass}
                placeholder="45 000"
              />
            </div>
            <div className="grid gap-2">
              <label htmlFor="sp-unit" className="text-sm font-semibold text-ink">
                Единица
              </label>
              <select
                id="sp-unit"
                value={str("unit") || "за час"}
                onChange={(e) => set("unit", e.target.value)}
                className={selectClass}
              >
                <option>за час</option>
                <option>за день</option>
                <option>за месяц</option>
              </select>
            </div>
            <fieldset className="grid gap-3 sm:col-span-2 sm:grid-cols-2">
              <legend className="mb-1 text-sm font-semibold text-ink">
                Дополнительно
              </legend>
              {[
                "Свой автомобиль",
                "С проживанием",
                "Ночные смены",
                "Опыт с новорождёнными",
              ].map((attr) => (
                <label
                  key={attr}
                  className="flex cursor-pointer items-center gap-3 text-sm text-ink-soft"
                >
                  <input
                    type="checkbox"
                    checked={bool(`attr-${attr}`)}
                    onChange={(e) => set(`attr-${attr}`, e.target.checked)}
                    className="size-4 accent-[#96733a]"
                  />
                  {attr}
                </label>
              ))}
            </fieldset>
          </div>
        </section>

        {/* A5 — о себе */}
        <section>
          <h2 className="font-display text-2xl font-medium text-ink">О себе</h2>
          <div className="mt-6 grid gap-2">
            <label htmlFor="sp-about" className="text-sm font-semibold text-ink">
              Описание
            </label>
            <textarea
              id="sp-about"
              rows={5}
              value={str("about")}
              onChange={(e) => set("about", e.target.value)}
              required
              className="border border-line bg-paper px-4 py-3 text-base text-ink placeholder:text-ink-faint focus:border-ink"
              placeholder="Расскажите о подходе к работе и семьях, с которыми работали"
            />
            <p className="text-xs text-ink-faint">
              Расскажите о подходе к работе, опыте и семьях, с которыми работали.
              3–5 предложений достаточно.
            </p>
          </div>
        </section>

        {/* A6 — медиа (видео-визитка скрыта до готовности — D13) */}
        <section>
          <h2 className="font-display text-2xl font-medium text-ink">
            Фото профиля
          </h2>
          <label className="mt-6 flex cursor-pointer flex-col items-center gap-3 border border-dashed border-line bg-paper px-6 py-10 text-center transition-colors duration-300 hover:border-bronze/60">
            <UploadSimple size={26} weight="thin" className="text-bronze" />
            <span className="text-sm font-medium text-ink">
              {str("photo") || "Загрузить фото"}
            </span>
            <span className="text-xs text-ink-faint">
              Дневной свет, нейтральный фон, без фильтров
            </span>
            <input
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={(e) => set("photo", e.target.files?.[0]?.name ?? "")}
            />
          </label>
        </section>

        {/* A7 — документы для верификации */}
        <section>
          <h2 className="font-display text-2xl font-medium text-ink">
            Документы для верификации
          </h2>
          <p className="mt-3 flex items-start gap-2 text-xs leading-relaxed text-ink-soft">
            <Info size={15} className="mt-0.5 shrink-0 text-bronze" />
            Демо-режим: файлы не отправляются на сервер, статус имитируется.
          </p>
          <ul className="mt-6 grid gap-4 sm:grid-cols-2">
            {docTypes.map((doc) => {
              const uploaded = Boolean(draft[doc.key]);
              return (
                <li key={doc.key} className="border border-line bg-paper p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-ink">
                        {doc.title}
                      </p>
                      <p className="mt-0.5 text-xs text-ink-faint">{doc.note}</p>
                    </div>
                    <span
                      className={`label-caps shrink-0 ${
                        uploaded ? "text-bronze-text" : "text-ink-faint"
                      }`}
                    >
                      {uploaded ? "На проверке" : "Не загружено"}
                    </span>
                  </div>
                  <label className="label-caps mt-4 inline-flex min-h-10 cursor-pointer items-center gap-2 border border-line px-4 text-ink transition-colors duration-300 hover:border-ink-faint">
                    <UploadSimple size={14} className="text-bronze" />
                    {uploaded ? "Заменить" : "Загрузить"}
                    <input
                      type="file"
                      className="sr-only"
                      onChange={(e) =>
                        set(doc.key, e.target.files?.[0]?.name ?? "")
                      }
                    />
                  </label>
                </li>
              );
            })}
          </ul>
        </section>

        {/* A8 — отправка */}
        <section className="border-t border-line pt-8">
          <button
            type="submit"
            className="label-caps inline-flex min-h-12 w-full items-center justify-center bg-ink px-8 text-cream transition-colors duration-300 hover:bg-charcoal active:translate-y-px sm:w-auto"
          >
            Сохранить и отправить на проверку
          </button>
          <p className="mt-4 text-xs leading-relaxed text-ink-soft">
            После отправки анкета попадёт к модератору — обычно проверка занимает
            1–2 рабочих дня. Изменения в анкете отправляются на повторную
            проверку.
          </p>
          {justSaved && status !== "draft" && (
            <p
              role="status"
              className="mt-4 flex items-start gap-3 border border-bronze/40 bg-cream-deep px-4 py-3 text-sm text-ink"
            >
              <CheckCircle size={18} className="mt-0.5 shrink-0 text-bronze" />
              Анкета отправлена на проверку.
            </p>
          )}
        </section>
      </form>
    </div>
  );
}
