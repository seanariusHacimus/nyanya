import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { Heart } from "lucide-react";
import { getSession } from "@/lib/session";
import { getFavorites } from "@/lib/queries";
import { SpecialistCard } from "@/components/specialist-card";

export default async function FavoritesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const session = await getSession();
  if (!session) redirect(`/${locale}/login`);

  const items = await getFavorites(session.user.id);
  const t = await getTranslations("account");

  return (
    <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <h1 className="font-display text-4xl font-semibold text-ink">{t("favorites")}</h1>
      {items.length === 0 ? (
        <div className="mt-8 grid place-items-center rounded-2xl border border-dashed border-line py-20 text-center">
          <Heart className="size-10 text-muted-foreground" />
          <p className="mt-3 text-muted-foreground">{t("favoritesEmpty")}</p>
        </div>
      ) : (
        <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {items.map((item) => (
            <SpecialistCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </section>
  );
}
