"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">(
    "idle",
  );
  const [message, setMessage] = useState("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setStatus("sending");
    setMessage("");

    const result = await signIn("email", {
      email,
      redirect: false,
      callbackUrl: "/",
    });

    if (result?.error) {
      setStatus("error");
      setMessage("We could not send the sign-in link. Try again.");
      return;
    }

    setStatus("sent");
    setMessage("Your sign-in link is on the way. Check your inbox or local dev logs.");
  }

  return (
    <form className="app-card flex flex-col gap-5 p-6" onSubmit={handleSubmit}>
      <div className="space-y-2">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--color-accent)]">
          Email sign-in
        </p>
        <h1 className="display-title text-3xl font-semibold tracking-tight">
          Pick up where your last diagnosis left off.
        </h1>
        <p className="muted text-sm leading-6">
          Enter your work email. We will send a magic link so you can return to
          active drafts and past diagnoses.
        </p>
      </div>

      <label className="space-y-2 text-sm font-medium" htmlFor="email">
        Work email
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="min-h-11 w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-strong)] px-4 text-base"
          placeholder="manager@store.com"
        />
      </label>

      <button
        type="submit"
        disabled={status === "sending"}
        className="min-h-11 rounded-[var(--radius-md)] bg-[var(--color-accent)] px-4 font-semibold text-[var(--color-accent-foreground)] disabled:opacity-70"
      >
        {status === "sending" ? "Sending sign-in link..." : "Send sign-in link"}
      </button>

      {message ? (
        <p
          className={`text-sm ${
            status === "error" ? "text-[var(--color-error)]" : "text-[var(--color-success)]"
          }`}
        >
          {message}
        </p>
      ) : null}
    </form>
  );
}
