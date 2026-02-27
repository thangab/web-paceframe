import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { isLocale, locales, type Locale } from "../../i18n";

type PageProps = {
  params: Promise<{ locale: string }>;
};

type Section = {
  title: string;
  paragraphs?: string[];
  bullets?: string[];
};

const copy: Record<
  Locale,
  {
    metaTitle: string;
    metaDescription: string;
    pageTitle: string;
    updatedAt: string;
    intro: string;
    sections: Section[];
    contactLabel: string;
  }
> = {
  en: {
    metaTitle: "Terms of Service",
    metaDescription:
      "Read the PaceFrame Terms of Service for usage, subscriptions, and legal conditions.",
    pageTitle: "Terms of Service",
    updatedAt: "Last updated: February 2026",
    intro:
      "These Terms govern your use of the PaceFrame app. By using the app, you agree to them.",
    sections: [
      {
        title: "1. Description of Service",
        paragraphs: [
          "PaceFrame lets users connect their account and generate visual summaries of activities for personal and social sharing.",
          "PaceFrame is independent and not affiliated with or endorsed by Strava.",
        ],
      },
      {
        title: "2. Eligibility",
        paragraphs: [
          "You must be at least 13 years old to use the app.",
          "You represent that you have legal capacity to accept these terms.",
        ],
      },
      {
        title: "3. Integration",
        paragraphs: [
          "The app connects through official APIs for read-only activity access.",
          "You can revoke access at any time from your account settings.",
        ],
        bullets: [
          "No modification of source activity data",
          "No automatic posting back",
          "No access to unrelated account data",
        ],
      },
      {
        title: "4. User Content",
        paragraphs: [
          "Generated visuals belong to you.",
          "You are responsible for how you use and share generated content.",
          "You agree not to use the app for unlawful or harmful purposes.",
        ],
      },
      {
        title: "5. Subscriptions and Payments",
        paragraphs: ["Optional premium features may be offered via in-app purchases."],
        bullets: [
          "Auto-renew unless canceled",
          "Managed via Apple or Google account",
          "Subject to store billing policies",
          "Refunds handled by store policies",
        ],
      },
      {
        title: "6. Acceptable Use",
        bullets: [
          "Do not misuse integrations",
          "Do not access other users' data",
          "Do not reverse engineer the app",
          "Do not interfere with app operations",
        ],
      },
      {
        title: "7. Termination",
        paragraphs: [
          "We may suspend or terminate access for terms violations.",
          "You may stop using the app at any time.",
        ],
      },
      {
        title: "8. Disclaimer",
        paragraphs: [
          "The app is provided as is without warranties.",
          "We do not guarantee uninterrupted or error-free operation.",
        ],
      },
      {
        title: "9. Limitation of Liability",
        paragraphs: [
          "To the maximum extent permitted by law, PaceFrame is not liable for indirect or consequential damages from app use.",
        ],
      },
      {
        title: "10. Changes to Terms",
        paragraphs: [
          "We may update these terms. Continued use constitutes acceptance.",
        ],
      },
      {
        title: "11. Governing Law",
        paragraphs: ["These terms are governed by the laws of France."],
      },
      {
        title: "12. Contact",
      },
    ],
    contactLabel: "For legal questions:",
  },
  fr: {
    metaTitle: "Conditions d'utilisation",
    metaDescription:
      "Consultez les conditions d'utilisation de PaceFrame, incluant les regles d'acces et de service.",
    pageTitle: "Conditions d'utilisation",
    updatedAt: "Derniere mise a jour: fevrier 2026",
    intro:
      "Ces conditions regissent l'utilisation de l'app PaceFrame. En utilisant l'app, vous les acceptez.",
    sections: [
      {
        title: "1. Description du service",
        paragraphs: [
          "PaceFrame permet de connecter un compte et de generer des resumes visuels d'activites pour usage personnel et partage social.",
          "PaceFrame est independant et non affilie ou endorse par Strava.",
        ],
      },
      {
        title: "2. Eligibilite",
        paragraphs: [
          "Vous devez avoir au moins 13 ans pour utiliser l'app.",
          "Vous declarez avoir la capacite legale d'accepter ces conditions.",
        ],
      },
      {
        title: "3. Integration",
        paragraphs: [
          "L'app se connecte via des API officielles en lecture seule.",
          "Vous pouvez revoquer l'acces a tout moment dans les parametres de compte.",
        ],
        bullets: [
          "Aucune modification des donnees source",
          "Aucune publication automatique",
          "Aucun acces aux donnees non liees",
        ],
      },
      {
        title: "4. Contenu utilisateur",
        paragraphs: [
          "Les visuels generes vous appartiennent.",
          "Vous etes responsable de l'usage et du partage des contenus.",
          "Vous acceptez de ne pas utiliser l'app a des fins illegales ou nuisibles.",
        ],
      },
      {
        title: "5. Abonnements et paiements",
        paragraphs: [
          "Des fonctionnalites premium optionnelles peuvent etre proposees via achats integres.",
        ],
        bullets: [
          "Renouvellement automatique sauf annulation",
          "Gestion via compte Apple ou Google",
          "Soumis aux regles de facturation du store",
          "Remboursements selon les politiques du store",
        ],
      },
      {
        title: "6. Utilisation acceptable",
        bullets: [
          "Ne pas detourner les integrations",
          "Ne pas acceder aux donnees d'autres utilisateurs",
          "Ne pas retroconcevoir l'app",
          "Ne pas perturber le fonctionnement",
        ],
      },
      {
        title: "7. Resiliation",
        paragraphs: [
          "Nous pouvons suspendre ou resilier l'acces en cas de violation.",
          "Vous pouvez arreter l'utilisation a tout moment.",
        ],
      },
      {
        title: "8. Clause de non-garantie",
        paragraphs: [
          "L'app est fournie en l'etat sans garantie.",
          "Nous ne garantissons pas un service sans interruption ni erreur.",
        ],
      },
      {
        title: "9. Limitation de responsabilite",
        paragraphs: [
          "Dans les limites de la loi, PaceFrame n'est pas responsable des dommages indirects ou consequents.",
        ],
      },
      {
        title: "10. Modifications des conditions",
        paragraphs: [
          "Nous pouvons modifier ces conditions. L'utilisation continue vaut acceptation.",
        ],
      },
      {
        title: "11. Droit applicable",
        paragraphs: ["Ces conditions sont regies par le droit francais."],
      },
      {
        title: "12. Contact",
      },
    ],
    contactLabel: "Pour toute question legale:",
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

export default async function TermsPage({ params }: PageProps) {
  const { locale: rawLocale } = await params;

  if (!isLocale(rawLocale)) {
    redirect("/en/terms");
  }

  const locale = rawLocale;
  const t = copy[locale];
  return (
    <div className="mx-auto w-full max-w-3xl space-y-8 px-6 pb-10 md:px-10">
        <header className="space-y-2">
          <h1 className="text-4xl font-bold">{t.pageTitle}</h1>
          <p className="text-sm text-gray-300">{t.updatedAt}</p>
        </header>

        <p>{t.intro}</p>

        {t.sections.map((section) => (
          <section key={section.title} className="space-y-4">
            <h2 className="text-2xl font-semibold">{section.title}</h2>
            {section.paragraphs?.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
            {section.bullets ? (
              <ul className="list-disc space-y-1 pl-6">
                {section.bullets.map((bullet) => (
                  <li key={bullet}>{bullet}</li>
                ))}
              </ul>
            ) : null}
            {section.title.includes("Contact") ? (
              <p>
                {t.contactLabel} {" "}
                <a
                  href="mailto:contact@paceframe.app"
                  className="underline decoration-gray-300 underline-offset-4"
                >
                  contact@paceframe.app
                </a>
                <br />
                <a
                  href="https://paceframe.app"
                  className="underline decoration-gray-300 underline-offset-4"
                >
                  https://paceframe.app
                </a>
              </p>
            ) : null}
          </section>
        ))}

    </div>
  );
}
