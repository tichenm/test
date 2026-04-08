import { MessageRole } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { createInterviewState } from "@/lib/diagnostic-engine";

const { prismaMock, generateGuidedQuestionMock, generateDiagnosisSummaryMock } = vi.hoisted(
  () => ({
    prismaMock: {
      interviewSession: {
        create: vi.fn(),
        findMany: vi.fn(),
        findFirst: vi.fn(),
        update: vi.fn(),
      },
      interviewMessage: {
        create: vi.fn(),
      },
      diagnosisRecord: {
        upsert: vi.fn(),
        update: vi.fn(),
      },
      $transaction: vi.fn(),
    },
    generateGuidedQuestionMock: vi.fn(),
    generateDiagnosisSummaryMock: vi.fn(),
  }),
);

vi.mock("@/lib/db", () => ({
  prisma: prismaMock,
}));

vi.mock("@/lib/ai", () => ({
  generateGuidedQuestion: generateGuidedQuestionMock,
  generateDiagnosisSummary: generateDiagnosisSummaryMock,
}));

import {
  createInterviewSessionForUser,
  submitInterviewAnswer,
  updateDiagnosisFollowUpForUser,
} from "@/lib/interviews";

describe("interview services", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.$transaction.mockImplementation(async (operations) => Promise.all(operations));
    generateGuidedQuestionMock.mockImplementation(async (prompt: string) => `guided:${prompt}`);
    generateDiagnosisSummaryMock.mockResolvedValue("diagnosis-summary");
  });

  it("creates a new interview session with an opening assistant prompt", async () => {
    prismaMock.interviewSession.create.mockResolvedValue({ id: "session-1" });

    const created = await createInterviewSessionForUser("user-1");

    expect(created).toEqual({ id: "session-1" });
    expect(generateGuidedQuestionMock).toHaveBeenCalledWith(
      expect.stringContaining("最常出问题的是哪一类"),
      expect.objectContaining({
        currentStep: "problem-symptom",
        railKey: "inventory-replenishment",
      }),
    );
    expect(prismaMock.interviewSession.create).toHaveBeenCalledWith({
      data: {
        userId: "user-1",
        railKey: "inventory-replenishment",
        storeName: null,
        state: {
          railKey: "inventory-replenishment",
          currentStep: "problem-symptom",
          fields: {},
        },
        messages: {
          create: {
            role: MessageRole.ASSISTANT,
            stepKey: "problem-symptom",
            content: expect.stringContaining("guided:"),
          },
        },
      },
    });
  });

  it("creates a new interview session for an explicitly selected rail", async () => {
    prismaMock.interviewSession.create.mockResolvedValue({ id: "session-rail-2" });

    await createInterviewSessionForUser("user-1", "warehouse-receiving");

    expect(generateGuidedQuestionMock).toHaveBeenCalledWith(
      expect.stringContaining("在收货环节"),
      expect.objectContaining({
        railKey: "warehouse-receiving",
      }),
    );
    expect(prismaMock.interviewSession.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          railKey: "warehouse-receiving",
          state: expect.objectContaining({
            railKey: "warehouse-receiving",
          }),
        }),
      }),
    );
  });

  it("creates a store-manager stock session for the dedicated store rail", async () => {
    prismaMock.interviewSession.create.mockResolvedValue({ id: "session-store-rail" });

    await createInterviewSessionForUser("user-1", "store-stock-replenishment" as never);

    expect(generateGuidedQuestionMock).toHaveBeenCalledWith(
      expect.stringContaining("在门店里"),
      expect.objectContaining({
        railKey: "store-stock-replenishment",
      }),
    );
    expect(prismaMock.interviewSession.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          railKey: "store-stock-replenishment",
          state: expect.objectContaining({
            railKey: "store-stock-replenishment",
          }),
        }),
      }),
    );
  });

  it("creates a store inventory control session for supervisor count-drift workflows", async () => {
    prismaMock.interviewSession.create.mockResolvedValue({ id: "session-store-control" });

    await createInterviewSessionForUser("user-1", "store-inventory-control" as never);

    expect(generateGuidedQuestionMock).toHaveBeenCalledWith(
      expect.stringContaining("最常出问题的是哪一类"),
      expect.objectContaining({
        railKey: "store-inventory-control",
      }),
    );
    expect(prismaMock.interviewSession.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          railKey: "store-inventory-control",
          state: expect.objectContaining({
            railKey: "store-inventory-control",
          }),
        }),
      }),
    );
  });

  it("creates a store staffing session for scheduling and coverage breakdowns", async () => {
    prismaMock.interviewSession.create.mockResolvedValue({ id: "session-store-staffing" });

    await createInterviewSessionForUser("user-1", "store-staffing-scheduling" as never);

    expect(generateGuidedQuestionMock).toHaveBeenCalledWith(
      expect.stringContaining("排班最常出问题的是哪一类"),
      expect.objectContaining({
        railKey: "store-staffing-scheduling",
      }),
    );
    expect(prismaMock.interviewSession.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          railKey: "store-staffing-scheduling",
          state: expect.objectContaining({
            railKey: "store-staffing-scheduling",
          }),
        }),
      }),
    );
  });

  it("creates a store equipment session for maintenance and repair-response breakdowns", async () => {
    prismaMock.interviewSession.create.mockResolvedValue({ id: "session-store-equipment" });

    await createInterviewSessionForUser("user-1", "store-equipment-maintenance" as never);

    expect(generateGuidedQuestionMock).toHaveBeenCalledWith(
      expect.stringContaining("设备问题最常卡在哪一类"),
      expect.objectContaining({
        railKey: "store-equipment-maintenance",
      }),
    );
    expect(prismaMock.interviewSession.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          railKey: "store-equipment-maintenance",
          state: expect.objectContaining({
            railKey: "store-equipment-maintenance",
          }),
        }),
      }),
    );
  });

  it("creates a store shrinkage session for loss and write-off breakdowns", async () => {
    prismaMock.interviewSession.create.mockResolvedValue({ id: "session-store-shrinkage" });

    await createInterviewSessionForUser("user-1", "store-shrinkage-waste" as never);

    expect(generateGuidedQuestionMock).toHaveBeenCalledWith(
      expect.stringContaining("损耗问题最常卡在哪一类"),
      expect.objectContaining({
        railKey: "store-shrinkage-waste",
      }),
    );
    expect(prismaMock.interviewSession.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          railKey: "store-shrinkage-waste",
          state: expect.objectContaining({
            railKey: "store-shrinkage-waste",
          }),
        }),
      }),
    );
  });

  it("creates a project rollout handoff session for cross-team launch coordination", async () => {
    prismaMock.interviewSession.create.mockResolvedValue({ id: "session-project-rollout" });

    await createInterviewSessionForUser("user-1", "project-rollout-handoff" as never);

    expect(generateGuidedQuestionMock).toHaveBeenCalledWith(
      expect.stringContaining("在项目落地过程中"),
      expect.objectContaining({
        railKey: "project-rollout-handoff",
      }),
    );
    expect(prismaMock.interviewSession.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          railKey: "project-rollout-handoff",
          state: expect.objectContaining({
            railKey: "project-rollout-handoff",
          }),
        }),
      }),
    );
  });

  it("creates a store service complaint session for peak-hour service breakdowns", async () => {
    prismaMock.interviewSession.create.mockResolvedValue({ id: "session-store-service" });

    await createInterviewSessionForUser("user-1", "store-service-complaints" as never);

    expect(generateGuidedQuestionMock).toHaveBeenCalledWith(
      expect.stringContaining("高峰期最常让顾客不满"),
      expect.objectContaining({
        railKey: "store-service-complaints",
      }),
    );
    expect(prismaMock.interviewSession.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          railKey: "store-service-complaints",
          state: expect.objectContaining({
            railKey: "store-service-complaints",
          }),
        }),
      }),
    );
  });

  it("stores a trimmed store name when the diagnosis starts with location context", async () => {
    prismaMock.interviewSession.create.mockResolvedValue({ id: "session-store-1" });

    await createInterviewSessionForUser(
      "user-1",
      "inventory-replenishment",
      " Store 12 receiving dock ",
      " Shift manager ",
    );

    expect(prismaMock.interviewSession.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          storeName: "Store 12 receiving dock",
          state: expect.objectContaining({
            context: {
              roleName: "Shift manager",
            },
          }),
        }),
      }),
    );
  });

  it("stores the user answer, advances the interview, and writes the next assistant prompt", async () => {
    const state = createInterviewState("inventory-replenishment");

    prismaMock.interviewSession.findFirst.mockResolvedValue({
      id: "session-1",
      userId: "user-1",
      state,
      status: "ACTIVE",
      messages: [],
      diagnosisRecord: null,
    });
    prismaMock.interviewMessage.create.mockResolvedValue({ id: "message-1" });
    prismaMock.interviewSession.update.mockResolvedValue({ id: "session-1" });

    const result = await submitInterviewAnswer({
      userId: "user-1",
      sessionId: "session-1",
      answer: " stockout ",
    });

    expect(result).toEqual({ status: "active" });
    expect(prismaMock.interviewMessage.create).toHaveBeenNthCalledWith(1, {
      data: {
        sessionId: "session-1",
        role: MessageRole.USER,
        stepKey: "problem-symptom",
        content: "stockout",
      },
    });
    expect(prismaMock.interviewSession.update).toHaveBeenCalledWith({
      where: { id: "session-1" },
      data: {
        state: expect.objectContaining({
          currentStep: "frequency-pattern",
          fields: expect.objectContaining({
            painType: "stockout",
          }),
        }),
      },
    });
    expect(generateGuidedQuestionMock).toHaveBeenLastCalledWith(
      expect.stringContaining("缺货通常多久发生一次"),
      expect.objectContaining({
        currentStep: "frequency-pattern",
      }),
    );
    expect(prismaMock.interviewMessage.create).toHaveBeenNthCalledWith(2, {
      data: {
        sessionId: "session-1",
        role: MessageRole.ASSISTANT,
        stepKey: "frequency-pattern",
        content: expect.stringContaining("guided:"),
      },
    });
    expect(prismaMock.$transaction).toHaveBeenCalledTimes(1);
  });

  it("normalizes a Chinese symptom answer into the canonical pain type before advancing", async () => {
    const state = createInterviewState("store-service-complaints" as never);

    prismaMock.interviewSession.findFirst.mockResolvedValue({
      id: "session-service-1",
      userId: "user-1",
      state,
      status: "ACTIVE",
      messages: [],
      diagnosisRecord: null,
    });
    prismaMock.interviewMessage.create.mockResolvedValue({ id: "message-service-1" });
    prismaMock.interviewSession.update.mockResolvedValue({ id: "session-service-1" });

    const result = await submitInterviewAnswer({
      userId: "user-1",
      sessionId: "session-service-1",
      answer: " 等待太久 ",
    });

    expect(result).toEqual({ status: "active" });
    expect(prismaMock.interviewMessage.create).toHaveBeenNthCalledWith(1, {
      data: {
        sessionId: "session-service-1",
        role: MessageRole.USER,
        stepKey: "problem-symptom",
        content: "service-delay",
      },
    });
    expect(prismaMock.interviewSession.update).toHaveBeenCalledWith({
      where: { id: "session-service-1" },
      data: {
        state: expect.objectContaining({
          currentStep: "frequency-pattern",
          fields: expect.objectContaining({
            painType: "service-delay",
          }),
        }),
      },
    });
  });

  it("completes the interview and persists the diagnosis record on the final answer", async () => {
    const state = {
      railKey: "inventory-replenishment" as const,
      currentStep: "operational-impact" as const,
      fields: {
        painType: "stockout" as const,
        frequency: "weekly",
        timeWindow: "weekends",
        affectedScope: "fast-moving SKUs",
        peopleInvolved: "shift leads",
        currentWorkaround: "manual Slack reminders",
      },
    };

    prismaMock.interviewSession.findFirst.mockResolvedValue({
      id: "session-2",
      userId: "user-1",
      state,
      status: "ACTIVE",
      messages: [],
      diagnosisRecord: null,
    });
    prismaMock.interviewMessage.create.mockResolvedValue({ id: "message-2" });
    prismaMock.interviewSession.update.mockResolvedValue({ id: "session-2" });
    prismaMock.diagnosisRecord.upsert.mockResolvedValue({ id: "diagnosis-1" });

    const result = await submitInterviewAnswer({
      userId: "user-1",
      sessionId: "session-2",
      answer: "missed weekend sales and rushed transfers",
    });

    expect(result).toEqual({ status: "completed" });
    expect(generateDiagnosisSummaryMock).toHaveBeenCalledWith(
      expect.objectContaining({
        painType: "stockout",
        severity: "high",
        operationalImpact: "missed weekend sales and rushed transfers",
      }),
    );
    expect(prismaMock.interviewSession.update).toHaveBeenCalledWith({
      where: { id: "session-2" },
      data: {
        state: expect.objectContaining({
          currentStep: "operational-impact",
          fields: expect.objectContaining({
            operationalImpact: "missed weekend sales and rushed transfers",
          }),
        }),
        status: "COMPLETED",
        completedAt: expect.any(Date),
      },
    });
    expect(prismaMock.diagnosisRecord.upsert).toHaveBeenCalledWith({
      where: { sessionId: "session-2" },
      create: expect.objectContaining({
        sessionId: "session-2",
        painType: "stockout",
        severity: "high",
        aiSummary: "diagnosis-summary",
      }),
      update: expect.objectContaining({
        painType: "stockout",
        severity: "high",
        aiSummary: "diagnosis-summary",
      }),
    });
    expect(prismaMock.interviewMessage.create).toHaveBeenNthCalledWith(2, {
      data: {
        sessionId: "session-2",
        role: MessageRole.ASSISTANT,
        stepKey: null,
        content: "diagnosis-summary",
      },
    });
  });

  it("updates diagnosis follow-up status, owner, and note for the signed-in user", async () => {
    prismaMock.interviewSession.findFirst.mockResolvedValue({
      id: "session-3",
      userId: "user-1",
      state: createInterviewState("warehouse-receiving"),
      status: "COMPLETED",
      messages: [],
      diagnosisRecord: {
        id: "diagnosis-3",
      },
    });
    prismaMock.diagnosisRecord.update.mockResolvedValue({ id: "diagnosis-3" });

    await updateDiagnosisFollowUpForUser({
      userId: "user-1",
      sessionId: "session-3",
      reviewStatus: "reviewing",
      ownerName: " Ops lead ",
      reviewNote: " Waiting for dock staffing confirmation. ",
    });

    expect(prismaMock.diagnosisRecord.update).toHaveBeenCalledWith({
      where: { sessionId: "session-3" },
      data: {
        reviewStatus: "reviewing",
        ownerName: "Ops lead",
        reviewNote: "Waiting for dock staffing confirmation.",
      },
    });
  });
});
