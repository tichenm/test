import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { getAuthSession } from "@/lib/auth";
import { buildLoginRedirect } from "@/lib/auth-navigation";
import { buildDiagnosisHandoffBrief } from "@/lib/diagnosis-handoff";
import {
  getDiagnosisSeverityLabel,
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

  if (
    likelyRootCause.includes("上游") ||
    likelyRootCause.includes("系统问题") ||
    normalized.includes("hq") ||
    normalized.includes("system issue") ||
    normalized.includes("upstream")
  ) {
    return "更像是上游触发的问题";
  }

  if (
    likelyRootCause.includes("门店执行") ||
    normalized.includes("store execution")
  ) {
    return "更像是门店执行侧的缺口";
  }

  return "更像是职责分散导致的协同问题";
}

function buildEvidenceCards(diagnosis: RecapDiagnosisFields) {
  return [
    {
      label: "重复模式",
      body: `这个问题会在${diagnosis.frequency}重复出现，主要集中在${diagnosis.timeWindow}。`,
    },
    {
      label: "发生位置",
      body: `它主要出现在${diagnosis.affectedScope}，带来的影响是${diagnosis.operationalImpact}。`,
    },
    {
      label: "补救信号",
      body: `最强的信号来自${diagnosis.peopleInvolved}。目前团队正在通过${diagnosis.currentWorkaround}来补救。`,
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
        返回历史
      </Link>

      <section className="app-card flex flex-col gap-4 p-6">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--color-accent)]">
          当前判断
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
            严重程度：{getDiagnosisSeverityLabel(diagnosis.severity)}
          </span>
          <span className="rounded-full bg-[var(--color-surface-strong)] px-3 py-2">
            跟进状态：{getDiagnosisReviewStatusLabel(diagnosis.reviewStatus)}
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
            <h2 className="display-title text-2xl font-semibold">为什么这样判断</h2>
            <p className="muted text-sm leading-6">
              下面这些信号，是这次诊断最关键的判断依据。
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
        <h2 className="display-title text-2xl font-semibold">优先做什么</h2>
        <p className="text-base leading-7">{diagnosis.nextAction}</p>
        <p className="muted text-sm leading-6">
          先从这里开始验证。如果有效，再扩大成更完整的修复动作。
        </p>
      </section>

      <section className="app-card flex flex-col gap-4 p-6">
        <div className="space-y-1">
          <h2 className="display-title text-2xl font-semibold">团队当前状态</h2>
          <p className="muted text-sm leading-6">
            在调整后续动作前，先确认当前负责人、状态和备注。
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <StatusDetail label="当前负责人" value={diagnosis.ownerName || "未指派"} />
          <StatusDetail
            label="当前状态"
            value={getDiagnosisReviewStatusLabel(diagnosis.reviewStatus)}
          />
          <StatusDetail
            label="最新备注"
            value={diagnosis.reviewNote || "还没有跟进备注。"}
          />
        </div>
      </section>

      <section className="app-card flex flex-col gap-3 p-6">
        <h2 className="display-title text-2xl font-semibold">白话总结</h2>
        <p className="muted leading-7">{diagnosis.aiSummary}</p>
      </section>

      <section className="app-card flex flex-col gap-4 p-6">
        <div className="space-y-1">
          <h2 className="display-title text-2xl font-semibold">管理跟进</h2>
          <p className="muted text-sm leading-6">
            给这条诊断明确负责人，并推动它进入跟进、采纳和解决。
          </p>
        </div>

        <form action={saveFollowUpAction} className="grid gap-4">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--color-accent)]">
            更新跟进信息
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-2 text-sm font-medium">
              跟进状态
              <select
                name="reviewStatus"
                defaultValue={diagnosis.reviewStatus}
                className="min-h-11 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-strong)] px-4"
              >
                <option value="new">待跟进</option>
                <option value="reviewing">跟进中</option>
                <option value="accepted">已采纳</option>
                <option value="resolved">已解决</option>
              </select>
            </label>

            <label className="grid gap-2 text-sm font-medium">
              负责人
              <input
                name="ownerName"
                defaultValue={diagnosis.ownerName ?? ""}
                placeholder="例如：运营负责人、站点经理、项目负责人"
                className="min-h-11 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-strong)] px-4"
              />
            </label>
          </div>

          <label className="grid gap-2 text-sm font-medium">
            跟进备注
            <textarea
              name="reviewNote"
              defaultValue={diagnosis.reviewNote ?? ""}
              rows={4}
              placeholder="当前在验证什么、做了什么决定、还卡在哪里？"
              className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-strong)] px-4 py-3 leading-6"
            />
          </label>

          <div className="flex items-center justify-between gap-3">
            <div className="text-sm text-[var(--color-text-muted)]">
              <p>当前负责人：{diagnosis.ownerName || "未指派"}</p>
              <p>最新备注：{diagnosis.reviewNote || "还没有跟进备注。"}</p>
            </div>
            <button
              type="submit"
              className="min-h-11 rounded-[var(--radius-md)] bg-[var(--color-accent)] px-4 text-sm font-semibold text-[var(--color-accent-foreground)]"
            >
              保存跟进
            </button>
          </div>
        </form>
      </section>

      <section className="app-card flex flex-col gap-4 p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1">
            <h2 className="display-title text-2xl font-semibold">交接摘要</h2>
            <p className="muted text-sm leading-6">
              当你要把问题升级给站点负责人、项目负责人或区域经理时，可以直接使用这份纯文本摘要。
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <a
              href={`/history/${sessionId}/brief`}
              className="inline-flex min-h-11 items-center justify-center rounded-[var(--radius-md)] border border-[var(--color-border)] px-4 text-sm font-medium"
            >
              打开纯文本
            </a>
            <a
              href={`/history/${sessionId}/brief?download=1`}
              className="inline-flex min-h-11 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-accent)] px-4 text-sm font-medium text-[var(--color-accent-foreground)]"
            >
              下载摘要
            </a>
          </div>
        </div>

        <pre className="overflow-x-auto rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-strong)] p-4 text-xs leading-6 whitespace-pre-wrap">
          {handoffBrief}
        </pre>
      </section>

      <section className="app-card flex flex-col gap-4 p-6">
        <h2 className="display-title text-2xl font-semibold">问答记录</h2>
        <ul className="grid gap-3">
          {interview.messages.map((message) => (
            <li
              key={message.id}
              className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-strong)] p-4"
            >
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-text-muted)]">
                {message.role === "ASSISTANT"
                  ? "助手"
                  : message.role === "USER"
                    ? "用户"
                    : "系统"}
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
