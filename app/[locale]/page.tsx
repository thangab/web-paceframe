import Image from "next/image";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import NewsletterForm from "../components/newsletter-form";
import { isLocale, locales, type Locale } from "../i18n";

type PageProps = {
  params: Promise<{ locale: string }>;
};

const siteUrl = "https://paceframe.app";

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
    templatesTitle: string;
    templatesSubtitle: string;
    templatesBody: string;
    notAvailable: string;
    formLead: string;
  }
> = {
  en: {
    metaTitle: "PaceFrame - Turn Activities Into Shareable Visuals",
    metaDescription:
      "PaceFrame helps athletes transform activity stats into clean, high-impact visuals for social sharing, including Instagram and TikTok stories, with connection via Strava or Apple Health.",
    comingSoon: "Coming Soon",
    title: "PaceFrame is launching",
    titleAccent: "very soon",
    subtitle:
      "A new way to turn your sports activities into bold visuals built for social sharing, including Instagram and TikTok stories. The app is currently being finalized.",
    heroCta: "Join the waitlist",
    launchStatus: "Launch Status",
    waitlistOpen: "Waitlist is open",
    statusText:
      "Public launch is coming soon. Join with your email to get early access updates.",
    bullet1: "App in final polishing",
    bullet2: "Progressive access by email",
    bullet3: "Direct support: contact@paceframe.app",
    templatesTitle: "Generated Visuals",
    templatesSubtitle:
      "Real activity visuals generated automatically from PaceFrame styles.",
    templatesBody:
      "Each visual is auto-generated from your activity data. PaceFrame formats the key stats into modern story-ready layouts so you can share instantly on social media.",
    notAvailable: "The app is not available yet",
    formLead: "PaceFrame is launching soon. Leave your email to get notified.",
  },
  fr: {
    metaTitle: "PaceFrame - Transforme Tes Activites En Visuels",
    metaDescription:
      "PaceFrame permet aux sportifs de transformer leurs stats d'activite en visuels impactants pour les reseaux sociaux, notamment les stories Instagram et TikTok, avec connexion via Strava ou Apple Health.",
    comingSoon: "Coming Soon",
    title: "PaceFrame arrive",
    titleAccent: "tres bientot",
    subtitle:
      "Une nouvelle facon de transformer tes activites sportives en visuels forts, penses pour les reseaux sociaux, notamment les stories Instagram et TikTok. L'application est en cours de finalisation.",
    heroCta: "Rejoindre la liste d'attente",
    launchStatus: "Etat du lancement",
    waitlistOpen: "Liste d'attente ouverte",
    statusText:
      "Le lancement public approche. Inscris ton email pour recevoir l'acces en priorite.",
    bullet1: "Application en finalisation",
    bullet2: "Acces progressif par email",
    bullet3: "Support direct: contact@paceframe.app",
    templatesTitle: "Visuels Generes",
    templatesSubtitle:
      "Des visuels d'activite reels, generes automatiquement avec les styles PaceFrame.",
    templatesBody:
      "Chaque visuel est genere automatiquement a partir de tes donnees d'activite. PaceFrame met en forme les stats importantes dans des layouts modernes prets pour les stories.",
    notAvailable: "L'app n'est pas encore disponible",
    formLead:
      "PaceFrame arrive bientot. Laisse ton email pour etre prevenu au lancement.",
  },
};

const templateImages = [
  "/templates/template1.jpg",
  "/templates/template2.jpg",
  "/templates/template3.jpg",
  "/templates/template4.jpg",
  "/templates/template5.jpg",
  "/templates/template6.jpg",
] as const;

const loopedTemplateImages = [...templateImages, ...templateImages];
const reverseLoopedTemplateImages = [...templateImages]
  .reverse()
  .concat([...templateImages].reverse());
const shiftedLoopedTemplateImages = [
  ...templateImages.slice(2),
  ...templateImages.slice(0, 2),
  ...templateImages.slice(2),
  ...templateImages.slice(0, 2),
];

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale: rawLocale } = await params;
  const locale = isLocale(rawLocale) ? rawLocale : "en";
  const t = copy[locale];
  const canonical = locale === "en" ? `${siteUrl}/en` : `${siteUrl}/fr`;

  return {
    title: t.metaTitle,
    description: t.metaDescription,
    alternates: {
      canonical,
      languages: {
        en: `${siteUrl}/en`,
        fr: `${siteUrl}/fr`,
        "x-default": `${siteUrl}/en`,
      },
    },
    openGraph: {
      type: "website",
      url: canonical,
      title: t.metaTitle,
      description: t.metaDescription,
    },
    twitter: {
      card: "summary_large_image",
      title: t.metaTitle,
      description: t.metaDescription,
    },
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
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-10 overflow-x-hidden px-4 pb-10 sm:gap-14 sm:px-6 md:px-10 lg:overflow-x-visible">
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

          <div className="relative overflow-hidden rounded-3xl lg:overflow-visible">
            <div className="absolute -top-8 -left-6 h-32 w-32 rounded-full bg-[#D4FF54]/25 blur-3xl" />
            <div className="absolute -right-8 -bottom-8 h-36 w-36 rounded-full bg-[#38599f]/40 blur-3xl" />
            <div className="relative rounded-3xl border border-white/15 bg-white/5 p-5 backdrop-blur sm:p-6">
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

      <section className="grid items-center gap-8 lg:grid-cols-2">
        <div className="space-y-4">
          <h2 className="text-xl font-bold sm:text-2xl">{t.templatesTitle}</h2>
          <p className="max-w-xl text-sm text-white/75">{t.templatesSubtitle}</p>
          <p className="max-w-xl text-sm leading-relaxed text-white/70">
            {t.templatesBody}
          </p>
        </div>

        <div className="pf-template-shell relative overflow-hidden rounded-3xl bg-white/[0.03] p-2 sm:p-4">
          <div className="pointer-events-none absolute -top-8 left-6 h-24 w-24 rounded-full bg-[#D4FF54]/25 blur-2xl" />
          <div className="pointer-events-none absolute -bottom-8 right-6 h-24 w-24 rounded-full bg-[#6ea8ff]/20 blur-2xl" />
          <div className="pointer-events-none absolute inset-x-0 top-0 z-20 h-14 bg-gradient-to-b from-[#131B2E] to-transparent sm:h-20" />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 h-14 bg-gradient-to-t from-[#131B2E] to-transparent sm:h-20" />

          <div className="pf-vertical-collage grid h-[430px] grid-cols-3 gap-3 overflow-hidden sm:h-[560px] sm:gap-4">
            <div className="pf-vertical-marquee flex flex-col gap-3 sm:gap-4">
              {loopedTemplateImages.map((src, index) => (
                <article
                  key={`left-${src}-${index}`}
                  className={`group overflow-hidden rounded-[22px] bg-[#0d111d] shadow-[0_10px_35px_rgba(0,0,0,0.38)] ${
                    index % 2 === 0 ? "rotate-[2deg]" : "-rotate-[2deg]"
                  }`}
                >
                  <div className="relative aspect-[9/16]">
                    <Image
                      src={src}
                      alt={`PaceFrame template ${(index % templateImages.length) + 1}`}
                      fill
                      sizes="(max-width: 1024px) 45vw, 15vw"
                      className="object-cover transition duration-500 group-hover:scale-[1.05]"
                    />
                  </div>
                </article>
              ))}
            </div>

            <div className="pf-vertical-marquee-reverse flex flex-col gap-3 sm:gap-4">
              {reverseLoopedTemplateImages.map((src, index) => (
                <article
                  key={`right-${src}-${index}`}
                  className={`group overflow-hidden rounded-[22px] bg-[#0d111d] shadow-[0_10px_35px_rgba(0,0,0,0.38)] ${
                    index % 2 === 0 ? "-rotate-[2deg]" : "rotate-[2deg]"
                  }`}
                >
                  <div className="relative aspect-[9/16]">
                    <Image
                      src={src}
                      alt={`PaceFrame template ${(index % templateImages.length) + 1}`}
                      fill
                      sizes="(max-width: 1024px) 45vw, 15vw"
                      className="object-cover transition duration-500 group-hover:scale-[1.05]"
                    />
                  </div>
                </article>
              ))}
            </div>

            <div className="pf-vertical-marquee-third flex flex-col gap-3 sm:gap-4">
              {shiftedLoopedTemplateImages.map((src, index) => (
                <article
                  key={`third-${src}-${index}`}
                  className={`group overflow-hidden rounded-[22px] bg-[#0d111d] shadow-[0_10px_35px_rgba(0,0,0,0.38)] ${
                    index % 2 === 0 ? "rotate-[2deg]" : "-rotate-[2deg]"
                  }`}
                >
                  <div className="relative aspect-[9/16]">
                    <Image
                      src={src}
                      alt={`PaceFrame template ${(index % templateImages.length) + 1}`}
                      fill
                      sizes="(max-width: 1024px) 30vw, 13vw"
                      className="object-cover transition duration-500 group-hover:scale-[1.05]"
                    />
                  </div>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section
        id="get-started"
          className="rounded-3xl border border-[#D4FF54]/25 bg-gradient-to-r from-[#1A2540] to-[#101726] p-5 sm:p-8"
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
