"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, SealCheck } from "@phosphor-icons/react";
import { stepsForCategory } from "@/content/verification-steps";
import type { CabinetData } from "@/lib/queries/specialist-cabinet";
import { PREMIUM_BENEFITS, categories } from "@/lib/specialists-shared";
import {
  VerificationStepCard,
  type StepState,
} from "@/components/specialist/verification-step-card";

/**
 * Страница премиума: зачем он, что даёт и какие документы нужны именно
 * для этой категории — с загрузкой прямо здесь.
 *
 * Не мастер по экранам: справки собирают неделями и грузят по одной, когда
 * получат. Список карточек с состоянием каждой честнее показывает, что уже
 * принято, что ждёт проверки и чего ещё нет.
 */
export function PremiumPanel({ data }: { data: CabinetData }) {
  const [steps, setSteps] = useState<Record<string, StepState>>(data.steps);
  const locked = data.status === "pending_review";
  const premium = data.tier === "premium_verified";

  // паспорт и справки; фотография — часть анкеты, здесь её нет
  const documentSteps = useMemo(
    () =>
      stepsForCategory(data.profile.category).filter(
        (s) => s.key !== "profile_photo"
      ),
    [data.profile.category]
  );
  const approved = documentSteps.filter(
    (s) => steps[s.key]?.status === "approved"
  ).length;
  const uploaded = documentSteps.filter(
    (s) => steps[s.key] && steps[s.key].status !== "empty"
  ).length;

  return (
    <div className="mx-auto max-w-[900px] px-5 pt-10 pb-24 sm:px-8 lg:pt-16">
      <Link
        href="/specialist"
        className="label-caps inline-flex min-h-11 items-center gap-2 text-ink-soft transition-colors duration-300 hover:text-ink"
      >
        <ArrowLeft size={14} aria-hidden="true" />
        В кабинет
      </Link>

      <p className="label-caps mt-6 text-bronze-text">
        {categories[data.profile.category].label}
      </p>
      <h1 className="mt-2 font-display text-3xl leading-[1.08] font-medium text-ink sm:text-5xl">
        {premium ? "У вас Премиум-профиль" : "Премиум-профиль"}
      </h1>
      <p className="mt-4 max-w-xl text-base leading-relaxed text-ink-soft">
        {premium
          ? "Все документы приняты. Если какой-то из них вы замените, анкета вернётся на повторную проверку — и премиум восстановится, когда модератор примет новый."
          : "Предоставлять документы или нет — решаете вы. Но анкета с проверенными документами получает то, чего нет у стандартной."}
      </p>

      {/* выгоды — те же слова, что на плашке и в письмах */}
      <ul className="mt-8 grid gap-px border border-line bg-line sm:grid-cols-3">
        {PREMIUM_BENEFITS.map((b) => (
          <li key={b.title} className="bg-paper p-5">
            <SealCheck size={22} weight="thin" className="text-bronze" aria-hidden="true" />
            <p className="mt-3 text-base font-semibold text-ink">{b.title}</p>
            <p className="mt-1 text-sm leading-relaxed text-ink-soft">{b.text}</p>
          </li>
        ))}
      </ul>

      {/* документы этой категории */}
      <section className="mt-12">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 className="font-display text-2xl font-medium text-ink">
            Документы
          </h2>
          <p className="text-sm text-ink-soft">
            Принято {approved} из {documentSteps.length}
            {uploaded > approved ? ` · на проверке ${uploaded - approved}` : ""}
          </p>
        </div>
        <p className="mt-3 max-w-xl text-sm leading-relaxed text-ink-soft">
          Грузите по мере получения — не обязательно всё сразу. Документы
          видят только вы и модератор; в каталоге показывается лишь фотография.
          {locked && " Пока анкета на проверке, документы менять нельзя."}
        </p>

        <ul className="mt-6 grid gap-4">
          {documentSteps.map((step, i) => (
            <VerificationStepCard
              key={step.key}
              step={step}
              index={i}
              state={steps[step.key]}
              locked={locked}
              onChange={(key, next) =>
                setSteps((prev) => ({ ...prev, [key]: next }))
              }
            />
          ))}
        </ul>
      </section>
    </div>
  );
}
