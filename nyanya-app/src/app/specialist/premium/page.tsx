import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getCabinetData } from "@/lib/queries/specialist-cabinet";
import { PremiumPanel } from "@/components/specialist/premium-panel";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Премиум-профиль",
  description: "Что даёт премиум-профиль и какие документы для него нужны.",
};

export default async function PremiumPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login?next=/specialist/premium");
  // родителю здесь нечего делать — кабинет специалиста сам объяснит, куда идти
  if (session.user.role !== "specialist") redirect("/specialist");

  const data = await getCabinetData(session.user.id, session.user.name);

  return (
    <main className="flex-1">
      <PremiumPanel data={data} />
    </main>
  );
}
