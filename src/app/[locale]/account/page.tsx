import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { BadgeCheck, AlertCircle, Search, FileText, ShieldCheck, Heart, Bell } from "lucide-react";
import { getSession } from "@/lib/session";
import { Link } from "@/i18n/navigation";
import { LogoutButton } from "@/components/logout-button";

type Role = "parent" | "specialist" | "admin";

export default async function AccountPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const session = await getSession();
  if (!session) redirect(`/${locale}/login`);

  const user = session.user as typeof session.user & {
    role?: string;
    phoneVerified?: boolean;
  };
  const role = (user.role ?? "parent") as Role;
  const t = await getTranslations("account");

  const cards: { href: string; title: string; desc: string; icon: typeof Search }[] = [
    { href: "/catalog", title: t("browse"), desc: t("browseDesc"), icon: Search },
  ];
  if (role === "specialist")
    cards.push({ href: "/specialist", title: t("myProfile"), desc: t("myProfileDesc"), icon: FileText });
  if (role === "admin")
    cards.push({ href: "/admin", title: t("adminPanel"), desc: t("adminPanelDesc"), icon: ShieldCheck });
  if (role === "parent")
    cards.push({ href: "/account/favorites", title: t("favorites"), desc: t("favoritesDesc"), icon: Heart });
  cards.push({
    href: "/account/notifications",
    title: t("notifications"),
    desc: t("notificationsDesc"),
    icon: Bell,
  });

  return (
    <section className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-gold-ink">{t(role)}</p>
          <h1 className="mt-2 font-display text-4xl font-semibold text-ink">{user.name}</h1>
          <p className="mt-1 text-muted-foreground">{user.email}</p>
          <p className="mt-2 inline-flex items-center gap-1.5 text-sm">
            {user.phoneVerified ? (
              <>
                <BadgeCheck className="size-4 text-royal" />
                <span className="text-muted-foreground">{t("phoneVerified")}</span>
              </>
            ) : (
              <>
                <AlertCircle className="size-4 text-champagne" />
                <span className="text-muted-foreground">{t("phonePending")}</span>
              </>
            )}
          </p>
        </div>
        <LogoutButton />
      </div>

      <div className="mt-10 grid gap-4 sm:grid-cols-2">
        {cards.map((c) => (
          <Link
            key={c.href}
            href={c.href}
            className="group rounded-2xl border border-line bg-card p-6 transition-all hover:border-champagne hover:shadow-[0_16px_40px_-24px_rgba(44,26,79,0.4)]"
          >
            <span className="grid size-11 place-items-center rounded-xl bg-royal/5 text-royal transition-colors group-hover:bg-royal group-hover:text-champagne">
              <c.icon className="size-5" />
            </span>
            <h3 className="mt-4 font-display text-xl font-semibold text-ink">{c.title}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{c.desc}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}
