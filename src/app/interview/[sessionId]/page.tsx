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
  const quickChoices = currentStep.suggestedAnswers ?? [];

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
          退出问答
        </Link>
        <span className="text-sm text-[var(--color-text-muted)]">
          第 {progressIndex + 1} / 7 步
        </span>
      </div>

      <section className="app-card flex flex-col gap-3 p-6">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--color-accent)]">
          问题上下文
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
            正在聚焦诊断
          </span>
        </div>
      </section>

      <section className="app-card flex flex-col gap-5 p-6 sm:p-8">
        <div className="space-y-3">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--color-accent)]">
            当前引导问题
          </p>
          <h1 className="display-title text-3xl font-semibold tracking-tight sm:text-4xl">
            {question}
          </h1>
          <p className="muted max-w-2xl text-sm leading-6">
            尽量具体，直接写出重复模式、发生时点，或导致问题出现的团队行为。
          </p>
        </div>

        {quickChoices.length > 0 ? (
          <form action={submitAnswerAction} className="grid gap-3">
            <div className="space-y-1">
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[var(--color-accent)]">
                快捷选择
              </p>
              <p className="muted text-sm leading-6">
                先点一个最贴近的选项，后面的问题会继续帮你把情况说具体。
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              {quickChoices.map((choice) => (
                <button
                  key={choice.value}
                  type="submit"
                  name="answer"
                  value={choice.value}
                  className="min-h-11 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-strong)] px-4 text-sm font-semibold text-left"
                >
                  {choice.label}
                </button>
              ))}
            </div>
          </form>
        ) : null}

        <form action={submitAnswerAction} className="flex flex-col gap-4">
          {quickChoices.length > 0 ? (
            <p className="muted text-sm leading-6">
              如果上面的选项都不完全贴合，也可以直接补充。
            </p>
          ) : null}
          <label className="space-y-2 text-sm font-medium" htmlFor="answer">
            你的回答
            <textarea
              id="answer"
              name="answer"
              required
              rows={6}
              placeholder="例如：我们周末的快销商品经常缺货，因为周五交接总是太晚。"
              className="min-h-44 w-full rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface-strong)] px-4 py-4 text-base leading-7"
            />
          </label>

          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-[var(--color-text-muted)]">
              系统会持续追问，直到把问题收敛成一个明确诊断。
            </p>
            <button
              type="submit"
              className="min-h-11 rounded-[var(--radius-md)] bg-[var(--color-accent)] px-4 text-sm font-semibold text-[var(--color-accent-foreground)]"
            >
              继续诊断
            </button>
          </div>
        </form>
      </section>

      <section className="app-card flex flex-col gap-4 p-6">
        <h2 className="display-title text-2xl font-semibold">
          最近问答记录
        </h2>
        <ul className="grid gap-3">
          {interview.messages.slice(-4).map((message) => (
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
