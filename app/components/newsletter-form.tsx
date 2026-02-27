"use client";

import { FormEvent, useState } from "react";

type SubmitState = "idle" | "loading" | "success" | "error";
type Locale = "en" | "fr";

type NewsletterFormProps = {
  locale: Locale;
};

const copy: Record<
  Locale,
  {
    placeholder: string;
    submit: string;
    loading: string;
    genericError: string;
    fallbackSuccess: string;
  }
> = {
  en: {
    placeholder: "you@email.com",
    submit: "Notify me",
    loading: "Sending...",
    genericError: "Something went wrong.",
    fallbackSuccess: "Thanks, you're on the waitlist.",
  },
  fr: {
    placeholder: "ton@email.com",
    submit: "Me notifier",
    loading: "Envoi...",
    genericError: "Une erreur est survenue.",
    fallbackSuccess: "Merci, vous êtes bien inscrit.",
  },
};

export default function NewsletterForm({ locale }: NewsletterFormProps) {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<SubmitState>("idle");
  const [message, setMessage] = useState("");
  const t = copy[locale];

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState("loading");
    setMessage("");

    try {
      const response = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const payload = (await response.json()) as { message?: string };

      if (!response.ok) {
        throw new Error(locale === "fr" ? t.genericError : (payload.message ?? t.genericError));
      }

      setState("success");
      setMessage(locale === "fr" ? t.fallbackSuccess : (payload.message ?? t.fallbackSuccess));
      setEmail("");
    } catch (error) {
      setState("error");
      setMessage(error instanceof Error ? error.message : t.genericError);
    }
  }

  return (
    <form onSubmit={onSubmit} className="w-full max-w-xl space-y-3">
      <label htmlFor="newsletter-email" className="sr-only">
        Email
      </label>
      <div className="flex flex-col gap-3 sm:flex-row">
        <input
          id="newsletter-email"
          type="email"
          required
          autoComplete="email"
          placeholder={t.placeholder}
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="h-12 w-full rounded-xl border border-white/20 bg-[#0E1527] px-4 text-sm text-white placeholder:text-white/40 outline-none transition focus:border-[#D4FF54]/70"
        />
        <button
          type="submit"
          disabled={state === "loading"}
          className="inline-flex h-12 items-center justify-center rounded-xl bg-[#D4FF54] px-6 text-sm font-bold tracking-wide text-[#131B2E] uppercase transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {state === "loading" ? t.loading : t.submit}
        </button>
      </div>
      {message ? (
        <p
          className={`text-sm ${
            state === "success" ? "text-[#D4FF54]" : "text-red-300"
          }`}
        >
          {message}
        </p>
      ) : null}
    </form>
  );
}
