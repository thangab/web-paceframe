import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "Read the PaceFrame Privacy Policy and learn how we collect, use, and protect Strava activity data.",
};

export default function PrivacyPolicyPage() {
  return (
    <main className="min-h-screen bg-gray-900 px-6 py-16 text-white">
      <div className="mx-auto w-full max-w-3xl space-y-8">
        <header className="space-y-2">
          <h1 className="text-4xl font-bold">Privacy Policy</h1>
          <p className="text-sm text-gray-300">Last updated: February 2026</p>
        </header>

        <p>
          PaceFrame (“the App”) respects your privacy and is committed to
          protecting your personal data. This Privacy Policy explains how we
          collect, use, and safeguard information when you use PaceFrame.
        </p>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">1. Information We Collect</h2>
          <p>
            When you connect your Strava account, PaceFrame accesses limited
            activity data via the Strava API, including:
          </p>
          <ul className="list-disc space-y-1 pl-6">
            <li>Activity distance</li>
            <li>Duration and moving time</li>
            <li>Pace and speed</li>
            <li>Elevation gain</li>
            <li>Activity date</li>
            <li>Activity map (polyline)</li>
          </ul>
          <p>PaceFrame does <strong>not</strong> collect or access:</p>
          <ul className="list-disc space-y-1 pl-6">
            <li>Passwords</li>
            <li>Private messages</li>
            <li>Contacts</li>
            <li>Payment data from Strava</li>
            <li>Any data not required for the app&apos;s functionality</li>
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">2. How We Use Strava Data</h2>
          <p>Strava activity data is used solely to:</p>
          <ul className="list-disc space-y-1 pl-6">
            <li>Generate visual summaries of activities</li>
            <li>Create shareable images requested by the user</li>
            <li>Display activity statistics inside the app</li>
          </ul>
          <p>
            PaceFrame is a read-only integration with Strava. The App does not
            modify, upload, or write any data back to Strava.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">3. Data Storage</h2>
          <p>
            PaceFrame may store limited activity metadata necessary for
            generating visuals and improving user experience.
          </p>
          <p>We do not store:</p>
          <ul className="list-disc space-y-1 pl-6">
            <li>Strava login credentials</li>
            <li>Tokens beyond what is required for API access</li>
            <li>Sensitive personal data</li>
          </ul>
          <p>
            Users may revoke Strava access at any time via their Strava account
            settings.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">4. Data Sharing</h2>
          <p>
            PaceFrame does not sell, rent, or share Strava user data with third
            parties.
          </p>
          <p>Data is only:</p>
          <ul className="list-disc space-y-1 pl-6">
            <li>Processed within the app infrastructure</li>
            <li>Used to generate user-requested visuals</li>
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">5. User Control</h2>
          <p>Users can:</p>
          <ul className="list-disc space-y-1 pl-6">
            <li>Disconnect Strava at any time</li>
            <li>Delete generated content</li>
            <li>Request data deletion</li>
          </ul>
          <p>
            To request deletion: {" "}
            <a
              href="mailto:contact@paceframe.app"
              className="underline decoration-gray-300 underline-offset-4"
            >
              contact@paceframe.app
            </a>
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">6. Security</h2>
          <p>
            We implement reasonable technical and organizational safeguards to
            protect data against unauthorized access, loss, or misuse.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">7. Third-Party Services</h2>
          <p>PaceFrame integrates with:</p>
          <ul className="list-disc space-y-1 pl-6">
            <li>Strava API</li>
          </ul>
          <p>
            All Strava data usage complies with the Strava API Agreement.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">8. Children&apos;s Privacy</h2>
          <p>PaceFrame is not intended for children under 13.</p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">9. Changes</h2>
          <p>
            We may update this policy. Updates will be posted on this page with
            a revised date.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">10. Contact</h2>
          <p>For privacy questions:</p>
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

        <p className="text-sm text-gray-300">
          PaceFrame is not affiliated with or endorsed by Strava.
        </p>
      </div>
    </main>
  );
}
