import type { DiagnosisRecord } from "@/lib/diagnosis-schema";
import type { InterviewState } from "@/lib/diagnostic-engine";

type OpenAIResponsePayload = {
  output_text?: string;
};

export function renderGuidedQuestion(
  basePrompt: string,
  state: InterviewState,
): string {
  const prefix =
    state.currentStep === "problem-symptom"
      ? "Let's pin down the issue first."
      : "Good, that helps. One more thing:";

  return `${prefix} ${basePrompt}`;
}

export function renderDiagnosisSummary(record: DiagnosisRecord): string {
  return [
    `The main issue is ${record.painType.replace("-", " ")} affecting ${record.affectedScope}.`,
    `It is showing up ${record.frequency}, most often around ${record.timeWindow}.`,
    `The likely root cause is ${record.likelyRootCause.toLowerCase()}`,
    `Start with this: ${record.nextAction}`,
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
          model: process.env.OPENAI_MODEL || "gpt-5-mini",
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
      "Rewrite the guided interview question so it feels warm, concrete, and professional. Keep it to one short question. Do not add bullets or markdown.",
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
      "Rewrite the diagnosis into 3 concise sentences for an operations manager. Keep the root cause and the next action explicit. Do not use markdown or lists.",
    input: JSON.stringify(record),
    fallback,
  });
}
