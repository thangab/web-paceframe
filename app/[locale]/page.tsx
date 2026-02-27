import type { Metadata } from "next";
import { redirect } from "next/navigation";
import NewsletterForm from "../components/newsletter-form";
import { isLocale, locales, type Locale } from "../i18n";

type PageProps = {
  params: Promise<{ locale: string }>;
};

const copy: Record<
  Locale,
  {
    metaTitle: string;
    metaDescription: string;
    comingSoon: string;
    title: string;
    titleAccent: string;
    subtitle: string;
    heroCta: string;
    launchStatus: string;
    waitlistOpen: string;
    statusText: string;
    bullet1: string;
    bullet2: string;
    bullet3: string;
    notAvailable: string;
    formLead: string;
  }
> = {
  en: {
    metaTitle: "PaceFrame - Turn Activities Into Shareable Visuals",
    metaDescription:
      "PaceFrame helps athletes transform activity stats into clean, high-impact visuals ready for social sharing in seconds.",
    comingSoon: "Coming Soon",
    title: "PaceFrame is launching",
    titleAccent: "very soon",
    subtitle:
      "A new way to turn your sports activities into bold visuals ready to share. The app is currently being finalized.",
    heroCta: "Join the waitlist",
    launchStatus: "Launch Status",
    waitlistOpen: "Waitlist is open",
    statusText:
      "Public launch is coming soon. Join with your email to get early access updates.",
    bullet1: "App in final polishing",
    bullet2: "Progressive access by email",
    bullet3: "Direct support: contact@paceframe.app",
    notAvailable: "The app is not available yet",
    formLead: "PaceFrame is launching soon. Leave your email to get notified.",
  },
  fr: {
    metaTitle: "PaceFrame - Transforme Tes Activites En Visuels",
    metaDescription:
      "PaceFrame permet aux sportifs de transformer leurs stats d'activite en visuels impactants, prets a partager en quelques secondes.",
    comingSoon: "Coming Soon",
    title: "PaceFrame arrive",
    titleAccent: "tres bientot",
    subtitle:
      "Une nouvelle facon de transformer tes activites sportives en visuels forts et prets a partager. L'application est en cours de finalisation.",
    heroCta: "Rejoindre la liste d'attente",
    launchStatus: "Etat du lancement",
    waitlistOpen: "Liste d'attente ouverte",
    statusText:
      "Le lancement public approche. Inscris ton email pour recevoir l'acces en priorite.",
    bullet1: "Application en finalisation",
    bullet2: "Acces progressif par email",
    bullet3: "Support direct: contact@paceframe.app",
    notAvailable: "L'app n'est pas encore disponible",
    formLead:
      "PaceFrame arrive bientot. Laisse ton email pour etre prevenu au lancement.",
  },
};

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale: rawLocale } = await params;
  const locale = isLocale(rawLocale) ? rawLocale : "en";
  const t = copy[locale];

  return {
    title: t.metaTitle,
    description: t.metaDescription,
  };
}

export default async function LocaleHomePage({ params }: PageProps) {
  const { locale: rawLocale } = await params;

  if (!isLocale(rawLocale)) {
    redirect("/en");
  }

  const locale = rawLocale;
  const t = copy[locale];

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-14 px-6 pb-10 md:px-10">
        <section className="grid items-center gap-10 lg:grid-cols-2">
          <div className="space-y-6">
            <p className="inline-block rounded-full border border-[#D4FF54]/40 bg-[#D4FF54]/10 px-3 py-1 text-xs font-semibold tracking-[0.2em] text-[#D4FF54] uppercase">
              {t.comingSoon}
            </p>
            <h1 className="text-4xl font-black leading-tight sm:text-5xl md:text-6xl">
              {t.title}
              <span className="block text-[#D4FF54]">{t.titleAccent}</span>
            </h1>
            <p className="max-w-xl text-base leading-relaxed text-white/75 sm:text-lg">
              {t.subtitle}
            </p>
            <div className="flex flex-wrap items-center gap-4">
              <a
                href="#get-started"
                className="rounded-xl bg-[#D4FF54] px-6 py-3 text-sm font-bold tracking-wide text-[#131B2E] uppercase transition hover:scale-[1.02] hover:brightness-95"
              >
                {t.heroCta}
              </a>
            </div>
          </div>

          <div className="relative">
            <div className="absolute -top-8 -left-6 h-32 w-32 rounded-full bg-[#D4FF54]/25 blur-3xl" />
            <div className="absolute -right-8 -bottom-8 h-36 w-36 rounded-full bg-[#38599f]/40 blur-3xl" />
            <div className="relative rounded-3xl border border-white/15 bg-white/5 p-6 backdrop-blur">
              <p className="text-xs font-semibold tracking-[0.22em] text-[#D4FF54] uppercase">
                {t.launchStatus}
              </p>
              <h2 className="mt-3 text-3xl font-black leading-tight">
                {t.waitlistOpen}
              </h2>
              <p className="mt-3 text-sm text-white/75">{t.statusText}</p>
              <div className="mt-6 space-y-3 text-sm text-white/80">
                <div className="flex items-center gap-3">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#D4FF54]" />
                  <p>{t.bullet1}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#D4FF54]" />
                  <p>{t.bullet2}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#D4FF54]" />
                  <p>{t.bullet3}</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section
          id="get-started"
          className="rounded-3xl border border-[#D4FF54]/25 bg-gradient-to-r from-[#1A2540] to-[#101726] p-8"
        >
          <div className="flex flex-col gap-5">
            <div>
              <h3 className="text-2xl font-bold">{t.notAvailable}</h3>
              <p className="mt-2 text-white/75">{t.formLead}</p>
            </div>
            <NewsletterForm locale={locale} />
          </div>
        </section>
    </div>
  );
}
