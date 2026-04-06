import Link from "next/link";
import { redirect } from "next/navigation";

import { RailPicker } from "@/components/rail-picker";
import { getAuthSession } from "@/lib/auth";
import { buildLoginRedirect } from "@/lib/auth-navigation";
import {
  DEFAULT_RAIL_KEY,
  getDiagnosticRail,
  isRailKey,
  listDiagnosticRails,
} from "@/lib/diagnostic-engine";
import {
  createInterviewSessionForUser,
  listInterviewSessionsForUser,
} from "@/lib/interviews";
import {
  getEmptyHistoryCopy,
  getInterviewCardTitle,
  getInterviewRailLabel,
} from "@/lib/interview-presenters";

function formatTimestamp(value: Date) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(value);
}

export default async function HomePage() {
  const session = await getAuthSession();
  const defaultRail = getDiagnosticRail(DEFAULT_RAIL_KEY);
  const rails = listDiagnosticRails();

  if (!session?.user?.id) {
    redirect(buildLoginRedirect("/"));
  }

  const interviews = await listInterviewSessionsForUser(session.user.id);
  const draft = interviews.find((item) => item.status === "ACTIVE");
  const recent = interviews.filter((item) => item.status === "COMPLETED").slice(0, 3);

  async function startDiagnosisAction(formData: FormData) {
    "use server";

    const currentSession = await getAuthSession();

    if (!currentSession?.user?.id) {
      redirect(buildLoginRedirect("/"));
    }

    const selectedRailKey = String(formData.get("railKey") || DEFAULT_RAIL_KEY);
    const railKey = isRailKey(selectedRailKey)
      ? selectedRailKey
      : DEFAULT_RAIL_KEY;
    const storeName = String(formData.get("storeName") || "");
    const roleName = String(formData.get("roleName") || "");

    const created = await createInterviewSessionForUser(
      currentSession.user.id,
      railKey,
      storeName,
      roleName,
    );
    redirect(`/interview/${created.id}`);
  }

  return (
    <main className="flex flex-1 flex-col gap-6 pb-8 pt-4">
      <section className="app-card flex flex-col gap-6 p-6 sm:p-8">
        <div className="space-y-3">
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[var(--color-accent)]">
            Workbench
          </p>
          <h1 className="display-title text-4xl font-semibold tracking-tight sm:text-5xl">
            Start a diagnosis before the floor starts guessing.
          </h1>
          <p className="muted max-w-2xl text-base leading-7">
            {defaultRail.workbenchSummary}
          </p>
        </div>

        <RailPicker
          rails={rails}
          defaultRailKey={DEFAULT_RAIL_KEY}
          action={startDiagnosisAction}
        />
      </section>

      {draft ? (
        <section className="app-card flex flex-col gap-3 p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--color-accent)]">
                Continue draft
              </p>
              <h2 className="display-title mt-1 text-2xl font-semibold">
                You have an unfinished diagnosis in progress.
              </h2>
            </div>
            <span className="rounded-full bg-[var(--color-surface-strong)] px-3 py-2 text-sm text-[var(--color-text-muted)]">
              Active
            </span>
          </div>

          <p className="muted text-sm leading-6">
            Started {formatTimestamp(draft.startedAt)}. Pick it up and keep the
            thread focused.
          </p>

          <Link
            href={`/interview/${draft.id}`}
            className="inline-flex min-h-11 items-center justify-center rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-strong)] px-4 text-sm font-medium"
          >
            Continue Draft
          </Link>
        </section>
      ) : null}

      <section className="app-card flex flex-col gap-4 p-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--color-accent)]">
              Recent diagnoses
            </p>
            <h2 className="display-title mt-1 text-2xl font-semibold">
              Diagnosis history
            </h2>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/insights" className="text-sm font-medium text-[var(--color-accent)]">
              Insights
            </Link>
            <Link href="/history" className="text-sm font-medium text-[var(--color-accent)]">
              View all
            </Link>
          </div>
        </div>

        {recent.length > 0 ? (
          <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-strong)] p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-accent)]">
                  Manager shortcut
                </p>
                <p className="mt-1 text-sm leading-6">
                  Open the insights board to spot repeated pain types, workflow clusters, and common next actions.
                </p>
              </div>
              <Link
                href="/insights"
                className="inline-flex min-h-11 items-center justify-center rounded-[var(--radius-md)] border border-[var(--color-border)] px-4 text-sm font-medium"
              >
                Open Insights
              </Link>
            </div>
          </div>
        ) : null}

        {recent.length === 0 ? (
          <div className="rounded-[var(--radius-md)] border border-dashed border-[var(--color-border)] bg-[var(--color-surface-strong)] p-5">
            <h3 className="display-title text-xl font-semibold">
              You do not have any diagnosis records yet.
            </h3>
            <p className="muted mt-2 text-sm leading-6">
              {getEmptyHistoryCopy()}
            </p>
          </div>
        ) : (
          <ul className="grid gap-3">
            {recent.map((item) => (
              <li key={item.id}>
                <Link
                  href={`/history/${item.id}`}
                  className="flex flex-col gap-2 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-strong)] p-4"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex flex-col gap-1">
                      <span className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-accent)]">
                        {getInterviewRailLabel(item.railKey)}
                      </span>
                      {item.storeName ? (
                        <span className="text-xs uppercase tracking-[0.16em] text-[var(--color-text-muted)]">
                          {item.storeName}
                        </span>
                      ) : null}
                      {item.roleName ? (
                        <span className="text-xs uppercase tracking-[0.16em] text-[var(--color-text-muted)]">
                          {item.roleName}
                        </span>
                      ) : null}
                      <span className="font-semibold capitalize">
                        {getInterviewCardTitle({
                          railKey: item.railKey,
                          diagnosisRecord: item.diagnosisRecord,
                        }).replace("-", " ")}
                      </span>
                    </div>
                    <span className="text-sm text-[var(--color-text-muted)]">
                      {formatTimestamp(item.startedAt)}
                    </span>
                  </div>
                  <p className="muted text-sm">
                    {item.diagnosisRecord?.nextAction || "Review the latest diagnosis."}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
