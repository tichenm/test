import { diagnosisRecordSchema, type DiagnosisRecord } from "@/lib/diagnosis-schema";
import {
  getDiagnosticRail,
  type DiagnosisFields,
  type InterviewState,
  type RailKey,
  type StepDefinition,
} from "@/lib/diagnostic-rails";

type AdvanceResult = {
  state: InterviewState;
  status: "needs-more-detail" | "next-question" | "diagnosis-ready";
};

export function createInterviewState(
  railKey: RailKey,
  context?: InterviewState["context"],
): InterviewState {
  const rail = getDiagnosticRail(railKey);

  return {
    railKey,
    currentStep: rail.stepOrder[0],
    fields: {},
    ...(context ? { context } : {}),
  };
}

export function getCurrentStepDefinition(state: InterviewState): StepDefinition {
  return getDiagnosticRail(state.railKey).steps[state.currentStep];
}

export function advanceInterview(
  state: InterviewState,
  updates: DiagnosisFields,
): AdvanceResult {
  const nextState: InterviewState = {
    ...state,
    fields: {
      ...state.fields,
      ...updates,
    },
  };

  const currentStep = getCurrentStepDefinition(nextState);
  const currentValue = nextState.fields[currentStep.field];

  if (!currentValue) {
    return {
      state: nextState,
      status: "needs-more-detail",
    };
  }

  const rail = getDiagnosticRail(nextState.railKey);
  const currentIndex = rail.stepOrder.indexOf(nextState.currentStep);
  const nextStep = rail.stepOrder[currentIndex + 1];

  if (!nextStep) {
    return {
      state: nextState,
      status: "diagnosis-ready",
    };
  }

  return {
    state: {
      ...nextState,
      currentStep: nextStep,
    },
    status: "next-question",
  };
}

export function buildDiagnosisRecord(state: InterviewState): DiagnosisRecord {
  const {
    painType,
    frequency,
    timeWindow,
    affectedScope,
    peopleInvolved,
    currentWorkaround,
    operationalImpact,
  } = state.fields;

  if (
    !painType ||
    !frequency ||
    !timeWindow ||
    !affectedScope ||
    !peopleInvolved ||
    !currentWorkaround ||
    !operationalImpact
  ) {
    throw new Error("Cannot build diagnosis without all required fields");
  }

  return diagnosisRecordSchema.parse(getDiagnosticRail(state.railKey).buildDiagnosis({
    frequency,
    timeWindow,
    affectedScope,
    peopleInvolved,
    currentWorkaround,
    operationalImpact,
    painType,
  }));
}

export type { DiagnosisFields, InterviewState, RailKey, StepDefinition } from "@/lib/diagnostic-rails";
export {
  DEFAULT_RAIL_KEY,
  getDiagnosticRail,
  isRailKey,
  listDiagnosticRails,
} from "@/lib/diagnostic-rails";
