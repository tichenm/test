import Link from "next/link";
import { redirect } from "next/navigation";

import { SignOutButton } from "@/app/account/sign-out-button";
import { getAuthSession } from "@/lib/auth";
import { buildLoginRedirect } from "@/lib/auth-navigation";

function formatTimestamp(value: Date) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(value);
}

export default async function AccountPage() {
  const session = await getAuthSession();

  if (!session?.user?.id) {
    redirect(buildLoginRedirect("/account"));
  }

  return (
    <main className="flex flex-1 flex-col gap-5 pb-8 pt-4">
      <section className="space-y-2">
        <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[var(--color-accent)]">
          Account
        </p>
        <h1 className="display-title text-4xl font-semibold tracking-tight">
          Manage your session
        </h1>
        <p className="muted max-w-2xl text-sm leading-6">
          Check which email is active, return to the diagnosis workspace, or sign out cleanly.
        </p>
      </section>

      <section className="app-card flex flex-col gap-4 p-6">
        <div className="space-y-1">
          <h2 className="display-title text-2xl font-semibold">Signed-in identity</h2>
          <p className="muted text-sm leading-6">
            This app uses magic-link sign-in, so the active email is the main account context.
          </p>
        </div>

        <dl className="grid gap-3 sm:grid-cols-2">
          <AccountField label="Email" value={session.user.email ?? "Not available"} />
          <AccountField
            label="Last checked"
            value={formatTimestamp(new Date())}
          />
        </dl>
      </section>

      <section className="app-card flex flex-col gap-4 p-6">
        <div className="space-y-1">
          <h2 className="display-title text-2xl font-semibold">Session actions</h2>
          <p className="muted text-sm leading-6">
            Use these shortcuts to jump back into diagnosis work or to end the current session.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link
            href="/"
            className="inline-flex min-h-11 items-center justify-center rounded-[var(--radius-md)] border border-[var(--color-border)] px-4 text-sm font-medium"
          >
            Open workbench
          </Link>
          <Link
            href="/history"
            className="inline-flex min-h-11 items-center justify-center rounded-[var(--radius-md)] border border-[var(--color-border)] px-4 text-sm font-medium"
          >
            Review history
          </Link>
          <SignOutButton />
        </div>
      </section>
    </main>
  );
}

function AccountField({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-strong)] p-4">
      <dt className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-text-muted)]">
        {label}
      </dt>
      <dd className="mt-2 text-sm leading-6">{value}</dd>
    </div>
  );
}
