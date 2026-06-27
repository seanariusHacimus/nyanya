import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { getAdminStats, getAdminSpecialists, getAdminUsers } from "@/lib/admin-queries";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { VerificationBadge } from "@/components/verification-badge";
import { SpecialistActions } from "@/components/admin/specialist-actions";
import { UserBlock } from "@/components/admin/user-block";
import { formatUZS } from "@/lib/format";

const STATUS_KEY: Record<string, string> = {
  active: "statusActive",
  pending_review: "statusPending",
  hidden: "statusHidden",
  draft: "statusDraft",
  rejected: "statusRejected",
};

export default async function AdminPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const session = await getSession();
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!session) redirect(`/${locale}/login`);
  if (role !== "admin") redirect(`/${locale}/account`);

  const [stats, specialists, users] = await Promise.all([
    getAdminStats(),
    getAdminSpecialists(),
    getAdminUsers(),
  ]);
  const t = await getTranslations("admin");
  const cat = await getTranslations("categories");

  const cards = [
    { label: t("parents"), value: stats.parents },
    { label: t("specialistsTotal"), value: stats.specialists },
    { label: t("unlocks"), value: stats.unlocks },
    { label: t("paymentsTotal"), value: stats.payments },
    { label: t("revenue"), value: formatUZS(stats.revenue) },
    { label: t("conversion"), value: stats.conversion },
  ];

  return (
    <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <h1 className="font-display text-4xl font-semibold text-ink">{t("title")}</h1>

      {/* analytics */}
      <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
        {cards.map((c) => (
          <div key={c.label} className="rounded-2xl border border-line bg-card p-4">
            <p className="text-xs uppercase tracking-wider text-gold-ink">{c.label}</p>
            <p className="mt-2 font-display text-2xl font-semibold text-ink">{c.value}</p>
          </div>
        ))}
      </div>

      {/* moderation */}
      <h2 className="mt-12 font-display text-2xl font-semibold text-ink">{t("moderation")}</h2>
      <div className="mt-4 overflow-x-auto rounded-2xl border border-line bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("name")}</TableHead>
              <TableHead>{t("category")}</TableHead>
              <TableHead>{t("status")}</TableHead>
              <TableHead>{t("verification")}</TableHead>
              <TableHead>{t("trust")}</TableHead>
              <TableHead className="text-right">{t("actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {specialists.map((s) => (
              <TableRow key={s.id}>
                <TableCell className="font-medium text-ink">{s.fullName}</TableCell>
                <TableCell className="text-muted-foreground">{cat(s.category)}</TableCell>
                <TableCell className="text-muted-foreground">
                  {t(STATUS_KEY[s.status] ?? "statusActive")}
                </TableCell>
                <TableCell>
                  {s.verificationLevel === "unverified" ? (
                    <span className="text-xs text-muted-foreground">—</span>
                  ) : (
                    <VerificationBadge level={s.verificationLevel} />
                  )}
                </TableCell>
                <TableCell className="tabular-nums">{s.trustScore}</TableCell>
                <TableCell>
                  <div className="flex justify-end">
                    <SpecialistActions id={s.id} status={s.status} />
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* users */}
      <h2 className="mt-12 font-display text-2xl font-semibold text-ink">{t("recentUsers")}</h2>
      <div className="mt-4 overflow-x-auto rounded-2xl border border-line bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("name")}</TableHead>
              <TableHead>{t("email")}</TableHead>
              <TableHead>{t("role")}</TableHead>
              <TableHead className="text-right">{t("actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((u) => (
              <TableRow key={u.id}>
                <TableCell className="font-medium text-ink">
                  {u.name}
                  {u.banned && (
                    <span className="ml-2 rounded bg-destructive/10 px-1.5 py-0.5 text-xs text-destructive">
                      {t("blocked")}
                    </span>
                  )}
                </TableCell>
                <TableCell className="text-muted-foreground">{u.email}</TableCell>
                <TableCell className="text-muted-foreground">{u.role}</TableCell>
                <TableCell>
                  <div className="flex justify-end">
                    {u.role !== "admin" && <UserBlock id={u.id} banned={u.banned} />}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </section>
  );
}
