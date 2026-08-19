import { headers } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { getCabinetData } from "@/lib/queries/specialist-cabinet";
import { markNotificationsRead } from "@/lib/queries/notifications";
import { SpecialistCabinet } from "@/components/specialist-cabinet";
import { ButtonLink } from "@/components/ui/button-link";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Кабинет специалиста",
  description: "Анкета, верификация документов и статус проверки.",
};

export default async function SpecialistPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login?next=/specialist");

  // родитель сюда не попадает — у него свой кабинет
  if (session.user.role === "parent") {
    return (
      <main className="flex flex-1 items-center">
        <div className="mx-auto max-w-[1400px] px-5 py-28 text-center sm:px-8">
          <h1 className="font-display text-4xl font-medium text-ink">
            Раздел для специалистов
          </h1>
          <p className="mx-auto mt-5 max-w-md text-lg leading-relaxed text-ink-soft">
            Вы вошли как родитель. Анкеты размещают няни, сиделки, помощники по хозяйству и
            водители.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-x-8 gap-y-5">
            <ButtonLink href="/account">Мой кабинет</ButtonLink>
            <Link
              href="/become-specialist"
              className="label-caps border-b border-ink/30 pb-1 text-ink transition-colors duration-300 hover:border-bronze hover:text-bronze-text"
            >
              Условия для специалистов
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const data = await getCabinetData(session.user.id, session.user.name);
  // лента показана — значок в шапке гаснет
  await markNotificationsRead(session.user.id);

  return (
    <main className="flex-1">
      <SpecialistCabinet name={session.user.name || "Специалист"} data={data} />
    </main>
  );
}
