import { MessageRole, Prisma } from "@prisma/client";

import { generateDiagnosisSummary, generateGuidedQuestion } from "@/lib/ai";
import {
  DEFAULT_RAIL_KEY,
  advanceInterview,
  buildDiagnosisRecord,
  createInterviewState,
  getCurrentStepDefinition,
  type RailKey,
  type InterviewState,
} from "@/lib/diagnostic-engine";
import { prisma } from "@/lib/db";
import { normalizePainTypeInput } from "@/lib/pain-types";

function normalizeState(value: Prisma.JsonValue): InterviewState {
  if (typeof value === "object" && value && "currentStep" in value) {
    const parsed = value as unknown as InterviewState;

    return {
      ...parsed,
      context: parsed.context?.roleName
        ? { roleName: parsed.context.roleName.trim() }
        : parsed.context,
    };
  }

  return createInterviewState(DEFAULT_RAIL_KEY);
}

function normalizeRoleName(value?: string) {
  return value?.trim() || null;
}

const REVIEW_STATUSES = ["new", "reviewing", "accepted", "resolved"] as const;

function normalizeReviewStatus(value: string) {
  return REVIEW_STATUSES.includes(value as (typeof REVIEW_STATUSES)[number])
    ? value
    : "new";
}

export async function createInterviewSessionForUser(
  userId: string,
  railKey: RailKey = DEFAULT_RAIL_KEY,
  storeName?: string,
  roleName?: string,
) {
  const normalizedRoleName = normalizeRoleName(roleName);
  const state = createInterviewState(
    railKey,
    normalizedRoleName ? { roleName: normalizedRoleName } : undefined,
  );
  const openingQuestion = await generateGuidedQuestion(
    getCurrentStepDefinition(state).prompt(state),
    state,
  );
  const normalizedStoreName = storeName?.trim() || null;

  return prisma.interviewSession.create({
    data: {
      userId,
      railKey: state.railKey,
      storeName: normalizedStoreName,
      state: state as Prisma.InputJsonValue,
      messages: {
        create: {
          role: MessageRole.ASSISTANT,
          stepKey: state.currentStep,
          content: openingQuestion,
        },
      },
    },
  });
}

export async function listInterviewSessionsForUser(userId: string) {
  const sessions = await prisma.interviewSession.findMany({
    where: { userId },
    include: {
      diagnosisRecord: true,
    },
    orderBy: { startedAt: "desc" },
  });

  return sessions.map((session) => ({
    ...session,
    roleName: normalizeState(session.state).context?.roleName ?? null,
  }));
}

export async function getInterviewSessionForUser(userId: string, sessionId: string) {
  const session = await prisma.interviewSession.findFirst({
    where: {
      id: sessionId,
      userId,
    },
    include: {
      messages: {
        orderBy: { createdAt: "asc" },
      },
      diagnosisRecord: true,
    },
  });

  if (!session) {
    return null;
  }

  return {
    ...session,
    roleName: normalizeState(session.state).context?.roleName ?? null,
  };
}

export async function submitInterviewAnswer(params: {
  userId: string;
  sessionId: string;
  answer: string;
}) {
  const session = await getInterviewSessionForUser(params.userId, params.sessionId);

  if (!session) {
    throw new Error("Session not found");
  }

  const currentState = normalizeState(session.state);
  const currentStep = getCurrentStepDefinition(currentState);
  const normalizedAnswer = currentStep.field === "painType"
    ? normalizePainTypeInput(params.answer)
    : params.answer.trim();
  const next = advanceInterview(currentState, {
    [currentStep.field]: normalizedAnswer,
  });

  await prisma.interviewMessage.create({
    data: {
      sessionId: session.id,
      role: MessageRole.USER,
      stepKey: currentState.currentStep,
      content: normalizedAnswer,
    },
  });

  if (next.status === "diagnosis-ready") {
    const diagnosis = buildDiagnosisRecord(next.state);
    const aiSummary = await generateDiagnosisSummary(diagnosis);

    await prisma.$transaction([
      prisma.interviewSession.update({
        where: { id: session.id },
        data: {
          state: next.state as Prisma.InputJsonValue,
          status: "COMPLETED",
          completedAt: new Date(),
        },
      }),
      prisma.diagnosisRecord.upsert({
        where: { sessionId: session.id },
        create: {
          sessionId: session.id,
          ...diagnosis,
          aiSummary,
          reviewStatus: "new",
        },
        update: {
          ...diagnosis,
          aiSummary,
        },
      }),
      prisma.interviewMessage.create({
        data: {
          sessionId: session.id,
          role: MessageRole.ASSISTANT,
          stepKey: null,
          content: aiSummary,
        },
      }),
    ]);

    return { status: "completed" as const };
  }

  const followUp = await generateGuidedQuestion(
    getCurrentStepDefinition(next.state).prompt(next.state),
    next.state,
  );

  await prisma.$transaction([
    prisma.interviewSession.update({
      where: { id: session.id },
      data: {
        state: next.state as Prisma.InputJsonValue,
      },
    }),
    prisma.interviewMessage.create({
      data: {
        sessionId: session.id,
        role: MessageRole.ASSISTANT,
        stepKey: next.state.currentStep,
        content: followUp,
      },
    }),
  ]);

  return { status: "active" as const };
}

export async function updateDiagnosisFollowUpForUser(params: {
  userId: string;
  sessionId: string;
  reviewStatus: string;
  ownerName?: string;
  reviewNote?: string;
}) {
  const session = await getInterviewSessionForUser(params.userId, params.sessionId);

  if (!session?.diagnosisRecord) {
    throw new Error("Diagnosis record not found");
  }

  const ownerName = params.ownerName?.trim() || null;
  const reviewNote = params.reviewNote?.trim() || null;

  return prisma.diagnosisRecord.update({
    where: { sessionId: session.id },
    data: {
      reviewStatus: normalizeReviewStatus(params.reviewStatus),
      ownerName,
      reviewNote,
    },
  });
}
