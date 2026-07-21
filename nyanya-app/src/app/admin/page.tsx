import { AdminView } from "@/components/admin-view";

export const metadata = {
  title: "Админ-панель",
  description: "Модерация специалистов и управление платформой.",
  robots: { index: false, follow: false },
};

export default function AdminPage() {
  return (
    <main className="flex-1">
      <AdminView />
    </main>
  );
}
