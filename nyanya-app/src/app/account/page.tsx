import { AccountView } from "@/components/account-view";

export const metadata = {
  title: "Кабинет",
  description: "Избранное, открытые контакты и история платежей.",
};

export default function AccountPage() {
  return (
    <main className="flex-1">
      <AccountView />
    </main>
  );
}
