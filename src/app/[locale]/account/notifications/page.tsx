import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { Bell, BadgeCheck, Star, Unlock } from "lucide-react";
import { getSession } from "@/lib/session";
import { getNotifications } from "@/lib/queries";

const ICONS: Record<string, typeof Bell> = {
  verification_status: BadgeCheck,
  new_review: Star,
  contact_unlocked: Unlock,
  listing_published: BadgeCheck,
  system: Bell,
};

export default async function NotificationsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const session = await getSession();
  if (!session) redirect(`/${locale}/login`);

  const items = await getNotifications(session.user.id);
  const t = await getTranslations("account");

  return (
    <section className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <h1 className="font-display text-4xl font-semibold text-ink">{t("notifications")}</h1>
      {items.length === 0 ? (
        <div className="mt-8 grid place-items-center rounded-2xl border border-dashed border-line py-16 text-center">
          <Bell className="size-9 text-muted-foreground" />
          <p className="mt-3 text-muted-foreground">{t("notificationsEmpty")}</p>
        </div>
      ) : (
        <ul className="mt-8 space-y-3">
          {items.map((n) => {
            const Icon = ICONS[n.type] ?? Bell;
            return (
              <li key={n.id} className="flex gap-3 rounded-xl border border-line bg-card p-4">
                <span className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-lg bg-royal/5 text-royal">
                  <Icon className="size-4" />
                </span>
                <div>
                  <p className="font-medium text-ink">{n.title}</p>
                  {n.body && <p className="mt-0.5 text-sm text-muted-foreground">{n.body}</p>}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
