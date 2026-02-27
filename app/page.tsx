import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Coming Soon",
  description:
    "PaceFrame is coming soon. We are building a better way to turn Strava activities into shareable visuals.",
};

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center">
      <h1 className="text-5xl text-white font-bold mb-8 animate-pulse">
        Coming Soon
      </h1>
      <p className="text-white text-lg mb-8">
        We&apos;re working hard to bring you something amazing. Stay tuned!
      </p>
      <div className="mb-4 flex items-center gap-6 text-sm text-gray-200">
        <Link href="/privacy-policy" className="underline underline-offset-4">
          Privacy Policy
        </Link>
        <Link href="/terms" className="underline underline-offset-4">
          Terms of Service
        </Link>
      </div>
      <a
        href="mailto:contact@paceframe.app"
        className="text-sm text-gray-300 underline underline-offset-4"
      >
        contact@paceframe.app
      </a>
    </div>
  );
}
