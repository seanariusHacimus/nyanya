import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { VerifyPhoneForm } from "./verify-phone-form";

export default async function VerifyPhonePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const session = await getSession();
  if (!session) redirect(`/${locale}/login`);

  const t = await getTranslations("auth");
  return (
    <Card className="border-line">
      <CardHeader className="text-center">
        <CardTitle className="font-display text-3xl font-semibold">
          {t("verifyTitle")}
        </CardTitle>
        <CardDescription>{t("verifySubtitle")}</CardDescription>
      </CardHeader>
      <CardContent>
        <VerifyPhoneForm />
      </CardContent>
    </Card>
  );
}
