import { redirect } from "next/navigation";

import { getAuthSession } from "@/lib/auth";
import { LoginForm } from "./login-form";

export default async function LoginPage() {
  const session = await getAuthSession();

  if (session?.user) {
    redirect("/");
  }

  return (
    <main className="flex flex-1 items-center justify-center py-10">
      <div className="grid w-full max-w-4xl gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="app-card flex flex-col justify-between gap-6 p-6 sm:p-8">
          <div className="space-y-4">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[var(--color-accent)]">
              Guided Pain Discovery
            </p>
            <h2 className="display-title text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
              Turn fuzzy inventory complaints into a diagnosis your team can act on.
            </h2>
            <p className="muted max-w-xl text-base leading-7">
              Store managers usually know something is off before they know what
              to call it. This workflow helps them turn a vague issue into a
              structured problem statement with a next action.
            </p>
          </div>

          <div className="grid gap-3 text-sm sm:grid-cols-3">
            <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-strong)] p-4">
              Clarify the issue
            </div>
            <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-strong)] p-4">
              Keep the draft
            </div>
            <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-strong)] p-4">
              Return to the diagnosis
            </div>
          </div>
        </section>

        <LoginForm />
      </div>
    </main>
  );
}
