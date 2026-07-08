import Image from "next/image";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import NewsletterForm from "../components/newsletter-form";
import { isLocale, locales, type Locale } from "../i18n";

type PageProps = {
  params: Promise<{ locale: string }>;
};

const siteUrl = "https://paceframe.app";
const appStoreUrl = "https://apps.apple.com/fr/app/paceframe/id6759337106";

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
    secondaryCta: string;
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
    appStoreEyebrow: string;
  }
> = {
  en: {
    metaTitle: "PaceFrame - Download on the App Store",
    metaDescription:
      "PaceFrame is available on the App Store. Turn activity stats into clean, high-impact visuals for social sharing, including Instagram and TikTok stories, with connection via Strava or Apple Health.",
    comingSoon: "Available Now",
    title: "PaceFrame is available",
    titleAccent: "on the App Store",
    subtitle:
      "Turn your sports activities into bold visuals built for social sharing, including Instagram and TikTok stories. Download PaceFrame for iPhone today.",
    heroCta: "Download on the App Store",
    secondaryCta: "See generated visuals",
    launchStatus: "Launch Status",
    waitlistOpen: "iOS app is live",
    statusText:
      "PaceFrame is now available for iPhone on the Apple App Store.",
    bullet1: "Available for iPhone",
    bullet2: "Download directly from Apple",
    bullet3: "Direct support: contact@paceframe.app",
    templatesTitle: "Generated Visuals",
    templatesSubtitle:
      "Real activity visuals generated automatically from PaceFrame styles.",
    templatesBody:
      "Each visual is auto-generated from your activity data. PaceFrame formats the key stats into modern story-ready layouts so you can share instantly on social media.",
    notAvailable: "Get updates from PaceFrame",
    formLead:
      "Leave your email to receive product news, feature updates, and launch notes.",
    appStoreEyebrow: "Newsletter",
  },
  fr: {
    metaTitle: "PaceFrame - Disponible sur l'App Store",
    metaDescription:
      "PaceFrame est disponible sur l'App Store. Transforme tes stats d'activite en visuels impactants pour les reseaux sociaux, notamment les stories Instagram et TikTok, avec connexion via Strava ou Apple Health.",
    comingSoon: "Disponible maintenant",
    title: "PaceFrame est disponible",
    titleAccent: "sur l'App Store",
    subtitle:
      "Transforme tes activites sportives en visuels forts, penses pour les reseaux sociaux, notamment les stories Instagram et TikTok. Telecharge PaceFrame pour iPhone des aujourd'hui.",
    heroCta: "Telecharger sur l'App Store",
    secondaryCta: "Voir les visuels",
    launchStatus: "Disponibilite",
    waitlistOpen: "L'app iOS est en ligne",
    statusText:
      "PaceFrame est maintenant disponible pour iPhone sur l'Apple App Store.",
    bullet1: "Disponible pour iPhone",
    bullet2: "Telechargement direct via Apple",
    bullet3: "Support direct: contact@paceframe.app",
    templatesTitle: "Visuels Generes",
    templatesSubtitle:
      "Des visuels d'activite reels, generes automatiquement avec les styles PaceFrame.",
    templatesBody:
      "Chaque visuel est genere automatiquement a partir de tes donnees d'activite. PaceFrame met en forme les stats importantes dans des layouts modernes prets pour les stories.",
    notAvailable: "Recois les nouvelles de PaceFrame",
    formLead:
      "Laisse ton email pour recevoir les actus produit, les nouvelles fonctionnalites et les notes de lancement.",
    appStoreEyebrow: "Newsletter",
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

function AppStoreIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-5 w-5 flex-none"
      fill="currentColor"
    >
      <path
        d="M16.2 12.5c0-2.2 1.8-3.3 1.9-3.3-1-1.5-2.6-1.7-3.2-1.8-1.4-.1-2.6.8-3.3.8s-1.8-.8-2.9-.8c-1.5 0-2.9.9-3.7 2.2-1.6 2.8-.4 6.9 1.1 9.2.8 1.1 1.7 2.4 2.9 2.3 1.2 0 1.6-.7 2.9-.7 1.4 0 1.7.7 2.9.7 1.2 0 2-1.1 2.8-2.3.9-1.3 1.2-2.5 1.2-2.6 0 0-2.5-1-2.6-3.7Zm-2.2-6.6c.6-.8 1.1-1.9 1-2.9-1 0-2.1.6-2.8 1.4-.6.7-1.1 1.8-1 2.8 1.1.1 2.2-.5 2.8-1.3Z"
      />
    </svg>
  );
}

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
                href={appStoreUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-xl bg-[#D4FF54] px-6 py-3 text-sm font-bold tracking-wide text-[#131B2E] uppercase transition hover:scale-[1.02] hover:brightness-95"
              >
                <AppStoreIcon />
                {t.heroCta}
              </a>
              <a
                href="#generated-visuals"
                className="rounded-xl border border-white/15 px-6 py-3 text-sm font-bold tracking-wide text-white uppercase transition hover:border-[#D4FF54]/60 hover:text-[#D4FF54]"
              >
                {t.secondaryCta}
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

      <section id="generated-visuals" className="grid items-center gap-8 lg:grid-cols-2">
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
              <p className="text-xs font-semibold tracking-[0.2em] text-[#D4FF54] uppercase">
                {t.appStoreEyebrow}
              </p>
              <h3 className="text-2xl font-bold">{t.notAvailable}</h3>
              <p className="mt-2 text-white/75">{t.formLead}</p>
            </div>
            <NewsletterForm locale={locale} />
          </div>
        </section>
    </div>
  );
}
