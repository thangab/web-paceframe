import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { isLocale, type Locale } from "../i18n";

type LocaleLayoutProps = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

const copy: Record<
  Locale,
  {
    privacyLabel: string;
    termsLabel: string;
  }
> = {
  en: {
    privacyLabel: "Privacy Policy",
    termsLabel: "Terms of Service",
  },
  fr: {
    privacyLabel: "Politique de confidentialite",
    termsLabel: "Conditions d'utilisation",
  },
};

export default async function LocaleLayout({
  children,
  params,
}: LocaleLayoutProps) {
  const { locale: rawLocale } = await params;

  if (!isLocale(rawLocale)) {
    redirect("/en");
  }

  const locale = rawLocale;
  const t = copy[locale];

  return (
    <main className="min-h-screen bg-[#131B2E] text-white">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-6 pb-8 pt-8 md:px-10 md:pt-12">
        <Link href={`/${locale}`} className="flex items-center gap-3">
          <Image
            src="/paceframe-icon.png"
            alt="PaceFrame"
            width={44}
            height={44}
            className="rounded-xl"
            priority
          />
          <span className="text-xl font-extrabold tracking-tight text-white">
            PaceFrame
          </span>
        </Link>
        <div className="flex items-center gap-4 text-sm">
          <div className="inline-flex items-center rounded-xl border border-white/15 bg-white/5 p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] backdrop-blur">
            <Link
              href="/en"
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold tracking-wide transition ${
                locale === "en"
                  ? "bg-[#D4FF54] text-[#131B2E] shadow-sm"
                  : "text-white/75 hover:text-white"
              }`}
            >
              EN
            </Link>
            <Link
              href="/fr"
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold tracking-wide transition ${
                locale === "fr"
                  ? "bg-[#D4FF54] text-[#131B2E] shadow-sm"
                  : "text-white/75 hover:text-white"
              }`}
            >
              FR
            </Link>
          </div>
          <a
            href="mailto:contact@paceframe.app"
            className="text-white/80 transition hover:text-[#D4FF54]"
          >
            contact@paceframe.app
          </a>
        </div>
      </div>

      {children}

      <div className="mx-auto w-full max-w-6xl border-t border-white/10 px-6 py-6 text-sm text-white/65 md:px-10">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <p>Support: contact@paceframe.app</p>
          <div className="flex items-center gap-5">
            <Link
              href={`/${locale}/privacy-policy`}
              className="transition hover:text-[#D4FF54]"
            >
              {t.privacyLabel}
            </Link>
            <Link
              href={`/${locale}/terms`}
              className="transition hover:text-[#D4FF54]"
            >
              {t.termsLabel}
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
