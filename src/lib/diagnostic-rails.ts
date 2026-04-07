import type { DiagnosisRecord } from "@/lib/diagnosis-schema";

export type RailKey =
  | "inventory-replenishment"
  | "store-stock-replenishment"
  | "store-inventory-control"
  | "warehouse-receiving";

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

type StoreRailLeaning = "store-execution" | "hq-or-system" | "shared";

const sharedStepOrder = [
  "problem-symptom",
  "frequency-pattern",
  "time-window",
  "affected-scope",
  "people-involved",
  "current-workaround",
  "operational-impact",
] as const;

function normalizeDiagnosticText(...values: Array<string | undefined>) {
  return values
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function includesKeyword(text: string, keywords: readonly string[]) {
  return keywords.some((keyword) => text.includes(keyword));
}

const STORE_SIGNAL_KEYWORDS = [
  "shelf",
  "shift",
  "staff",
  "associate",
  "replenish",
  "replenishment",
  "cycle count",
  "count",
  "backroom",
  "display",
  "manual",
  "floor",
] as const;

const HQ_SYSTEM_SIGNAL_KEYWORDS = [
  "hq",
  "head office",
  "planning",
  "planner",
  "allocation",
  "allocator",
  "forecast",
  "forecasting",
  "system",
  "signal",
  "merchandising",
  "regional",
  "auto",
] as const;

function classifyStoreRailLeaning(fields: CompleteDiagnosisFields): StoreRailLeaning {
  const primarySignalText = normalizeDiagnosticText(
    fields.peopleInvolved,
    fields.currentWorkaround,
  );
  const secondarySignalText = normalizeDiagnosticText(
    fields.affectedScope,
    fields.operationalImpact,
  );
  const hasPrimaryStoreSignal = includesKeyword(primarySignalText, STORE_SIGNAL_KEYWORDS);
  const hasPrimaryHqSystemSignal = includesKeyword(
    primarySignalText,
    HQ_SYSTEM_SIGNAL_KEYWORDS,
  );

  if (hasPrimaryStoreSignal && hasPrimaryHqSystemSignal) {
    return "shared";
  }

  if (hasPrimaryHqSystemSignal) {
    return "hq-or-system";
  }

  if (hasPrimaryStoreSignal) {
    return "store-execution";
  }

  const hasSecondaryStoreSignal = includesKeyword(
    secondarySignalText,
    STORE_SIGNAL_KEYWORDS,
  );
  const hasSecondaryHqSystemSignal = includesKeyword(
    secondarySignalText,
    HQ_SYSTEM_SIGNAL_KEYWORDS,
  );

  if (hasSecondaryStoreSignal && hasSecondaryHqSystemSignal) {
    return "shared";
  }

  if (hasSecondaryHqSystemSignal) {
    return "hq-or-system";
  }

  if (hasSecondaryStoreSignal) {
    return "store-execution";
  }

  return "shared";
}

function buildStoreRailRootCause(
  painType: PainType,
  leaning: StoreRailLeaning,
) {
  switch (leaning) {
    case "store-execution":
      return painType === "stockout"
        ? "This looks more like a store execution issue. The store is not consistently catching and correcting stock gaps before they become customer-facing stockouts."
        : "This looks more like a store execution issue. The floor routine is drifting away from the intended replenishment and shelf-control rhythm.";
    case "hq-or-system":
      return "This looks more like an HQ or system issue. The store is repeatedly working around replenishment or planning signals that do not match the floor.";
    case "shared":
    default:
      return "This looks like a shared issue. Upstream replenishment signals and store-floor execution are both contributing to the same stock gap.";
  }
}

function buildStoreRailNextAction(leaning: StoreRailLeaning) {
  switch (leaning) {
    case "store-execution":
      return "Review the affected shift's shelf-check and replenishment ownership before the next peak window.";
    case "hq-or-system":
      return "Pull the last two weeks of affected SKUs and compare store sell-through with the replenishment or allocation signal being sent from HQ.";
    case "shared":
    default:
      return "Choose one repeated stockout SKU and trace it from HQ recommendation to store shelf execution to find the first point where the signal drifts.";
  }
}

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

const storeStockReplenishmentRail: DiagnosticRail = {
  key: "store-stock-replenishment",
  label: "Store stock and replenishment",
  workbenchSummary:
    "Turn a store-level stock complaint into a clear diagnosis, separating store execution gaps from HQ or system issues, with one next action for the manager.",
  interviewContextLabel: "Store stock and replenishment",
  stepOrder: sharedStepOrder,
  steps: {
    "problem-symptom": {
      key: "problem-symptom",
      field: "painType",
      prompt: () =>
        "In the store, what goes wrong most often, stockouts, overstock, or inventory accuracy drift?",
    },
    "frequency-pattern": {
      key: "frequency-pattern",
      field: "frequency",
      prompt: (state) =>
        state.fields.painType === "stockout"
          ? "How often does the store end up with an empty shelf or missing sellable stock?"
          : "How often does this store stock issue show up?",
    },
    "time-window": {
      key: "time-window",
      field: "timeWindow",
      prompt: () =>
        "When does this show up most often, during peak trading, campaign windows, shift handoffs, or after deliveries?",
    },
    "affected-scope": {
      key: "affected-scope",
      field: "affectedScope",
      prompt: () =>
        "Which SKUs, categories, promo displays, or shelf zones are affected most often?",
    },
    "people-involved": {
      key: "people-involved",
      field: "peopleInvolved",
      prompt: () =>
        "Who is usually involved when the stock gap appears, store staff, shift leads, HQ planning, or system owners?",
    },
    "current-workaround": {
      key: "current-workaround",
      field: "currentWorkaround",
      prompt: () =>
        "How is the store currently working around the stock problem?",
    },
    "operational-impact": {
      key: "operational-impact",
      field: "operationalImpact",
      prompt: () =>
        "What operational impact does this create for the floor, the customer, or the next shift?",
    },
  },
  buildDiagnosis: (fields) => {
    const leaning = classifyStoreRailLeaning(fields);

    return {
      painType: fields.painType,
      severity: fields.painType === "stockout" ? "high" : "medium",
      frequency: fields.frequency,
      timeWindow: fields.timeWindow,
      affectedScope: fields.affectedScope,
      peopleInvolved: fields.peopleInvolved,
      currentWorkaround: fields.currentWorkaround,
      operationalImpact: fields.operationalImpact,
      likelyRootCause: buildStoreRailRootCause(fields.painType, leaning),
      nextAction: buildStoreRailNextAction(leaning),
    };
  },
};

const storeInventoryControlRail: DiagnosticRail = {
  key: "store-inventory-control",
  label: "Store inventory control",
  workbenchSummary:
    "Turn recurring count drift, shelf mismatch, and backroom confusion into a clear inventory-control diagnosis, with one next action for the supervisor.",
  interviewContextLabel: "Store inventory control",
  stepOrder: sharedStepOrder,
  steps: {
    "problem-symptom": {
      key: "problem-symptom",
      field: "painType",
      prompt: () =>
        "In the store, what goes wrong most often, stockouts, overstock, or inventory accuracy drift?",
    },
    "frequency-pattern": {
      key: "frequency-pattern",
      field: "frequency",
      prompt: (state) =>
        state.fields.painType === "inventory-accuracy"
          ? "How often do counts drift away from what the shelf or backroom really has?"
          : "How often does this store inventory control issue show up?",
    },
    "time-window": {
      key: "time-window",
      field: "timeWindow",
      prompt: () =>
        "When does the mismatch show up most often, during cycle counts, shift changes, after deliveries, or after promo resets?",
    },
    "affected-scope": {
      key: "affected-scope",
      field: "affectedScope",
      prompt: () =>
        "Which shelves, categories, backroom locations, or count routines are affected most often?",
    },
    "people-involved": {
      key: "people-involved",
      field: "peopleInvolved",
      prompt: () =>
        "Who is usually involved when the mismatch appears, floor staff, stock controllers, shift leads, or receiving?",
    },
    "current-workaround": {
      key: "current-workaround",
      field: "currentWorkaround",
      prompt: () =>
        "How is the team currently working around the count drift or shelf mismatch?",
    },
    "operational-impact": {
      key: "operational-impact",
      field: "operationalImpact",
      prompt: () =>
        "What operational impact does this create for replenishment, customer availability, or recount effort?",
    },
  },
  buildDiagnosis: (fields) => {
    if (fields.painType === "inventory-accuracy") {
      return {
        painType: fields.painType,
        severity: "medium",
        frequency: fields.frequency,
        timeWindow: fields.timeWindow,
        affectedScope: fields.affectedScope,
        peopleInvolved: fields.peopleInvolved,
        currentWorkaround: fields.currentWorkaround,
        operationalImpact: fields.operationalImpact,
        likelyRootCause:
          "Store inventory control is drifting between shelf activity, backroom handling, and count discipline, so recorded stock no longer matches the floor.",
        nextAction:
          "Pick one high-noise category and compare shelf, backroom, and system counts together during the next cycle count.",
      };
    }

    if (fields.painType === "stockout") {
      return {
        painType: fields.painType,
        severity: "high",
        frequency: fields.frequency,
        timeWindow: fields.timeWindow,
        affectedScope: fields.affectedScope,
        peopleInvolved: fields.peopleInvolved,
        currentWorkaround: fields.currentWorkaround,
        operationalImpact: fields.operationalImpact,
        likelyRootCause:
          "Inventory control is overstating sellable stock, so replenishment reacts too late and the shelf goes empty before the mismatch is caught.",
        nextAction:
          "Audit one repeated stockout SKU across shelf, backroom, and system counts before the next replenishment decision.",
      };
    }

    return {
      painType: fields.painType,
      severity: "medium",
      frequency: fields.frequency,
      timeWindow: fields.timeWindow,
      affectedScope: fields.affectedScope,
      peopleInvolved: fields.peopleInvolved,
      currentWorkaround: fields.currentWorkaround,
      operationalImpact: fields.operationalImpact,
      likelyRootCause:
        "Store inventory control is out of sync with physical handling, so stock piles up in the wrong location or gets corrected too late to trust the on-hand number.",
      nextAction:
        "Trace one overstocked SKU from delivery to shelf and verify each location before the next cycle count closes.",
    };
  },
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
  "store-stock-replenishment": storeStockReplenishmentRail,
  "store-inventory-control": storeInventoryControlRail,
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
