import { Hero } from "@/components/sections/hero";
import { Services } from "@/components/sections/services";
import { TrustFeatures } from "@/components/sections/trust-features";
import { HowItWorks } from "@/components/sections/how-it-works";
import { Reviews } from "@/components/sections/reviews";
import { CtaBand } from "@/components/sections/cta-band";

/**
 * Отзывы читаются из базы, поэтому главная больше не отрисовывается заранее.
 *
 * Не ISR: во время сборки базы нет — Railway собирает образ без доступа к
 * PostgreSQL, — и попытка отрисовать страницу заранее валит сборку целиком.
 * Так же помечена и страница «О сервисе», которая читает число анкет.
 */
export const dynamic = "force-dynamic";

export default function HomePage() {
  return (
    <main className="flex-1">
      <Hero />
      <Services />
      <TrustFeatures />
      <HowItWorks />
      <Reviews />
      <CtaBand />
    </main>
  );
}
