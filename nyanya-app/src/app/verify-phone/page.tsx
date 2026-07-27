import { redirect } from "next/navigation";

/** Устаревший маршрут: код теперь вводится прямо на страницах входа и регистрации. */
export default function VerifyPhonePage() {
  redirect("/login");
}
