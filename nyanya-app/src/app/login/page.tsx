import { Suspense } from "react";
import { LoginForm } from "@/components/auth/login-form";
import { TrustSeal } from "@/components/trust-seal";

export const metadata = {
  title: "Вход",
  description: "Вход в аккаунт nyanya.uz.",
};

export default function LoginPage() {
  return (
    <main className="flex flex-1 items-center py-16 lg:py-24">
      <div className="mx-auto w-full max-w-md px-5 sm:px-0">
        <div className="relative mx-auto size-20">
          <TrustSeal
            words={["Безопасность", "Доверие", "Забота"]}
            className="relative block size-full"
          />
        </div>
        <h1 className="mt-6 text-center font-display text-4xl font-medium text-ink">
          Вход
        </h1>
        <div className="mt-10 border border-line bg-paper p-8">
          <Suspense>
            <LoginForm />
          </Suspense>
        </div>
      </div>
    </main>
  );
}
