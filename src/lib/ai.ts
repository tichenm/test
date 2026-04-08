import type { DiagnosisRecord } from "@/lib/diagnosis-schema";
import type { InterviewState } from "@/lib/diagnostic-engine";
import { getDiagnosisPainTypeLabel } from "@/lib/interview-presenters";

type OpenAIResponsePayload = {
  output_text?: string;
};

function getOpenAIModel() {
  return process.env.OPENAI_MODEL || "gpt-5.4";
}

function getOpenAIReasoningEffort() {
  return process.env.OPENAI_REASONING_EFFORT || "high";
}

export function renderGuidedQuestion(
  basePrompt: string,
  state: InterviewState,
): string {
  const prefix =
    state.currentStep === "problem-symptom"
      ? "我们先把问题说具体。"
      : "好，这个信息有帮助。再补充一点：";

  return `${prefix} ${basePrompt}`;
}

export function renderDiagnosisSummary(record: DiagnosisRecord): string {
  return [
    `当前最核心的问题是${record.affectedScope}出现了${getDiagnosisPainTypeLabel(record.painType)}。`,
    `它会在${record.frequency}出现，主要集中在${record.timeWindow}。`,
    `目前判断的根因是：${record.likelyRootCause}`,
    `建议先从这里开始：${record.nextAction}`,
  ].join(" ");
}

async function generateOpenAIText(params: {
  instructions: string;
  input: string;
  fallback: string;
}) {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return params.fallback;
  }

  try {
    const response = await fetch(
      `${process.env.OPENAI_BASE_URL || "https://api.openai.com/v1"}/responses`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: getOpenAIModel(),
          reasoning: {
            effort: getOpenAIReasoningEffort(),
          },
          instructions: params.instructions,
          input: params.input,
        }),
      },
    );

    if (!response.ok) {
      return params.fallback;
    }

    const payload = (await response.json()) as OpenAIResponsePayload;

    return payload.output_text?.trim() || params.fallback;
  } catch {
    return params.fallback;
  }
}

export async function generateGuidedQuestion(
  basePrompt: string,
  state: InterviewState,
) {
  const fallback = renderGuidedQuestion(basePrompt, state);

  return generateOpenAIText({
    instructions:
      "把引导式访谈问题改写成自然、具体、专业的简短中文问题。不要使用项目符号，也不要使用 markdown。",
    input: [
      `Rail: ${state.railKey}`,
      `Current step: ${state.currentStep}`,
      `Known fields: ${JSON.stringify(state.fields)}`,
      `Fallback question: ${fallback}`,
    ].join("\n"),
    fallback,
  });
}

export async function generateDiagnosisSummary(record: DiagnosisRecord) {
  const fallback = renderDiagnosisSummary(record);

  return generateOpenAIText({
    instructions:
      "把诊断改写成适合运营管理者阅读的三句简洁中文总结。明确写出根因和下一步动作。不要使用 markdown 或列表。",
    input: JSON.stringify(record),
    fallback,
  });
}
