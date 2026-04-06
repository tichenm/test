import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { getAuthSession } from "@/lib/auth";
import {
  getDiagnosisReviewStatusLabel,
  getInterviewRailLabel,
} from "@/lib/interview-presenters";
import {
  getInterviewSessionForUser,
  updateDiagnosisFollowUpForUser,
} from "@/lib/interviews";

export default async function DiagnosisDetailPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const session = await getAuthSession();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const { sessionId } = await params;
  const interview = await getInterviewSessionForUser(session.user.id, sessionId);

  if (!interview) {
    notFound();
  }

  if (interview.status !== "COMPLETED" || !interview.diagnosisRecord) {
    redirect(`/interview/${interview.id}`);
  }

  const diagnosis = interview.diagnosisRecord;

  async function saveFollowUpAction(formData: FormData) {
    "use server";

    const currentSession = await getAuthSession();

    if (!currentSession?.user?.id) {
      redirect("/login");
    }

    await updateDiagnosisFollowUpForUser({
      userId: currentSession.user.id,
      sessionId,
      reviewStatus: String(formData.get("reviewStatus") || "new"),
      ownerName: String(formData.get("ownerName") || ""),
      reviewNote: String(formData.get("reviewNote") || ""),
    });

    redirect(`/history/${sessionId}`);
  }

  return (
    <main className="flex flex-1 flex-col gap-5 pb-8 pt-4">
      <Link href="/history" className="text-sm font-medium text-[var(--color-accent)]">
        Back to history
      </Link>

      <section className="app-card flex flex-col gap-4 p-6">
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--color-accent)]">
            Core diagnosis
          </p>
          <span className="rounded-full bg-[var(--color-surface-strong)] px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-text-muted)]">
            {getInterviewRailLabel(interview.railKey)}
          </span>
          {interview.storeName ? (
            <span className="rounded-full bg-[var(--color-surface-strong)] px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-text-muted)]">
              {interview.storeName}
            </span>
          ) : null}
          {interview.roleName ? (
            <span className="rounded-full bg-[var(--color-surface-strong)] px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-text-muted)]">
              {interview.roleName}
            </span>
          ) : null}
        </div>
        <h1 className="display-title text-3xl font-semibold tracking-tight sm:text-4xl">
          {diagnosis.likelyRootCause}
        </h1>
        <div className="flex flex-wrap gap-3 text-sm">
          <span className="rounded-full bg-[var(--color-surface-strong)] px-3 py-2">
            Severity: {diagnosis.severity}
          </span>
          <span className="rounded-full bg-[var(--color-surface-strong)] px-3 py-2">
            Follow-up: {getDiagnosisReviewStatusLabel(diagnosis.reviewStatus)}
          </span>
          <span className="rounded-full bg-[var(--color-surface-strong)] px-3 py-2">
            Action: {diagnosis.nextAction}
          </span>
        </div>
      </section>

      <section className="app-card grid gap-3 p-6 sm:grid-cols-2">
        <Detail label="Pain type" value={diagnosis.painType} />
        <Detail label="Frequency" value={diagnosis.frequency} />
        <Detail label="Time window" value={diagnosis.timeWindow} />
        <Detail label="Affected scope" value={diagnosis.affectedScope} />
        <Detail label="People involved" value={diagnosis.peopleInvolved} />
        <Detail label="Current workaround" value={diagnosis.currentWorkaround} />
      </section>

      <section className="app-card flex flex-col gap-3 p-6">
        <h2 className="display-title text-2xl font-semibold">Plain-language summary</h2>
        <p className="muted leading-7">{diagnosis.aiSummary}</p>
      </section>

      <section className="app-card flex flex-col gap-4 p-6">
        <div className="space-y-1">
          <h2 className="display-title text-2xl font-semibold">Management follow-up</h2>
          <p className="muted text-sm leading-6">
            Assign an owner and move this diagnosis through review, acceptance, and resolution.
          </p>
        </div>

        <form action={saveFollowUpAction} className="grid gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-2 text-sm font-medium">
              Follow-up status
              <select
                name="reviewStatus"
                defaultValue={diagnosis.reviewStatus}
                className="min-h-11 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-strong)] px-4"
              >
                <option value="new">New</option>
                <option value="reviewing">Reviewing</option>
                <option value="accepted">Accepted</option>
                <option value="resolved">Resolved</option>
              </select>
            </label>

            <label className="grid gap-2 text-sm font-medium">
              Owner
              <input
                name="ownerName"
                defaultValue={diagnosis.ownerName ?? ""}
                placeholder="Ops lead, site manager, project owner"
                className="min-h-11 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-strong)] px-4"
              />
            </label>
          </div>

          <label className="grid gap-2 text-sm font-medium">
            Review note
            <textarea
              name="reviewNote"
              defaultValue={diagnosis.reviewNote ?? ""}
              rows={4}
              placeholder="What is being checked, what decision was made, or what remains blocked?"
              className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-strong)] px-4 py-3 leading-6"
            />
          </label>

          <div className="flex items-center justify-between gap-3">
            <div className="text-sm text-[var(--color-text-muted)]">
              <p>Current owner: {diagnosis.ownerName || "Unassigned"}</p>
              <p>Latest note: {diagnosis.reviewNote || "No follow-up note yet."}</p>
            </div>
            <button
              type="submit"
              className="min-h-11 rounded-[var(--radius-md)] bg-[var(--color-accent)] px-4 text-sm font-semibold text-[var(--color-accent-foreground)]"
            >
              Save follow-up
            </button>
          </div>
        </form>
      </section>

      <section className="app-card flex flex-col gap-4 p-6">
        <h2 className="display-title text-2xl font-semibold">Conversation transcript</h2>
        <ul className="grid gap-3">
          {interview.messages.map((message) => (
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

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-strong)] p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-text-muted)]">
        {label}
      </p>
      <p className="mt-2 text-sm leading-6">{value}</p>
    </div>
  );
}
