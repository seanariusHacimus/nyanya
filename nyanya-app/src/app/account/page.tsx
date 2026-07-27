import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getAccountData, markNotificationsRead } from "@/lib/queries/account";
import { AccountView } from "@/components/account-view";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Кабинет",
  description: "Избранное, открытые контакты и уведомления.",
};

export default async function AccountPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login?next=/account");

  // специалисту здесь делать нечего — у него свой кабинет
  if (session.user.role === "specialist") redirect("/specialist");

  const data = await getAccountData(session.user.id);
  await markNotificationsRead(session.user.id);

  return (
    <main className="flex-1">
      <AccountView
        name={session.user.name || "Гость"}
        phoneVerified={Boolean(session.user.phoneVerified)}
        data={data}
      />
    </main>
  );
}
