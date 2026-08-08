import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { smsEnabled } from "@/lib/sms";
import { PageHero } from "@/components/ui/page-hero";
import { SmsTestView } from "@/components/sms-test-view";

/**
 * Проверочный стенд SMS-подтверждения.
 *
 * Страница временная и намеренно закрыта двумя замками: её нет в продакшене
 * вообще, а вне продакшена она доступна только администратору. Каждое
 * нажатие «Отправить код» при подключённом шлюзе стоит денег, поэтому
 * открывать её кому-то ещё нельзя.
 */

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Проверка SMS",
  robots: { index: false, follow: false },
};

export default async function SmsTestPage() {
  if (process.env.NODE_ENV === "production" && process.env.SMS_TEST_PAGE !== "1") {
    notFound();
  }

  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login?next=/sms-test");
  if (session.user.role !== "admin") notFound();

  return (
    <main className="flex-1">
      <PageHero
        title="Проверка SMS"
        subtitle="Служебная страница: подтверждение телефона кодом из SMS."
      />
      <section className="mx-auto max-w-[560px] px-5 pt-6 pb-24 sm:px-8">
        <SmsTestView smsLive={smsEnabled()} />
      </section>
    </main>
  );
}
