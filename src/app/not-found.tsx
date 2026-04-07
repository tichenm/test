import Link from "next/link";

import { getAuthSession } from "@/lib/auth";

export default async function NotFoundPage() {
  const session = await getAuthSession();
  const primaryHref = session?.user ? "/" : "/login";
  const primaryLabel = session?.user ? "Go to workbench" : "Sign in";

  return (
    <main className="flex flex-1 items-center justify-center py-10">
      <section className="app-card flex w-full max-w-3xl flex-col gap-6 p-6 sm:p-8">
        <div className="space-y-3">
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[var(--color-accent)]">
            Page not found
          </p>
          <h1 className="display-title text-4xl font-semibold tracking-tight sm:text-5xl">
            This path does not lead to a saved diagnosis.
          </h1>
          <p className="muted max-w-2xl text-base leading-7">
            The link may be old, incomplete, or already moved. Return to the
            workbench to start a new guided review, or open history if you were
            looking for a previous diagnosis.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-strong)] p-4 text-sm leading-6">
            Check the URL if someone pasted it into chat or email.
          </div>
          <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-strong)] p-4 text-sm leading-6">
            Open history to find completed diagnoses that still exist.
          </div>
          <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-strong)] p-4 text-sm leading-6">
            Start fresh if you meant to capture a new frontline issue.
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link
            href={primaryHref}
            className="inline-flex min-h-11 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-accent)] px-4 text-sm font-semibold text-[var(--color-accent-foreground)]"
          >
            {primaryLabel}
          </Link>
          <Link
            href="/history"
            className="inline-flex min-h-11 items-center justify-center rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-strong)] px-4 text-sm font-medium"
          >
            Open history
          </Link>
          <Link
            href="/insights"
            className="inline-flex min-h-11 items-center justify-center rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-strong)] px-4 text-sm font-medium"
          >
            Review insights
          </Link>
        </div>
      </section>
    </main>
  );
}
