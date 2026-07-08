import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { RegisterForm } from "./register-form";

export default function RegisterPage() {
  const t = useTranslations("auth");
  return (
    <Card className="border-line">
      <CardHeader className="text-center">
        <CardTitle className="font-display text-3xl font-semibold">
          {t("registerTitle")}
        </CardTitle>
        <CardDescription>{t("registerSubtitle")}</CardDescription>
      </CardHeader>
      <CardContent>
        <RegisterForm />
        <p className="mt-6 text-center text-sm text-muted-foreground">
          {t("haveAccount")}{" "}
          <Link href="/login" className="font-medium text-gold-ink hover:underline">
            {t("submitLogin")}
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
