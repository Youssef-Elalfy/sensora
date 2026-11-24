import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import "@fontsource/bodoni-moda/latin-400.css";
import "@fontsource/bodoni-moda/latin-400-italic.css";
import "@fontsource/manrope/latin-500.css";
import "@fontsource/manrope/latin-700.css";
import "@fontsource/tajawal/arabic-400.css";
import "@fontsource/amiri/arabic-400.css";
import "../style.css";
const site =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? "https://" + process.env.VERCEL_PROJECT_PRODUCTION_URL
    : "http://localhost:3000");
const copy = {
  en: {
    title: "SENSORA — Digital Fragrance Lab",
    description:
      "Three fragrances. Three worlds. An immersive fragrance experience with procedural 3D perfume design, cinematic WebGL environments and an interactive scent lab.",
    alt: "The SENSORA Ember bottle on garnet silk",
  },
  ar: {
    title: "SENSORA — مختبر العطر الرقمي",
    description:
      "ثلاثة عطور. ثلاثة عوالم. تجربة عطرية غامرة بزجاجات ثلاثية الأبعاد مصمّمة برمجيًا وبيئات WebGL سينمائية ومختبر عطور تفاعلي.",
    alt: "زجاجة SENSORA Ember على حرير عقيقي",
  },
};
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const c = locale === "ar" ? copy.ar : copy.en;
  return {
    metadataBase: new URL(site),
    title: c.title,
    description: c.description,
    applicationName: "SENSORA",
    alternates: {
      canonical: "/" + (locale === "ar" ? "ar" : "en"),
      languages: { en: "/en", ar: "/ar", "x-default": "/en" },
    },
    openGraph: {
      type: "website",
      siteName: "SENSORA",
      title: c.title,
      description: c.description,
      url: "/" + (locale === "ar" ? "ar" : "en"),
      locale: locale === "ar" ? "ar_EG" : "en_US",
      alternateLocale: locale === "ar" ? "en_US" : "ar_EG",
      images: [{ url: "/og.jpg", width: 1200, height: 630, alt: c.alt }],
    },
    twitter: {
      card: "summary_large_image",
      title: c.title,
      description: c.description,
      images: ["/og.jpg"],
    },
  };
}
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
