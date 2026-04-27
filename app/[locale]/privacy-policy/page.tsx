import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { isLocale, locales, type Locale } from '../../i18n';

type PageProps = {
  params: Promise<{ locale: string }>;
};

const siteUrl = 'https://paceframe.app';

type Section = {
  id?: string;
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
    metaTitle: 'Privacy Policy',
    metaDescription:
      'Read the PaceFrame Privacy Policy and learn how we collect, use, and protect activity data.',
    pageTitle: 'Privacy Policy',
    updatedAt: 'Last updated: April 2026',
    intro:
      'PaceFrame (the App) respects your privacy and is committed to protecting your personal data.',
    sections: [
      {
        title: '1. Information We Collect',
        paragraphs: [
          'When you connect your account, PaceFrame accesses limited activity data from supported integrations only after you authorize access.',
          'PaceFrame does not collect passwords, private messages, contacts, or unrelated data.',
        ],
        bullets: [
          'Activity distance',
          'Duration and moving time',
          'Pace and speed',
          'Elevation gain',
          'Activity date',
          'Activity map or route data, such as polyline data when available',
          'Heart rate, cadence, calories, and other activity metrics when made available by the connected provider and authorized by the user',
        ],
      },
      {
        title: '2. How We Use Data',
        paragraphs: [
          'Data is used only to generate visual summaries, shareable images requested by users, and in-app stats display.',
          'PaceFrame is a read-only integration and does not write data back to your connected activity accounts unless a specific API feature explicitly requires user-authorized transfer.',
          'Activity data is never used for advertising, profiling, resale, or unrelated analytics.',
        ],
      },
      {
        title: '3. Data Storage',
        paragraphs: [
          'We may store limited activity metadata required for visuals, account connection, export history, and user experience.',
          'Garmin data is stored only as necessary to provide the service and is not retained longer than required.',
          'Users can revoke account access at any time from account settings.',
        ],
        bullets: [
          'No login credentials are stored',
          'No excess token storage beyond API needs',
          'No sensitive personal data storage beyond data explicitly authorized by the user through a connected provider',
        ],
      },
      {
        title: '4. Data Sharing',
        paragraphs: [
          'PaceFrame does not sell, rent, or share user data with third parties.',
          'Activity data is processed only within PaceFrame-controlled infrastructure and only for features requested by the user.',
        ],
        bullets: [
          'No sale of user data',
          'No sharing of activity data for advertising',
          'No sharing of activity data with external AI providers',
          'No sharing of Garmin data with third-party data processing services',
          'Used only for requested visual generation and in-app activity display',
        ],
      },
      {
        id: 'garmin-data',
        title: '4.1 Garmin Data Usage',
        paragraphs: [
          'Data obtained from Garmin Connect is processed strictly within PaceFrame-controlled infrastructure.',
          'PaceFrame does not share, transmit, or process Garmin data with external AI providers, third-party AI services, or third-party data processing services.',
          'Garmin data is used exclusively to display user-authorized activity data inside the app and to generate user-requested visual content.',
          'Garmin data is never used for machine learning training, AI processing, advertising, profiling, resale, or any purpose unrelated to the PaceFrame features requested by the user.',
          'Any future change to this Privacy Policy that affects Garmin data usage will be submitted to the Garmin Connect Developer Program team for written approval before implementation.',
        ],
      },
      {
        title: '5. User Control',
        bullets: [
          'Disconnect a connected account at any time',
          'Delete generated content',
          'Request data deletion by contacting PaceFrame',
          'When a user disconnects Garmin, all associated Garmin data is deleted from PaceFrame systems within a reasonable timeframe, unless retention is required by law or for security purposes',
        ],
      },
      {
        title: '6. Security',
        paragraphs: [
          'We implement reasonable technical and organizational safeguards to protect user data.',
          'Access tokens and integration data are handled with security controls designed to prevent unauthorized access.',
        ],
      },
      {
        title: '7. Third-Party Services',
        paragraphs: [
          'PaceFrame integrates with official APIs to access user-authorized activity data.',
          "All integrations are used only with user authorization and in accordance with each provider's applicable terms.",
          'PaceFrame is not affiliated with or endorsed by Strava or Garmin.',
        ],
        bullets: ['Strava API', 'Garmin Connect API'],
      },
      {
        title: "8. Children's Privacy",
        paragraphs: ['PaceFrame is not intended for children under 13.'],
      },
      {
        title: '9. Changes',
        paragraphs: [
          'We may update this policy. Updates are posted on this page with a revised date.',
          'Any future changes to this Privacy Policy in relation to Garmin data will be submitted to the Garmin Connect Developer Program team and require written approval before implementation.',
        ],
      },
      {
        title: '10. Contact',
      },
    ],
    footnote:
      'PaceFrame is not affiliated with or endorsed by Strava or Garmin.',
    contactLead: 'For privacy questions:',
  },
  fr: {
    metaTitle: 'Politique de confidentialité',
    metaDescription:
      'Consultez la politique de confidentialité de PaceFrame et la gestion de vos données.',
    pageTitle: 'Politique de confidentialité',
    updatedAt: 'Dernière mise à jour: avril 2026',
    intro:
      'PaceFrame respecte votre vie privée et protège vos données personnelles.',
    sections: [
      {
        title: '1. Informations collectées',
        paragraphs: [
          "Quand vous connectez votre compte, PaceFrame accède à des données d'activité limitées depuis les intégrations supportées uniquement après votre autorisation.",
          'PaceFrame ne collecte pas vos mots de passe, messages privés, contacts ou données non nécessaires.',
        ],
        bullets: [
          'Distance',
          'Durée et temps en mouvement',
          'Allure et vitesse',
          'Dénivelé positif',
          "Date de l'activité",
          "Carte ou données de parcours, comme la polyline lorsqu'elle est disponible",
          "Fréquence cardiaque, cadence, calories et autres métriques d'activité lorsque le fournisseur connecté les rend disponibles et que l'utilisateur les autorise",
        ],
      },
      {
        title: '2. Utilisation des données',
        paragraphs: [
          "Les données servent uniquement à générer des résumés visuels, des images partageables demandées par l'utilisateur et des statistiques dans l'app.",
          "PaceFrame est une intégration en lecture seule et n'écrit pas dans vos comptes d'activité connectés, sauf si une fonctionnalité API spécifique nécessite un transfert explicitement autorisé par l'utilisateur.",
          "Les données d'activité ne sont jamais utilisées pour la publicité, le profilage, la revente ou des analyses sans rapport avec le service.",
        ],
      },
      {
        title: '3. Stockage des données',
        paragraphs: [
          "Nous pouvons stocker des métadonnées d'activité limitées nécessaires au rendu visuel, à la connexion du compte, à l'historique d'export et à l'expérience utilisateur.",
          'Les données Garmin sont stockées uniquement lorsque cela est nécessaire pour fournir le service et ne sont pas conservées plus longtemps que nécessaire.',
          "Vous pouvez révoquer l'accès à tout moment depuis les paramètres du compte.",
        ],
        bullets: [
          'Aucun identifiant de connexion stocké',
          'Aucun stockage de token au-delà du besoin API',
          "Aucune donnée personnelle sensible stockée au-delà des données explicitement autorisées par l'utilisateur via un fournisseur connecté",
        ],
      },
      {
        title: '4. Partage des données',
        paragraphs: [
          'PaceFrame ne vend, ne loue et ne partage pas les données utilisateurs avec des tiers.',
          "Les données d'activité sont traitées uniquement dans l'infrastructure contrôlée par PaceFrame et seulement pour les fonctionnalités demandées par l'utilisateur.",
        ],
        bullets: [
          'Aucune vente de données utilisateur',
          "Aucun partage de données d'activité pour la publicité",
          "Aucun partage de données d'activité avec des fournisseurs d'IA externes",
          'Aucun partage de données Garmin avec des services tiers de traitement de données',
          "Utilisation uniquement pour la génération de visuels demandés et l'affichage des activités dans l'app",
        ],
      },
      {
        id: 'garmin-data',
        title: '4.1 Utilisation des données Garmin',
        paragraphs: [
          "Les données obtenues depuis Garmin Connect sont traitées strictement dans l'infrastructure contrôlée par PaceFrame.",
          "PaceFrame ne partage pas, ne transmet pas et ne traite pas les données Garmin avec des fournisseurs d'IA externes, des services d'IA tiers ou des services tiers de traitement de données.",
          "Les données Garmin sont utilisées exclusivement pour afficher les données d'activité autorisées par l'utilisateur dans l'app et pour générer le contenu visuel demandé par l'utilisateur.",
          "Les données Garmin ne sont jamais utilisées pour l'entraînement de modèles de machine learning, le traitement par IA, la publicité, le profilage, la revente ou tout usage sans rapport avec les fonctionnalités PaceFrame demandées par l'utilisateur.",
          "Toute future modification de cette politique de confidentialité affectant l'utilisation des données Garmin sera soumise à l'équipe Garmin Connect Developer Program pour approbation écrite avant implémentation.",
        ],
      },
      {
        title: '5. Contrôle utilisateur',
        bullets: [
          "Déconnexion d'un compte connecté à tout moment",
          'Suppression de contenu généré',
          'Demande de suppression des données en contactant PaceFrame',
          "Lorsqu'un utilisateur déconnecte Garmin, toutes les données Garmin associées sont supprimées des systèmes PaceFrame dans un délai raisonnable, sauf si une conservation est requise par la loi ou pour des raisons de sécurité",
        ],
      },
      {
        title: '6. Sécurité',
        paragraphs: [
          'Nous mettons en place des mesures techniques et organisationnelles raisonnables pour protéger les données utilisateur.',
          "Les tokens d'accès et les données d'intégration sont gérés avec des contrôles de sécurité conçus pour éviter tout accès non autorisé.",
        ],
      },
      {
        title: '7. Services tiers',
        paragraphs: [
          "PaceFrame s'intègre avec des API officielles afin d'accéder aux données d'activité autorisées par l'utilisateur.",
          "Toutes les intégrations sont utilisées uniquement avec l'autorisation de l'utilisateur et conformément aux conditions applicables de chaque fournisseur.",
          "PaceFrame n'est pas affilié ni endossé par Strava ou Garmin.",
        ],
        bullets: ['API Strava', 'API Garmin Connect'],
      },
      {
        title: '8. Protection des mineurs',
        paragraphs: [
          "PaceFrame n'est pas destiné aux enfants de moins de 13 ans.",
        ],
      },
      {
        title: '9. Modifications',
        paragraphs: [
          'Cette politique peut évoluer. Les changements sont publiés sur cette page avec une date de mise à jour révisée.',
          "Toute future modification de cette politique de confidentialité concernant les données Garmin sera soumise à l'équipe Garmin Connect Developer Program et nécessitera une approbation écrite avant implémentation.",
        ],
      },
      {
        title: '10. Contact',
      },
    ],
    footnote: "PaceFrame n'est pas affilié ni endossé par Strava ou Garmin.",
    contactLead: 'Pour toute question sur la vie privée :',
  },
};

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { locale: rawLocale } = await params;
  const locale = isLocale(rawLocale) ? rawLocale : 'en';
  const t = copy[locale];
  const canonical =
    locale === 'en'
      ? `${siteUrl}/en/privacy-policy`
      : `${siteUrl}/fr/privacy-policy`;

  return {
    title: t.metaTitle,
    description: t.metaDescription,
    alternates: {
      canonical,
      languages: {
        en: `${siteUrl}/en/privacy-policy`,
        fr: `${siteUrl}/fr/privacy-policy`,
        'x-default': `${siteUrl}/en/privacy-policy`,
      },
    },
    openGraph: {
      type: 'article',
      url: canonical,
      title: t.metaTitle,
      description: t.metaDescription,
    },
    twitter: {
      card: 'summary',
      title: t.metaTitle,
      description: t.metaDescription,
    },
  };
}

export default async function PrivacyPolicyPage({ params }: PageProps) {
  const { locale: rawLocale } = await params;

  if (!isLocale(rawLocale)) {
    redirect('/en/privacy-policy');
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
        <section
          key={section.title}
          id={section.id}
          className="scroll-mt-24 space-y-4"
        >
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
          {section.title.includes('Contact') ? (
            <p>
              {t.contactLead}{' '}
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
