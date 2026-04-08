import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { createInterviewState } from "@/lib/diagnostic-engine";

const getAuthSessionMock = vi.fn();
const buildLoginRedirectMock = vi.fn();
const getInterviewSessionForUserMock = vi.fn();
const submitInterviewAnswerMock = vi.fn();
const redirectMock = vi.fn();
const notFoundMock = vi.fn();

vi.mock("@/lib/auth", () => ({
  getAuthSession: (...args: unknown[]) => getAuthSessionMock(...args),
}));

vi.mock("@/lib/auth-navigation", () => ({
  buildLoginRedirect: (...args: unknown[]) => buildLoginRedirectMock(...args),
}));

vi.mock("@/lib/interviews", () => ({
  getInterviewSessionForUser: (...args: unknown[]) => getInterviewSessionForUserMock(...args),
  submitInterviewAnswer: (...args: unknown[]) => submitInterviewAnswerMock(...args),
}));

vi.mock("next/navigation", () => ({
  redirect: (...args: unknown[]) => redirectMock(...args),
  notFound: (...args: unknown[]) => notFoundMock(...args),
}));

import InterviewPage from "@/app/interview/[sessionId]/page";

describe("InterviewPage", () => {
  beforeEach(() => {
    getAuthSessionMock.mockReset();
    buildLoginRedirectMock.mockReset();
    getInterviewSessionForUserMock.mockReset();
    submitInterviewAnswerMock.mockReset();
    redirectMock.mockReset();
    notFoundMock.mockReset();
  });

  it("renders quick symptom choices on the first step while keeping freeform input", async () => {
    getAuthSessionMock.mockResolvedValue({ user: { id: "user-1" } });
    getInterviewSessionForUserMock.mockResolvedValue({
      id: "session-1",
      railKey: "store-service-complaints",
      storeName: "人民广场店",
      roleName: "门店店长",
      status: "ACTIVE",
      state: createInterviewState("store-service-complaints" as never),
      messages: [
        {
          id: "m-1",
          role: "ASSISTANT",
          content:
            "我们先把问题说具体。 高峰期最常让顾客不满的是哪一类，等待太久、解释不一致，还是服务动作接不上？",
          stepKey: "problem-symptom",
        },
      ],
    });

    render(await InterviewPage({ params: Promise.resolve({ sessionId: "session-1" }) }));

    expect(screen.getByText("快捷选择")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "等待太久" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "解释不一致" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "服务动作接不上" })).toBeInTheDocument();
    expect(screen.getByLabelText("你的回答")).toBeInTheDocument();
    expect(screen.getByText("如果上面的选项都不完全贴合，也可以直接补充。")).toBeInTheDocument();
  });

  it("falls back to freeform-only input after the first symptom step", async () => {
    const state = createInterviewState("store-service-complaints" as never);
    state.currentStep = "frequency-pattern";
    state.fields = { painType: "service-delay" as never };

    getAuthSessionMock.mockResolvedValue({ user: { id: "user-1" } });
    getInterviewSessionForUserMock.mockResolvedValue({
      id: "session-2",
      railKey: "store-service-complaints",
      storeName: "人民广场店",
      roleName: "门店店长",
      status: "ACTIVE",
      state,
      messages: [
        {
          id: "m-2",
          role: "ASSISTANT",
          content:
            "好，这个信息有帮助。再补充一点： 顾客等待明显变长的情况，通常多久会出现一次？",
          stepKey: "frequency-pattern",
        },
      ],
    });

    render(await InterviewPage({ params: Promise.resolve({ sessionId: "session-2" }) }));

    expect(screen.queryByText("快捷选择")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "等待太久" })).not.toBeInTheDocument();
    expect(screen.getByLabelText("你的回答")).toBeInTheDocument();
  });

  it("renders quick choices again on later service steps that benefit from structured input", async () => {
    const state = createInterviewState("store-service-complaints" as never);
    state.currentStep = "affected-scope";
    state.fields = {
      painType: "service-delay" as never,
      frequency: "每个周末晚高峰",
      timeWindow: "晚高峰和交接班前后",
    };

    getAuthSessionMock.mockResolvedValue({ user: { id: "user-1" } });
    getInterviewSessionForUserMock.mockResolvedValue({
      id: "session-3",
      railKey: "store-service-complaints",
      storeName: "人民广场店",
      roleName: "门店店长",
      status: "ACTIVE",
      state,
      messages: [
        {
          id: "m-3",
          role: "ASSISTANT",
          content:
            "好，这个信息有帮助。再补充一点： 最常卡住的是哪个服务环节，迎宾、点单、收银、出餐取货、现场解释，还是客诉处置？",
          stepKey: "affected-scope",
        },
      ],
    });

    render(await InterviewPage({ params: Promise.resolve({ sessionId: "session-3" }) }));

    expect(screen.getByText("快捷选择")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "迎宾分流" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "出餐取货" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "现场解释安抚" })).toBeInTheDocument();
    expect(screen.getByLabelText("你的回答")).toBeInTheDocument();
  });
});
