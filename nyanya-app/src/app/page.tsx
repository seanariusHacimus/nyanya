import { Hero } from "@/components/sections/hero";
import { Services } from "@/components/sections/services";
import { TrustFeatures } from "@/components/sections/trust-features";
import { HowItWorks } from "@/components/sections/how-it-works";
import { CtaBand } from "@/components/sections/cta-band";

export default function HomePage() {
  return (
    <main className="flex-1">
      <Hero />
      <Services />
      <TrustFeatures />
      <HowItWorks />
      <CtaBand />
    </main>
  );
}
