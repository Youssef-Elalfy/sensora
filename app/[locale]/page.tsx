import { notFound } from "next/navigation";
import Experience from "@/components/Experience";
export default async function Page({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (locale !== "en" && locale !== "ar") notFound();
  return <Experience locale={locale} />;
}
