import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { getAuthSession } from "@/lib/auth";
import { buildLoginRedirect } from "@/lib/auth-navigation";
import { renderGuidedQuestion } from "@/lib/ai";
import {
  getCurrentStepDefinition,
  getDiagnosticRail,
  type InterviewState,
} from "@/lib/diagnostic-engine";
import { getInterviewSessionForUser, submitInterviewAnswer } from "@/lib/interviews";

function normalizeState(value: unknown): InterviewState {
  return value as InterviewState;
}

export default async function InterviewPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;
  const session = await getAuthSession();

  if (!session?.user?.id) {
    redirect(buildLoginRedirect(`/interview/${sessionId}`));
  }

  const interview = await getInterviewSessionForUser(session.user.id, sessionId);

  if (!interview) {
    notFound();
  }

  if (interview.status === "COMPLETED") {
    redirect(`/history/${interview.id}`);
  }

  const state = normalizeState(interview.state);
  const rail = getDiagnosticRail(state.railKey);
  const currentStep = getCurrentStepDefinition(state);
  const question =
    [...interview.messages]
      .reverse()
      .find((message) => message.role === "ASSISTANT")?.content ||
    renderGuidedQuestion(currentStep.prompt(state), state);
  const progressIndex = rail.stepOrder.indexOf(state.currentStep);

  async function submitAnswerAction(formData: FormData) {
    "use server";

    const currentSession = await getAuthSession();

    if (!currentSession?.user?.id) {
      redirect(buildLoginRedirect(`/interview/${sessionId}`));
    }

    const answer = String(formData.get("answer") || "").trim();

    if (!answer) {
      redirect(`/interview/${sessionId}?error=empty`);
    }

    const result = await submitInterviewAnswer({
      userId: currentSession.user.id,
      sessionId,
      answer,
    });

    if (result.status === "completed") {
      redirect(`/history/${sessionId}`);
    }

    redirect(`/interview/${sessionId}`);
  }

  return (
    <main className="flex flex-1 flex-col gap-5 pb-8 pt-4">
      <div className="flex items-center justify-between gap-4">
        <Link href="/" className="text-sm font-medium text-[var(--color-accent)]">
          Exit interview
        </Link>
        <span className="text-sm text-[var(--color-text-muted)]">
          Step {progressIndex + 1} of 7
        </span>
      </div>

      <section className="app-card flex flex-col gap-3 p-6">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--color-accent)]">
          Issue context
        </p>
        <div className="flex flex-wrap gap-3 text-sm text-[var(--color-text-muted)]">
          <span className="rounded-full bg-[var(--color-surface-strong)] px-3 py-2">
            {rail.interviewContextLabel}
          </span>
          {interview.storeName ? (
            <span className="rounded-full bg-[var(--color-surface-strong)] px-3 py-2">
              {interview.storeName}
            </span>
          ) : null}
          {interview.roleName ? (
            <span className="rounded-full bg-[var(--color-surface-strong)] px-3 py-2">
              {interview.roleName}
            </span>
          ) : null}
          <span className="rounded-full bg-[var(--color-surface-strong)] px-3 py-2">
            Focused diagnosis in progress
          </span>
        </div>
      </section>

      <section className="app-card flex flex-col gap-5 p-6 sm:p-8">
        <div className="space-y-3">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--color-accent)]">
            Current guided question
          </p>
          <h1 className="display-title text-3xl font-semibold tracking-tight sm:text-4xl">
            {question}
          </h1>
          <p className="muted max-w-2xl text-sm leading-6">
            Keep it concrete. Name the pattern, the timing, or the team behavior
            that makes the issue real.
          </p>
        </div>

        <form action={submitAnswerAction} className="flex flex-col gap-4">
          <label className="space-y-2 text-sm font-medium" htmlFor="answer">
            Your answer
            <textarea
              id="answer"
              name="answer"
              required
              rows={6}
              placeholder="Example: We usually run short on fast-moving weekend items because the Friday handoff happens too late."
              className="min-h-44 w-full rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface-strong)] px-4 py-4 text-base leading-7"
            />
          </label>

          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-[var(--color-text-muted)]">
              The app will keep narrowing the issue until it reaches a diagnosis.
            </p>
            <button
              type="submit"
              className="min-h-11 rounded-[var(--radius-md)] bg-[var(--color-accent)] px-4 text-sm font-semibold text-[var(--color-accent-foreground)]"
            >
              Continue diagnosis
            </button>
          </div>
        </form>
      </section>

      <section className="app-card flex flex-col gap-4 p-6">
        <h2 className="display-title text-2xl font-semibold">
          Prior checkpoints
        </h2>
        <ul className="grid gap-3">
          {interview.messages.slice(-4).map((message) => (
            <li
              key={message.id}
              className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-strong)] p-4"
            >
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-text-muted)]">
                {message.role.toLowerCase()}
              </p>
              <p className="mt-2 text-sm leading-6">{message.content}</p>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
