import type { Metadata, Viewport } from "next";
import { Playfair_Display, Golos_Text } from "next/font/google";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import "./globals.css";

const playfair = Playfair_Display({
  subsets: ["cyrillic", "latin"],
  variable: "--font-playfair",
  display: "swap",
});

const golos = Golos_Text({
  subsets: ["cyrillic", "latin"],
  variable: "--font-golos",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "NYANYA.UZ — Проверенные специалисты для вашей семьи",
    template: "%s — NYANYA.UZ",
  },
  description:
    "Премиальный сервис подбора нянь, сиделок, репетиторов и водителей в Ташкенте. Мы тщательно проверяем специалистов, чтобы вы были спокойны за самое важное.",
};

export const viewport: Viewport = {
  themeColor: "#f2efe9",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ru"
      className={`${playfair.variable} ${golos.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <SiteHeader />
        {children}
        <SiteFooter />
      </body>
    </html>
  );
}
