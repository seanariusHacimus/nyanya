import { SpecialistCabinet } from "@/components/specialist-cabinet";

export const metadata = {
  title: "Кабинет специалиста",
  description: "Анкета, статус проверки и показатели специалиста.",
};

export default function SpecialistPage() {
  return (
    <main className="flex-1">
      <SpecialistCabinet />
    </main>
  );
}
