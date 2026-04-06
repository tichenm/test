import type { DiagnosisRecord } from "@/lib/diagnosis-schema";

export type RailKey = "inventory-replenishment" | "warehouse-receiving";

export type PainType = "stockout" | "overstock" | "inventory-accuracy";
export type Severity = "medium" | "high";

export type DiagnosisFields = {
  painType?: PainType;
  frequency?: string;
  timeWindow?: string;
  affectedScope?: string;
  peopleInvolved?: string;
  currentWorkaround?: string;
  operationalImpact?: string;
};

export type StepKey =
  | "problem-symptom"
  | "frequency-pattern"
  | "time-window"
  | "affected-scope"
  | "people-involved"
  | "current-workaround"
  | "operational-impact";

export type InterviewState = {
  railKey: RailKey;
  currentStep: StepKey;
  fields: DiagnosisFields;
  context?: {
    roleName?: string | null;
  };
};

type CompleteDiagnosisFields = Required<DiagnosisFields> & {
  painType: PainType;
};

export type StepDefinition = {
  key: StepKey;
  field: keyof DiagnosisFields;
  prompt: (state: InterviewState) => string;
};

export type DiagnosticRail = {
  key: RailKey;
  label: string;
  workbenchSummary: string;
  interviewContextLabel: string;
  stepOrder: readonly StepKey[];
  steps: Record<StepKey, StepDefinition>;
  buildDiagnosis: (fields: CompleteDiagnosisFields) => DiagnosisRecord;
};

const sharedStepOrder = [
  "problem-symptom",
  "frequency-pattern",
  "time-window",
  "affected-scope",
  "people-involved",
  "current-workaround",
  "operational-impact",
] as const;

const inventoryReplenishmentRail: DiagnosticRail = {
  key: "inventory-replenishment",
  label: "Inventory and replenishment",
  workbenchSummary:
    "Turn a fuzzy inventory or replenishment complaint into a clear operating issue, with one primary next step.",
  interviewContextLabel: "Inventory and replenishment",
  stepOrder: sharedStepOrder,
  steps: {
    "problem-symptom": {
      key: "problem-symptom",
      field: "painType",
      prompt: () =>
        "What is going wrong most often, stockouts, overstock, or inventory accuracy drift?",
    },
    "frequency-pattern": {
      key: "frequency-pattern",
      field: "frequency",
      prompt: (state) =>
        state.fields.painType === "stockout"
          ? "How often do you run out of stock in this situation?"
          : "How often does this issue show up?",
    },
    "time-window": {
      key: "time-window",
      field: "timeWindow",
      prompt: () => "When does this happen most often?",
    },
    "affected-scope": {
      key: "affected-scope",
      field: "affectedScope",
      prompt: () => "Which products, shifts, or store areas are affected?",
    },
    "people-involved": {
      key: "people-involved",
      field: "peopleInvolved",
      prompt: () => "Who is usually involved when the issue appears?",
    },
    "current-workaround": {
      key: "current-workaround",
      field: "currentWorkaround",
      prompt: () => "How is the team currently working around it?",
    },
    "operational-impact": {
      key: "operational-impact",
      field: "operationalImpact",
      prompt: () => "What operational impact does this create on the floor?",
    },
  },
  buildDiagnosis: (fields) => ({
    painType: fields.painType,
    severity: fields.painType === "stockout" ? "high" : "medium",
    frequency: fields.frequency,
    timeWindow: fields.timeWindow,
    affectedScope: fields.affectedScope,
    peopleInvolved: fields.peopleInvolved,
    currentWorkaround: fields.currentWorkaround,
    operationalImpact: fields.operationalImpact,
    likelyRootCause:
      fields.painType === "stockout"
        ? "Late replenishment handoff is causing fast-moving items to miss the next stock cycle."
        : "Store execution is drifting away from the intended replenishment rhythm.",
    nextAction:
      fields.painType === "stockout"
        ? "Review the replenishment handoff timing and ownership before the next weekend shift."
        : "Review the replenishment ownership and timing for the affected workflow.",
  }),
};

const warehouseReceivingRail: DiagnosticRail = {
  key: "warehouse-receiving",
  label: "Warehouse receiving",
  workbenchSummary:
    "Turn an inbound receiving complaint into a concrete execution issue, with one next action for the floor.",
  interviewContextLabel: "Warehouse receiving",
  stepOrder: sharedStepOrder,
  steps: {
    "problem-symptom": {
      key: "problem-symptom",
      field: "painType",
      prompt: () =>
        "In receiving, what is going wrong most often, stockouts, overstock, or inventory accuracy drift?",
    },
    "frequency-pattern": {
      key: "frequency-pattern",
      field: "frequency",
      prompt: (state) =>
        state.fields.painType === "overstock"
          ? "How often does inbound stock pile up before putaway?"
          : "How often does this inbound receiving issue show up?",
    },
    "time-window": {
      key: "time-window",
      field: "timeWindow",
      prompt: () => "When does the receiving backlog show up most often?",
    },
    "affected-scope": {
      key: "affected-scope",
      field: "affectedScope",
      prompt: () => "Which inbound SKUs, docks, or staging zones are affected?",
    },
    "people-involved": {
      key: "people-involved",
      field: "peopleInvolved",
      prompt: () => "Who is usually involved when receiving starts to back up?",
    },
    "current-workaround": {
      key: "current-workaround",
      field: "currentWorkaround",
      prompt: () => "How is the team currently working around the receiving backlog?",
    },
    "operational-impact": {
      key: "operational-impact",
      field: "operationalImpact",
      prompt: () => "What operational impact does this create across inbound and putaway?",
    },
  },
  buildDiagnosis: (fields) => ({
    painType: fields.painType,
    severity: fields.painType === "stockout" ? "high" : "medium",
    frequency: fields.frequency,
    timeWindow: fields.timeWindow,
    affectedScope: fields.affectedScope,
    peopleInvolved: fields.peopleInvolved,
    currentWorkaround: fields.currentWorkaround,
    operationalImpact: fields.operationalImpact,
    likelyRootCause:
      fields.painType === "overstock"
        ? "Inbound receiving lacks a clear putaway handoff, so stock sits too long in staging before ownership shifts."
        : "Receiving execution is drifting away from the intended inbound control rhythm.",
    nextAction:
      fields.painType === "overstock"
        ? "Review receiving-to-putaway ownership and timing for the affected inbound window."
        : "Review receiving ownership and handoff timing for the affected workflow.",
  }),
};

export const DEFAULT_RAIL_KEY: RailKey = "inventory-replenishment";

const diagnosticRails: Record<RailKey, DiagnosticRail> = {
  "inventory-replenishment": inventoryReplenishmentRail,
  "warehouse-receiving": warehouseReceivingRail,
};

export function getDiagnosticRail(railKey: RailKey): DiagnosticRail {
  return diagnosticRails[railKey];
}

export function listDiagnosticRails(): DiagnosticRail[] {
  return Object.values(diagnosticRails);
}

export function isRailKey(value: string): value is RailKey {
  return value in diagnosticRails;
}
