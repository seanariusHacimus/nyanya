"use client";

import { useState } from "react";
import {
  Users,
  IdentificationBadge,
  LockKeyOpen,
  Receipt,
  TrendUp,
  Percent,
  Info,
} from "@phosphor-icons/react";
import { specialists, categories } from "@/content/specialists";

type ModStatus = "published" | "hidden" | "rejected";

type UserRow = {
  name: string;
  role: "Родитель" | "Специалист";
  email: string;
  blocked: boolean;
};

/** §13 — админ-панель (демо: данные локальные, ролевой доступ появится с бэкендом). */
export function AdminView() {
  const [mod, setMod] = useState<Record<string, ModStatus>>(
    Object.fromEntries(specialists.map((s) => [s.slug, "published" as ModStatus]))
  );
  const [premium, setPremium] = useState<Record<string, boolean>>(
    Object.fromEntries(
      specialists.map((s) => [s.slug, s.verification === "premium"])
    )
  );
  const [rejecting, setRejecting] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [users, setUsers] = useState<UserRow[]>([
    { name: "Алия Каримова", role: "Родитель", email: "aliya.k@example.com", blocked: false },
    { name: "Sherzod Karimov", role: "Родитель", email: "sherzod.k@example.com", blocked: false },
    { name: "Севара Тошпулатова", role: "Специалист", email: "sevara.t@example.com", blocked: false },
    { name: "Наталья Волкова", role: "Родитель", email: "n.volkova@example.com", blocked: false },
    { name: "Бахтиёр Насыров", role: "Специалист", email: "b.nasyrov@example.com", blocked: false },
  ]);

  const publishedCount = Object.values(mod).filter(
    (s) => s === "published"
  ).length;

  // AD1 — сводка (⛳ демо-цифры, кроме числа анкет)
  const stats = [
    { icon: Users, label: "Родители", value: "38" },
    { icon: IdentificationBadge, label: "Специалисты", value: String(specialists.length) },
    { icon: LockKeyOpen, label: "Открытий контактов", value: "26" },
    { icon: Receipt, label: "Оплаты", value: "26" },
    { icon: TrendUp, label: "Доход, сум", value: "754 000" },
    { icon: Percent, label: "Конверсия", value: "12%" },
  ];

  const statusLabel: Record<ModStatus, { text: string; cls: string }> = {
    published: { text: "Опубликована", cls: "text-bronze-text" },
    hidden: { text: "Скрыта", cls: "text-ink-faint" },
    rejected: { text: "Отклонена", cls: "text-[#a5462f]" },
  };

  return (
    <div className="mx-auto max-w-[1400px] px-5 pt-14 pb-24 sm:px-8 lg:pt-20">
      <p className="label-caps text-bronze-text">Админ-панель</p>
      <h1 className="mt-3 font-display text-4xl leading-[1.08] font-medium text-ink sm:text-5xl">
        Управление платформой
      </h1>
      <p className="mt-4 flex items-start gap-2 text-sm text-ink-soft">
        <Info size={16} className="mt-0.5 shrink-0 text-bronze" />
        Демо-режим: данные локальные, ролевой доступ и реальные действия
        появятся с бэкендом.
      </p>

      {/* AD1 — статистика */}
      <dl className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-6">
        {stats.map((s) => (
          <div key={s.label} className="border border-line bg-paper p-5">
            <dt className="label-caps flex items-center gap-2 text-ink-faint">
              <s.icon size={14} className="text-bronze" />
              {s.label}
            </dt>
            <dd className="mt-3 font-display text-2xl font-medium text-ink">
              {s.value}
            </dd>
          </div>
        ))}
      </dl>

      {/* AD2 — модерация специалистов */}
      <section className="mt-14">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h2 className="font-display text-3xl font-medium text-ink">
            Модерация специалистов
          </h2>
          <p className="text-sm text-ink-soft">
            Опубликовано: {publishedCount} из {specialists.length}
          </p>
        </div>
        <div className="mt-8 overflow-x-auto">
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead>
              <tr className="border-b border-line">
                {["Имя", "Категория", "Статус", "Верификация", "Доверие", "Действия"].map(
                  (h) => (
                    <th
                      key={h}
                      className="label-caps py-3 pr-6 font-medium text-ink-faint"
                    >
                      {h}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody>
              {specialists.map((s) => {
                const st = mod[s.slug];
                return (
                  <tr key={s.slug} className="border-b border-line/60 align-top">
                    <td className="py-4 pr-6 font-medium text-ink">{s.name}</td>
                    <td className="py-4 pr-6 text-ink-soft">
                      {categories[s.category].label}
                    </td>
                    <td className="py-4 pr-6">
                      <span className={`label-caps ${statusLabel[st].cls}`}>
                        {statusLabel[st].text}
                      </span>
                    </td>
                    <td className="py-4 pr-6 text-ink-soft">
                      {premium[s.slug] ? "Премиум-проверка" : "Проверен"}
                    </td>
                    <td className="py-4 pr-6 font-display text-lg text-bronze-text">
                      {s.trustScore}
                    </td>
                    <td className="py-4">
                      {rejecting === s.slug ? (
                        <form
                          onSubmit={(e) => {
                            e.preventDefault();
                            if (!reason.trim()) return;
                            setMod((m) => ({ ...m, [s.slug]: "rejected" }));
                            setRejecting(null);
                            setReason("");
                          }}
                          className="flex flex-wrap items-center gap-2"
                        >
                          <input
                            autoFocus
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            placeholder="Причина отклонения (обязательно)"
                            className="min-h-9 w-64 border border-line bg-paper px-3 text-xs text-ink placeholder:text-ink-faint focus:border-ink"
                          />
                          <button
                            type="submit"
                            className="label-caps min-h-9 bg-ink px-3 text-cream"
                          >
                            Отклонить
                          </button>
                          <button
                            type="button"
                            onClick={() => setRejecting(null)}
                            className="label-caps min-h-9 px-2 text-ink-soft"
                          >
                            Отмена
                          </button>
                        </form>
                      ) : (
                        <span className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              setPremium((p) => ({ ...p, [s.slug]: !p[s.slug] }))
                            }
                            className="label-caps min-h-9 border border-line px-3 text-ink-soft transition-colors duration-300 hover:border-ink-faint hover:text-ink"
                          >
                            {premium[s.slug] ? "Снять премиум" : "Премиум"}
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setMod((m) => ({
                                ...m,
                                [s.slug]:
                                  st === "published" ? "hidden" : "published",
                              }))
                            }
                            className="label-caps min-h-9 border border-line px-3 text-ink-soft transition-colors duration-300 hover:border-ink-faint hover:text-ink"
                          >
                            {st === "published" ? "Скрыть" : "Опубликовать"}
                          </button>
                          {st !== "rejected" && (
                            <button
                              type="button"
                              onClick={() => setRejecting(s.slug)}
                              className="label-caps min-h-9 border border-line px-3 text-[#a5462f] transition-colors duration-300 hover:border-[#a5462f]"
                            >
                              Отклонить
                            </button>
                          )}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="mt-4 text-xs text-ink-soft">
          Причина отклонения показывается специалисту в кабинете — формулируйте
          конкретно и доброжелательно.
        </p>
      </section>

      {/* AD4 — пользователи */}
      <section className="mt-14">
        <h2 className="font-display text-3xl font-medium text-ink">
          Пользователи
        </h2>
        <div className="mt-8 overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-line">
                {["Имя", "Роль", "Email", "Действия"].map((h) => (
                  <th
                    key={h}
                    className="label-caps py-3 pr-6 font-medium text-ink-faint"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map((u, i) => (
                <tr key={u.email} className="border-b border-line/60">
                  <td
                    className={`py-4 pr-6 font-medium ${
                      u.blocked ? "text-ink-faint line-through" : "text-ink"
                    }`}
                  >
                    {u.name}
                  </td>
                  <td className="py-4 pr-6 text-ink-soft">{u.role}</td>
                  <td className="py-4 pr-6 text-ink-soft">{u.email}</td>
                  <td className="py-4">
                    <button
                      type="button"
                      onClick={() =>
                        setUsers((list) =>
                          list.map((x, j) =>
                            j === i ? { ...x, blocked: !x.blocked } : x
                          )
                        )
                      }
                      className={`label-caps min-h-9 border px-3 transition-colors duration-300 ${
                        u.blocked
                          ? "border-line text-ink-soft hover:text-ink"
                          : "border-line text-[#a5462f] hover:border-[#a5462f]"
                      }`}
                    >
                      {u.blocked ? "Разблокировать" : "Заблокировать"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
