import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import "@fontsource/bodoni-moda/latin-400.css";
import "@fontsource/bodoni-moda/latin-400-italic.css";
import "@fontsource/manrope/latin-500.css";
import "@fontsource/manrope/latin-700.css";
import "@fontsource/tajawal/arabic-400.css";
import "@fontsource/amiri/arabic-400.css";
import "../style.css";
export const metadata: Metadata = {
  title: "SENSORA — Digital Fragrance Lab",
  description:
    "Three fragrances. Three worlds. Explore SENSORA’s digital fragrance atelier and compose your own signature.",
};
export const viewport: Viewport = { themeColor: "#240b13" };
export function generateStaticParams() {
  return [{ locale: "en" }, { locale: "ar" }];
}
export default async function Layout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (locale !== "en" && locale !== "ar") notFound();
  return (
    <html lang={locale} dir={locale === "ar" ? "rtl" : "ltr"}>
      <body>{children}</body>
    </html>
  );
}
