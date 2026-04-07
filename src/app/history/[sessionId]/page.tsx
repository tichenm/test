import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { getAuthSession } from "@/lib/auth";
import { buildLoginRedirect } from "@/lib/auth-navigation";
import { buildDiagnosisHandoffBrief } from "@/lib/diagnosis-handoff";
import {
  getDiagnosisReviewStatusLabel,
  getInterviewRailLabel,
} from "@/lib/interview-presenters";
import {
  getInterviewSessionForUser,
  updateDiagnosisFollowUpForUser,
} from "@/lib/interviews";

type RecapDiagnosisFields = {
  frequency: string;
  timeWindow: string;
  affectedScope: string;
  operationalImpact: string;
  peopleInvolved: string;
  currentWorkaround: string;
};

function getRecapHeading(likelyRootCause: string) {
  const normalized = likelyRootCause.toLowerCase();

  if (normalized.includes("hq or system issue")) {
    return "This looks mostly upstream";
  }

  if (normalized.includes("store execution issue")) {
    return "This looks mostly like a store execution gap";
  }

  return "This looks like a split ownership problem";
}

function buildEvidenceCards(diagnosis: RecapDiagnosisFields) {
  return [
    {
      label: "Pattern",
      body: `This issue repeats ${diagnosis.frequency} and clusters around ${diagnosis.timeWindow}.`,
    },
    {
      label: "Where it shows up",
      body: `It is showing up around ${diagnosis.affectedScope} and the impact is ${diagnosis.operationalImpact}.`,
    },
    {
      label: "Workaround signal",
      body: `The strongest signal is around ${diagnosis.peopleInvolved}. Right now the team is compensating through ${diagnosis.currentWorkaround}.`,
    },
  ];
}

export default async function DiagnosisDetailPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;
  const session = await getAuthSession();

  if (!session?.user?.id) {
    redirect(buildLoginRedirect(`/history/${sessionId}`));
  }

  const interview = await getInterviewSessionForUser(session.user.id, sessionId);

  if (!interview) {
    notFound();
  }

  if (interview.status !== "COMPLETED" || !interview.diagnosisRecord) {
    redirect(`/interview/${interview.id}`);
  }

  const diagnosis = interview.diagnosisRecord;
  const completedInterview = {
    ...interview,
    diagnosisRecord: diagnosis,
  };
  const handoffBrief = buildDiagnosisHandoffBrief(completedInterview);
  const recapHeading = getRecapHeading(diagnosis.likelyRootCause);
  const evidenceCards = buildEvidenceCards(diagnosis);

  async function saveFollowUpAction(formData: FormData) {
    "use server";

    const currentSession = await getAuthSession();

    if (!currentSession?.user?.id) {
      redirect(buildLoginRedirect(`/history/${sessionId}`));
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
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--color-accent)]">
          What we think is happening
        </p>
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <span className="rounded-full bg-[var(--color-surface-strong)] px-3 py-2">
            {getInterviewRailLabel(interview.railKey)}
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
            Severity: {diagnosis.severity}
          </span>
          <span className="rounded-full bg-[var(--color-surface-strong)] px-3 py-2">
            Follow-up: {getDiagnosisReviewStatusLabel(diagnosis.reviewStatus)}
          </span>
        </div>
        <h1 className="display-title text-3xl font-semibold tracking-tight sm:text-4xl">
          {recapHeading}
        </h1>
        <p className="muted max-w-3xl leading-7">{diagnosis.likelyRootCause}</p>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <div className="app-card flex flex-col gap-4 p-6 lg:col-span-3">
          <div className="space-y-1">
            <h2 className="display-title text-2xl font-semibold">Why we think that</h2>
            <p className="muted text-sm leading-6">
              These are the signals that most strongly shaped the diagnosis.
            </p>
          </div>
        </div>

        {evidenceCards.map((card) => (
          <section key={card.label} className="app-card flex flex-col gap-3 p-6">
            <h3 className="display-title text-xl font-semibold">{card.label}</h3>
            <p className="muted text-sm leading-6">{card.body}</p>
          </section>
        ))}
      </section>

      <section className="app-card flex flex-col gap-3 p-6">
        <h2 className="display-title text-2xl font-semibold">What to do first</h2>
        <p className="text-base leading-7">{diagnosis.nextAction}</p>
        <p className="muted text-sm leading-6">
          Start here first. If this holds up, then expand into a broader fix.
        </p>
      </section>

      <section className="app-card flex flex-col gap-4 p-6">
        <div className="space-y-1">
          <h2 className="display-title text-2xl font-semibold">What the team is doing now</h2>
          <p className="muted text-sm leading-6">
            Review the current owner, status, and note before changing the follow-up.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <StatusDetail label="Current owner" value={diagnosis.ownerName || "Unassigned"} />
          <StatusDetail
            label="Current status"
            value={getDiagnosisReviewStatusLabel(diagnosis.reviewStatus)}
          />
          <StatusDetail
            label="Latest note"
            value={diagnosis.reviewNote || "No follow-up note yet."}
          />
        </div>
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
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--color-accent)]">
            Update follow-up
          </p>
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
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1">
            <h2 className="display-title text-2xl font-semibold">Handoff brief</h2>
            <p className="muted text-sm leading-6">
              Use this plain-text brief when escalating the issue to a site lead, project owner, or regional manager.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href={`/history/${sessionId}/brief`}
              className="inline-flex min-h-11 items-center justify-center rounded-[var(--radius-md)] border border-[var(--color-border)] px-4 text-sm font-medium"
            >
              Open plain text
            </Link>
            <Link
              href={`/history/${sessionId}/brief?download=1`}
              className="inline-flex min-h-11 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-accent)] px-4 text-sm font-medium text-[var(--color-accent-foreground)]"
            >
              Download brief
            </Link>
          </div>
        </div>

        <pre className="overflow-x-auto rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-strong)] p-4 text-xs leading-6 whitespace-pre-wrap">
          {handoffBrief}
        </pre>
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

function StatusDetail({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-strong)] p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-text-muted)]">
        {label}
      </p>
      <p className="mt-2 text-sm leading-6">{value}</p>
    </div>
  );
}
