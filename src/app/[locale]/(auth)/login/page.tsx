import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { LoginForm } from "./login-form";

export default function LoginPage() {
  const t = useTranslations("auth");
  return (
    <Card className="border-line">
      <CardHeader className="text-center">
        <CardTitle className="font-display text-3xl font-semibold">
          {t("loginTitle")}
        </CardTitle>
        <CardDescription>{t("loginSubtitle")}</CardDescription>
      </CardHeader>
      <CardContent>
        <LoginForm />
        <p className="mt-6 text-center text-sm text-muted-foreground">
          {t("noAccount")}{" "}
          <Link href="/register" className="font-medium text-gold-ink hover:underline">
            {t("submitRegister")}
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
