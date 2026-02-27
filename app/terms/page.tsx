import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service",
  description:
    "Read the PaceFrame Terms of Service for app usage, Strava integration, subscriptions, and legal conditions.",
};

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-gray-900 px-6 py-16 text-white">
      <div className="mx-auto w-full max-w-3xl space-y-8">
        <header className="space-y-2">
          <h1 className="text-4xl font-bold">Terms of Service</h1>
          <p className="text-sm text-gray-300">Last updated: February 2026</p>
        </header>

        <p>
          These Terms of Service (“Terms”) govern your use of the PaceFrame
          mobile application (“the App”) operated by PaceFrame (“we”, “us”, or
          “our”). By using the App, you agree to these Terms.
        </p>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">1. Description of Service</h2>
          <p>
            PaceFrame is a mobile application that allows users to connect their
            Strava account and generate visual summaries of their sports
            activities for personal and social sharing purposes.
          </p>
          <p>
            PaceFrame is an independent application and is not affiliated with,
            endorsed by, or sponsored by Strava.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">2. Eligibility</h2>
          <p>You must be at least 13 years old to use the App.</p>
          <p>
            By using PaceFrame, you represent that you have the legal capacity
            to enter into these Terms.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">3. Strava Integration</h2>
          <p>
            The App connects to your Strava account via the official Strava
            API.
          </p>
          <p>
            By connecting Strava, you authorize PaceFrame to access your
            activity data strictly for the purpose of generating visuals.
          </p>
          <p>PaceFrame:</p>
          <ul className="list-disc space-y-1 pl-6">
            <li>does not modify your Strava data</li>
            <li>does not post to Strava</li>
            <li>does not access unrelated data</li>
          </ul>
          <p>
            You may revoke access at any time via your Strava account settings.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">4. User Content</h2>
          <p>
            Generated images and visuals created using your activity data belong
            to you.
          </p>
          <p>
            You are responsible for how you use and share generated content.
          </p>
          <p>You agree not to use the App for unlawful or harmful purposes.</p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">5. Subscriptions and Payments</h2>
          <p>
            PaceFrame may offer optional premium features via in-app purchases.
          </p>
          <p>Subscriptions:</p>
          <ul className="list-disc space-y-1 pl-6">
            <li>renew automatically unless cancelled</li>
            <li>are managed via your Apple or Google account</li>
            <li>follow the store&apos;s billing policies</li>
          </ul>
          <p>
            Refunds are handled by Apple or Google according to their policies.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">6. Acceptable Use</h2>
          <p>You agree not to:</p>
          <ul className="list-disc space-y-1 pl-6">
            <li>misuse the Strava integration</li>
            <li>attempt to access other users&apos; data</li>
            <li>reverse engineer the App</li>
            <li>interfere with the App&apos;s operation</li>
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">7. Termination</h2>
          <p>We may suspend or terminate access if you violate these Terms.</p>
          <p>You may stop using the App at any time.</p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">8. Disclaimer</h2>
          <p>The App is provided “as is” without warranties of any kind.</p>
          <p>We do not guarantee uninterrupted or error-free operation.</p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">9. Limitation of Liability</h2>
          <p>
            To the maximum extent permitted by law, PaceFrame shall not be
            liable for indirect or consequential damages arising from use of the
            App.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">10. Changes to Terms</h2>
          <p>
            We may update these Terms. Continued use of the App constitutes
            acceptance of changes.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">11. Governing Law</h2>
          <p>These Terms are governed by the laws of France.</p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">12. Contact</h2>
          <p>
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
        </section>
      </div>
    </main>
  );
}
