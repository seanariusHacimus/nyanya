"use client";

import { useState } from "react";
import { Menu, UserRound } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useRouter } from "@/i18n/navigation";
import { authClient } from "@/lib/auth-client";
import { buttonVariants } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { BrandMark } from "@/components/brand-mark";
import { cn } from "@/lib/utils";

export function SiteHeader() {
  const t = useTranslations("nav");
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const { data: session } = authClient.useSession();
  const authed = !!session;

  const links = [
    { href: "/catalog", label: t("catalog") },
    { href: "/become-specialist", label: t("forSpecialists") },
    { href: "/how-it-works", label: t("howItWorks") },
  ];

  async function logout() {
    await authClient.signOut();
    setOpen(false);
    router.push("/");
    router.refresh();
  }

  return (
    <header className="surface-dark sticky top-0 z-50 border-b border-ivory/10 bg-espresso/95 text-ivory backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link href="/" aria-label="nyanya.uz">
          <BrandMark onDark />
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="text-sm text-ivory/70 transition-colors hover:text-champagne"
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-1 md:flex">
          <LocaleSwitcher />
          {authed ? (
            <>
              <Link
                href="/account"
                className={cn(buttonVariants({ variant: "ghost" }), "gap-1.5 text-ivory/80 hover:text-champagne")}
              >
                <UserRound className="size-4" />
                {t("account")}
              </Link>
              <button
                onClick={logout}
                className={cn(buttonVariants({ variant: "outline" }))}
              >
                {t("logout")}
              </button>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className={cn(buttonVariants({ variant: "ghost" }), "text-ivory/80 hover:text-champagne")}
              >
                {t("login")}
              </Link>
              <Link
                href="/register"
                className={cn(buttonVariants(), "hover:bg-champagne-deep")}
              >
                {t("signup")}
              </Link>
            </>
          )}
        </div>

        <div className="flex items-center gap-1 md:hidden">
          <LocaleSwitcher />
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger
              aria-label={t("menu")}
              className={cn(buttonVariants({ variant: "ghost", size: "icon" }))}
            >
              <Menu className="size-5" />
            </SheetTrigger>
            <SheetContent side="right" className="surface-dark border-ivory/10 bg-espresso text-ivory">
              <SheetTitle className="sr-only">{t("menu")}</SheetTitle>
              <div className="mt-10 flex flex-col gap-1 px-4">
                {links.map((l) => (
                  <Link
                    key={l.href}
                    href={l.href}
                    onClick={() => setOpen(false)}
                    className="rounded-md px-3 py-3 text-lg text-ivory hover:bg-ivory/5"
                  >
                    {l.label}
                  </Link>
                ))}
                <div className="mt-4 flex flex-col gap-2">
                  {authed ? (
                    <>
                      <Link
                        href="/account"
                        onClick={() => setOpen(false)}
                        className={cn(buttonVariants({ variant: "outline" }), "w-full")}
                      >
                        {t("account")}
                      </Link>
                      <button
                        onClick={logout}
                        className={cn(buttonVariants(), "w-full hover:bg-champagne-deep")}
                      >
                        {t("logout")}
                      </button>
                    </>
                  ) : (
                    <>
                      <Link
                        href="/login"
                        onClick={() => setOpen(false)}
                        className={cn(buttonVariants({ variant: "outline" }), "w-full")}
                      >
                        {t("login")}
                      </Link>
                      <Link
                        href="/register"
                        onClick={() => setOpen(false)}
                        className={cn(buttonVariants(), "w-full hover:bg-champagne-deep")}
                      >
                        {t("signup")}
                      </Link>
                    </>
                  )}
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
