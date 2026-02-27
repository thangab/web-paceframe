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
    footnote: string;
    contactLead: string;
  }
> = {
  en: {
    metaTitle: "Privacy Policy",
    metaDescription:
      "Read the PaceFrame Privacy Policy and learn how we collect, use, and protect activity data.",
    pageTitle: "Privacy Policy",
    updatedAt: "Last updated: February 2026",
    intro:
      "PaceFrame (the App) respects your privacy and is committed to protecting your personal data.",
    sections: [
      {
        title: "1. Information We Collect",
        paragraphs: [
          "When you connect your account, PaceFrame accesses limited activity data.",
          "PaceFrame does not collect passwords, private messages, contacts, or unrelated data.",
        ],
        bullets: [
          "Activity distance",
          "Duration and moving time",
          "Pace and speed",
          "Elevation gain",
          "Activity date",
          "Activity map (polyline)",
        ],
      },
      {
        title: "2. How We Use Data",
        paragraphs: [
          "Data is used only to generate visual summaries, shareable images requested by users, and in-app stats display.",
          "PaceFrame is a read-only integration and does not write data back.",
        ],
      },
      {
        title: "3. Data Storage",
        paragraphs: [
          "We may store limited metadata required for visuals and user experience.",
          "Users can revoke account access at any time from account settings.",
        ],
        bullets: [
          "No login credentials are stored",
          "No excess token storage beyond API needs",
          "No sensitive personal data storage",
        ],
      },
      {
        title: "4. Data Sharing",
        paragraphs: [
          "PaceFrame does not sell, rent, or share user data with third parties.",
        ],
        bullets: [
          "Processed only inside app infrastructure",
          "Used only for requested visual generation",
        ],
      },
      {
        title: "5. User Control",
        bullets: [
          "Disconnect account at any time",
          "Delete generated content",
          "Request data deletion",
        ],
      },
      {
        title: "6. Security",
        paragraphs: [
          "We implement reasonable technical and organizational safeguards.",
        ],
      },
      {
        title: "7. Third-Party Services",
        bullets: ["Integrated service: Strava API"],
        paragraphs: ["All usage follows the Strava API Agreement."],
      },
      {
        title: "8. Children's Privacy",
        paragraphs: ["PaceFrame is not intended for children under 13."],
      },
      {
        title: "9. Changes",
        paragraphs: [
          "We may update this policy. Updates are posted on this page with a revised date.",
        ],
      },
      {
        title: "10. Contact",
      },
    ],
    footnote: "PaceFrame is not affiliated with or endorsed by Strava.",
    contactLead: "For privacy questions:",
  },
  fr: {
    metaTitle: "Politique de confidentialite",
    metaDescription:
      "Consultez la politique de confidentialite de PaceFrame et la gestion de vos donnees.",
    pageTitle: "Politique de confidentialite",
    updatedAt: "Derniere mise a jour: fevrier 2026",
    intro:
      "PaceFrame respecte votre vie privee et protege vos donnees personnelles.",
    sections: [
      {
        title: "1. Informations collectees",
        paragraphs: [
          "Quand vous connectez votre compte, PaceFrame accede a des donnees d'activite limitees.",
          "PaceFrame ne collecte pas vos mots de passe, messages prives, contacts ou donnees non necessaires.",
        ],
        bullets: [
          "Distance",
          "Duree et temps en mouvement",
          "Allure et vitesse",
          "Denivele positif",
          "Date de l'activite",
          "Carte de l'activite (polyline)",
        ],
      },
      {
        title: "2. Utilisation des donnees",
        paragraphs: [
          "Les donnees servent uniquement a generer des resumes visuels, des images partageables et des statistiques dans l'app.",
          "PaceFrame est en lecture seule et n'ecrit pas dans votre compte source.",
        ],
      },
      {
        title: "3. Stockage des donnees",
        paragraphs: [
          "Nous pouvons stocker des metadonnees limitees pour le rendu visuel et l'experience utilisateur.",
          "Vous pouvez revoquer l'acces a tout moment depuis les parametres du compte.",
        ],
        bullets: [
          "Aucun identifiant de connexion stocke",
          "Aucun stockage de token au-dela du besoin API",
          "Aucune donnee personnelle sensible stockee",
        ],
      },
      {
        title: "4. Partage des donnees",
        paragraphs: [
          "PaceFrame ne vend, ne loue et ne partage pas les donnees utilisateurs avec des tiers.",
        ],
        bullets: [
          "Traitement uniquement dans l'infrastructure de l'app",
          "Utilisation uniquement pour les visuels demandes",
        ],
      },
      {
        title: "5. Controle utilisateur",
        bullets: [
          "Deconnexion du compte a tout moment",
          "Suppression de contenu genere",
          "Demande de suppression des donnees",
        ],
      },
      {
        title: "6. Securite",
        paragraphs: [
          "Nous mettons en place des mesures techniques et organisationnelles raisonnables.",
        ],
      },
      {
        title: "7. Services tiers",
        bullets: ["Service integre: API Strava"],
        paragraphs: ["L'utilisation respecte l'accord API Strava."],
      },
      {
        title: "8. Protection des mineurs",
        paragraphs: ["PaceFrame n'est pas destine aux enfants de moins de 13 ans."],
      },
      {
        title: "9. Modifications",
        paragraphs: [
          "Cette politique peut evoluer. Les changements sont publies sur cette page.",
        ],
      },
      {
        title: "10. Contact",
      },
    ],
    footnote: "PaceFrame n'est pas affilie ni endorse par Strava.",
    contactLead: "Pour toute question vie privee:",
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

export default async function PrivacyPolicyPage({ params }: PageProps) {
  const { locale: rawLocale } = await params;

  if (!isLocale(rawLocale)) {
    redirect("/en/privacy-policy");
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
                {t.contactLead} {" "}
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

        <p className="text-sm text-gray-300">{t.footnote}</p>
    </div>
  );
}
