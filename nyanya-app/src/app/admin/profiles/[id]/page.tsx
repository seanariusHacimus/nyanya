import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { documents, districts, specialistProfiles } from "@/db/schema";
import { user } from "@/db/auth-schema";
import { stepsForCategory } from "@/content/verification-steps";
import { categories } from "@/lib/specialists-shared";
import {
  VERIFICATION_LABEL,
  VERIFICATION_MEANING,
  summarizeDocuments,
  type DocumentStatus,
} from "@/lib/verification";
import { AdminDocumentRow } from "@/components/admin/admin-document-row";
import { AdminProfileActions } from "@/components/admin/admin-profile-actions";

/**
 * Карточка анкеты у администратора.
 *
 * Всё про одного человека на одном экране: кто он, что видит семья, какие
 * документы есть и чего не хватает, и решения по анкете. Раньше это было
 * размазано по двум таблицам на разных концах длинной страницы — документ
 * принимали в одной, анкету публиковали в другой, и связь между ними
 * приходилось держать в голове.
 */

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Анкета",
  robots: { index: false, follow: false },
};

export default async function AdminProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login?next=/admin/profiles");
  if (session.user.role !== "admin") notFound();

  const { id } = await params;

  const [row] = await db
    .select({
      id: specialistProfiles.id,
      fullName: specialistProfiles.fullName,
      email: user.email,
      phone: user.phone,
      category: specialistProfiles.category,
      status: specialistProfiles.status,
      verificationLevel: specialistProfiles.verificationLevel,
      slug: specialistProfiles.slug,
      birthDate: specialistProfiles.birthDate,
      districtName: districts.nameRu,
      priceAmount: specialistProfiles.priceAmount,
      priceUnit: specialistProfiles.priceUnit,
      experienceYears: specialistProfiles.experienceYears,
      education: specialistProfiles.education,
      description: specialistProfiles.description,
      moderationNote: specialistProfiles.moderationNote,
      photoKey: specialistProfiles.photoKey,
    })
    .from(specialistProfiles)
    .innerJoin(user, eq(user.id, specialistProfiles.userId))
    .leftJoin(districts, eq(districts.id, specialistProfiles.districtId))
    .where(eq(specialistProfiles.id, id))
    .limit(1);

  if (!row) notFound();

  const docRows = await db
    .select({
      id: documents.id,
      type: documents.type,
      status: documents.status,
      fileKey: documents.fileKey,
      fileName: documents.fileName,
      reviewNote: documents.reviewNote,
    })
    .from(documents)
    .where(eq(documents.specialistId, row.id));

  const byType = new Map(docRows.map((d) => [d.type, d]));
  const steps = stepsForCategory(row.category);
  const summary = summarizeDocuments(
    docRows.map((d) => ({ type: d.type, status: d.status as DocumentStatus })),
    row.category
  );

  const priceUnitLabel =
    row.priceUnit === "hour" ? "час" : row.priceUnit === "day" ? "день" : "месяц";

  return (
    <div className="max-w-[860px]">
      <Link
        href="/admin/profiles"
        className="label-caps text-ink-soft transition-colors duration-300 hover:text-ink"
      >
        ← Все анкеты
      </Link>

      <h1 className="mt-4 font-display text-3xl leading-[1.08] font-medium text-ink sm:text-4xl">
        {row.fullName}
      </h1>
      <p className="mt-2 text-sm text-ink-soft">
        {categories[row.category].label} · {row.email} · {row.phone ?? "телефон не указан"}
      </p>

      {/* что видит семья */}
      <dl className="mt-8 grid gap-x-8 gap-y-4 border border-line bg-paper p-6 sm:grid-cols-2">
        <Row label="Район" value={row.districtName ?? "не выбран"} />
        <Row
          label="Стоимость"
          value={
            row.priceAmount
              ? `от ${row.priceAmount.toLocaleString("ru-RU")} сум/${priceUnitLabel}`
              : "не указана"
          }
        />
        <Row label="Опыт" value={row.experienceYears ? `${row.experienceYears} лет` : "не указан"} />
        <Row label="Образование" value={row.education || "не указано"} />
        <Row label="Дата рождения" value={row.birthDate || "не указана"} />
        <Row label="Уровень" value={VERIFICATION_LABEL[row.verificationLevel]} />
        <div className="sm:col-span-2">
          <dt className="label-caps text-ink-faint">О себе</dt>
          <dd className="mt-2 text-sm leading-relaxed text-ink">
            {row.description || "не заполнено"}
          </dd>
        </div>
      </dl>

      <p className="mt-3 text-xs leading-relaxed text-ink-soft">
        {VERIFICATION_MEANING[row.verificationLevel]}
      </p>

      {/* решения по анкете */}
      <AdminProfileActions
        profileId={row.id}
        status={row.status}
        slug={row.slug}
        canPublish={summary.photoApproved}
        blocking={summary.blockingRequired.length}
        premiumReady={summary.allApproved}
        moderationNote={row.moderationNote}
      />

      {/* документы */}
      <section className="mt-12">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h2 className="font-display text-2xl font-medium text-ink">Документы</h2>
          <p className="text-sm text-ink-soft">
            Обязательных принято: {summary.approvedRequired.length} из{" "}
            {summary.requiredCount}
            {summary.optionalCount > 0 &&
              ` · рекомендуемых: ${summary.approvedOptional.length} из ${summary.optionalCount}`}
          </p>
        </div>
        <p className="mt-2 text-sm leading-relaxed text-ink-soft">
          Документ можно загрузить за специалиста — например, если он принёс
          справки на бумаге. Загруженный администратором сразу считается
          принятым.
        </p>

        <ul className="mt-6 space-y-3">
          {steps.map((step) => {
            const doc = byType.get(step.key);
            return (
              <AdminDocumentRow
                key={step.key}
                profileId={row.id}
                step={step}
                state={{
                  documentId: doc?.id ?? null,
                  status: (doc?.status as "pending" | "approved" | "rejected") ?? "empty",
                  fileKey: doc?.fileKey ?? null,
                  fileName: doc?.fileName ?? null,
                  reviewNote: doc?.reviewNote ?? null,
                }}
              />
            );
          })}
        </ul>
      </section>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="label-caps text-ink-faint">{label}</dt>
      <dd className="mt-1 text-sm text-ink">{value}</dd>
    </div>
  );
}
