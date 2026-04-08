import type { DiagnosisRecord } from "@/lib/diagnosis-schema";
import type { PainType } from "@/lib/pain-types";

export type RailKey =
  | "inventory-replenishment"
  | "store-stock-replenishment"
  | "store-inventory-control"
  | "store-service-complaints"
  | "project-rollout-handoff"
  | "warehouse-receiving";
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
  suggestedAnswers?: ReadonlyArray<{
    label: string;
    value: string;
  }>;
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

const inventorySymptomChoices = [
  { label: "缺货", value: "stockout" },
  { label: "积压", value: "overstock" },
  { label: "库存准确性偏差", value: "inventory-accuracy" },
] as const;

const serviceSymptomChoices = [
  { label: "等待太久", value: "service-delay" },
  { label: "解释不一致", value: "service-inconsistency" },
  { label: "服务动作接不上", value: "handoff-delay" },
] as const;

const serviceScopeChoices = [
  { label: "迎宾分流", value: "迎宾分流" },
  { label: "点单到收银", value: "点单到收银" },
  { label: "出餐取货", value: "出餐取货" },
  { label: "现场解释安抚", value: "现场解释安抚" },
  { label: "客诉接手处理", value: "客诉接手处理" },
] as const;

const servicePeopleChoices = [
  { label: "收银和前场伙伴", value: "收银和前场伙伴" },
  { label: "前场和出餐伙伴", value: "前场和出餐伙伴" },
  { label: "出餐和值班店长", value: "出餐和值班店长" },
  { label: "值班店长和客诉处理人", value: "值班店长和客诉处理人" },
] as const;

const projectSymptomChoices = [
  { label: "交接延迟", value: "handoff-delay" },
  { label: "执行偏差", value: "execution-drift" },
  { label: "依赖盲区", value: "dependency-blindspot" },
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
        ? "这更像是门店执行问题。门店没能在缺货真正影响顾客之前，稳定地发现并纠正货架缺口。"
        : "这更像是门店执行问题。一线现场的补货与货架管控节奏，已经偏离了原本应有的标准。";
    case "hq-or-system":
      return "这更像是上游或系统问题。门店正在反复应对与现场实际情况不匹配的补货或计划信号。";
    case "shared":
    default:
      return "这更像是共同导致的问题。上游补货信号和门店现场执行都在推动同一个缺货结果。";
  }
}

function buildStoreRailNextAction(leaning: StoreRailLeaning) {
  switch (leaning) {
    case "store-execution":
      return "在下一个高峰时段前，先复盘受影响班次的货架检查和补货责任分工。";
    case "hq-or-system":
      return "拉出过去两周受影响 SKU 的数据，对比门店真实销量与总部下发的补货或分配信号。";
    case "shared":
    default:
      return "挑一个反复缺货的 SKU，从总部建议一路追到门店上架执行，找出信号第一次偏移的位置。";
  }
}

const inventoryReplenishmentRail: DiagnosticRail = {
  key: "inventory-replenishment",
  label: "库存与补货",
  workbenchSummary:
    "把模糊的库存或补货抱怨收敛成清晰的运营问题，并给出一个优先动作。",
  interviewContextLabel: "库存与补货",
  stepOrder: sharedStepOrder,
  steps: {
    "problem-symptom": {
      key: "problem-symptom",
      field: "painType",
      suggestedAnswers: inventorySymptomChoices,
      prompt: () =>
        "最常出问题的是哪一类，缺货、积压，还是库存准确性偏差？",
    },
    "frequency-pattern": {
      key: "frequency-pattern",
      field: "frequency",
      prompt: (state) =>
        state.fields.painType === "stockout"
          ? "这种情况下，缺货通常多久发生一次？"
          : "这个问题通常多久出现一次？",
    },
    "time-window": {
      key: "time-window",
      field: "timeWindow",
      prompt: () => "这个问题最常在什么时候发生？",
    },
    "affected-scope": {
      key: "affected-scope",
      field: "affectedScope",
      prompt: () => "受影响的通常是哪些商品、班次或门店区域？",
    },
    "people-involved": {
      key: "people-involved",
      field: "peopleInvolved",
      prompt: () => "这个问题出现时，通常会牵涉到哪些人？",
    },
    "current-workaround": {
      key: "current-workaround",
      field: "currentWorkaround",
      prompt: () => "团队现在是怎么临时补救这个问题的？",
    },
    "operational-impact": {
      key: "operational-impact",
      field: "operationalImpact",
      prompt: () => "这个问题在一线现场造成了什么运营影响？",
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
        ? "补货交接过晚，导致快销商品错过下一轮补货节奏。"
        : "门店执行已经偏离原本设计的补货节奏。",
    nextAction:
      fields.painType === "stockout"
        ? "在下一个周末班次前，先复盘补货交接的时间点和责任分配。"
        : "先复盘受影响流程中的补货责任和节奏安排。",
  }),
};

const storeStockReplenishmentRail: DiagnosticRail = {
  key: "store-stock-replenishment",
  label: "门店库存与补货",
  workbenchSummary:
    "把门店层面的库存抱怨拆成清晰诊断，区分门店执行缺口和上游系统问题，并给出一个经理可先推进的动作。",
  interviewContextLabel: "门店库存与补货",
  stepOrder: sharedStepOrder,
  steps: {
    "problem-symptom": {
      key: "problem-symptom",
      field: "painType",
      suggestedAnswers: inventorySymptomChoices,
      prompt: () =>
        "在门店里，最常出问题的是哪一类，缺货、积压，还是库存准确性偏差？",
    },
    "frequency-pattern": {
      key: "frequency-pattern",
      field: "frequency",
      prompt: (state) =>
        state.fields.painType === "stockout"
          ? "门店货架空掉或可售库存缺失，通常多久会发生一次？"
          : "这个门店库存问题通常多久出现一次？",
    },
    "time-window": {
      key: "time-window",
      field: "timeWindow",
      prompt: () =>
        "这个问题最常在什么时候出现，高峰营业时、活动档期、班次交接，还是到货之后？",
    },
    "affected-scope": {
      key: "affected-scope",
      field: "affectedScope",
      prompt: () =>
        "最常受影响的是哪些 SKU、品类、促销陈列或货架区域？",
    },
    "people-involved": {
      key: "people-involved",
      field: "peopleInvolved",
      prompt: () =>
        "库存缺口出现时，通常会牵涉哪些人，门店员工、值班负责人、总部计划，还是系统负责人？",
    },
    "current-workaround": {
      key: "current-workaround",
      field: "currentWorkaround",
      prompt: () =>
        "门店现在是怎么临时补救这个库存问题的？",
    },
    "operational-impact": {
      key: "operational-impact",
      field: "operationalImpact",
      prompt: () =>
        "这个问题会给现场、顾客，或下一个班次带来什么影响？",
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
  label: "门店库存管控",
  workbenchSummary:
    "把反复出现的盘点偏差、货架不一致和后仓混乱收敛成清晰的库存管控诊断，并给出一个主管可先推动的动作。",
  interviewContextLabel: "门店库存管控",
  stepOrder: sharedStepOrder,
  steps: {
    "problem-symptom": {
      key: "problem-symptom",
      field: "painType",
      suggestedAnswers: inventorySymptomChoices,
      prompt: () =>
        "在门店里，最常出问题的是哪一类，缺货、积压，还是库存准确性偏差？",
    },
    "frequency-pattern": {
      key: "frequency-pattern",
      field: "frequency",
      prompt: (state) =>
        state.fields.painType === "inventory-accuracy"
          ? "系统盘点和货架或后仓实物对不上的情况，通常多久发生一次？"
          : "这个门店库存管控问题通常多久出现一次？",
    },
    "time-window": {
      key: "time-window",
      field: "timeWindow",
      prompt: () =>
        "这种不一致最常在什么时候出现，盘点时、换班时、到货后，还是促销换陈列之后？",
    },
    "affected-scope": {
      key: "affected-scope",
      field: "affectedScope",
      prompt: () =>
        "最常受影响的是哪些货架、品类、后仓位置或盘点流程？",
    },
    "people-involved": {
      key: "people-involved",
      field: "peopleInvolved",
      prompt: () =>
        "这种不一致出现时，通常会牵涉哪些人，一线员工、库存管理员、值班负责人，还是收货人员？",
    },
    "current-workaround": {
      key: "current-workaround",
      field: "currentWorkaround",
      prompt: () =>
        "团队现在是怎么临时补救盘点偏差或货架不一致的？",
    },
    "operational-impact": {
      key: "operational-impact",
      field: "operationalImpact",
      prompt: () =>
        "这个问题会给补货、顾客可得性，或复盘复点带来什么影响？",
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
          "门店库存管控在货架动作、后仓处理和盘点纪律之间发生偏移，所以系统库存已经和现场实物不一致。",
        nextAction:
          "挑一个噪音最高的品类，在下一次盘点时把货架、后仓和系统数量放在一起核对。",
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
          "库存管控高估了可售库存，导致补货反应过慢，等发现偏差时货架已经空了。",
        nextAction:
          "在下一次补货决策前，选一个反复缺货的 SKU，把货架、后仓和系统数量逐一核对。",
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
        "门店库存管控和现场实物流转不同步，导致库存堆在错误位置，或者纠偏太晚，无法信任当前在库数。",
      nextAction:
        "选一个积压 SKU，从到货一路追到上架，在下一次盘点结束前核对每个位置。",
    };
  },
};

const storeServiceComplaintsRail: DiagnosticRail = {
  key: "store-service-complaints",
  label: "门店服务体验与客诉",
  workbenchSummary:
    "把高峰期顾客抱怨收敛成清晰的服务链路问题，找出该先拉哪些岗位一起改，并给出一个先落地的动作。",
  interviewContextLabel: "门店服务体验与客诉",
  stepOrder: sharedStepOrder,
  steps: {
    "problem-symptom": {
      key: "problem-symptom",
      field: "painType",
      suggestedAnswers: serviceSymptomChoices,
      prompt: () =>
        "高峰期最常让顾客不满的是哪一类，等待太久、解释不一致，还是服务动作接不上？",
    },
    "frequency-pattern": {
      key: "frequency-pattern",
      field: "frequency",
      prompt: (state) => {
        switch (state.fields.painType) {
          case "service-delay":
            return "顾客等待明显变长的情况，通常多久会出现一次？";
          case "service-inconsistency":
            return "同一问题顾客收到不同解释的情况，通常多久会出现一次？";
          case "handoff-delay":
            return "服务动作接不上、前后岗位需要反复补位的情况，通常多久会出现一次？";
          default:
            return "这个高峰服务问题通常多久出现一次？";
        }
      },
    },
    "time-window": {
      key: "time-window",
      field: "timeWindow",
      prompt: () =>
        "这个问题最常在什么时候出现，晚高峰、周末、促销时段，还是交接班前后？",
    },
    "affected-scope": {
      key: "affected-scope",
      field: "affectedScope",
      suggestedAnswers: serviceScopeChoices,
      prompt: () =>
        "最常卡住的是哪个服务环节，迎宾、点单、收银、出餐取货、现场解释，还是客诉处置？",
    },
    "people-involved": {
      key: "people-involved",
      field: "peopleInvolved",
      suggestedAnswers: servicePeopleChoices,
      prompt: () =>
        "这个问题出现时，通常会牵涉哪些岗位，收银、前场伙伴、出餐、值班店长，还是客诉处理人？",
    },
    "current-workaround": {
      key: "current-workaround",
      field: "currentWorkaround",
      prompt: () =>
        "团队现在通常怎么临时补位，谁会出来兜住现场和顾客解释？",
    },
    "operational-impact": {
      key: "operational-impact",
      field: "operationalImpact",
      prompt: () =>
        "这个问题会给顾客体验、投诉处理，或高峰现场节奏带来什么影响？",
    },
  },
  buildDiagnosis: (fields) => {
    if (fields.painType === "handoff-delay") {
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
          "高峰期服务链路在岗位交接和统一口径上不稳定，导致前后场一旦脱节，等待和投诉会一起放大。",
        nextAction:
          "在下一次高峰前，先复盘受影响服务环节里的交接时点、责任分配和统一口径，明确哪几个岗位要一起改。",
      };
    }

    if (fields.painType === "service-inconsistency") {
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
          "现场没有一套稳定的解释口径和升级责任，所以顾客一旦追问，前后岗位就会给出不同说法。",
        nextAction:
          "先挑一个最常被追问的场景，把前场、出餐和值班店长的解释口径对齐，再约定谁来接住升级投诉。",
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
        "高峰现场的服务节奏已经靠临时救火维持，说明岗位之间的接手时点和补位方式没有被稳定下来。",
      nextAction:
        "在下一次高峰前，先把等待最久的那个服务环节拉出来，复盘岗位之间什么时候该接手、谁负责补位。",
    };
  },
};

const projectRolloutHandoffRail: DiagnosticRail = {
  key: "project-rollout-handoff",
  label: "项目落地与交接",
  workbenchSummary:
    "把模糊的落地延期收敛成清晰的跨团队交付诊断，并给项目负责人一个下一步交接动作。",
  interviewContextLabel: "项目落地与交接",
  stepOrder: sharedStepOrder,
  steps: {
    "problem-symptom": {
      key: "problem-symptom",
      field: "painType",
      suggestedAnswers: projectSymptomChoices,
      prompt: () =>
        "在项目落地过程中，最常出问题的是哪一类，交接延迟、执行偏差，还是依赖盲区？",
    },
    "frequency-pattern": {
      key: "frequency-pattern",
      field: "frequency",
      prompt: (state) =>
        state.fields.painType === "handoff-delay"
          ? "交接卡住、导致下一个团队无法继续推进的情况，通常多久发生一次？"
          : "这个落地问题通常多久出现一次？",
    },
    "time-window": {
      key: "time-window",
      field: "timeWindow",
      prompt: () =>
        "这个问题最常在什么时候出现，项目启动、就绪评审、上线周，还是上线后收尾阶段？",
    },
    "affected-scope": {
      key: "affected-scope",
      field: "affectedScope",
      prompt: () =>
        "最常受影响的是哪个工作流、里程碑、站点，或外部依赖？",
    },
    "people-involved": {
      key: "people-involved",
      field: "peopleInvolved",
      prompt: () =>
        "项目卡住时，通常会牵涉哪些人，项目负责人、运营、供应商负责人，还是区域团队？",
    },
    "current-workaround": {
      key: "current-workaround",
      field: "currentWorkaround",
      prompt: () =>
        "团队现在是怎么临时补救这个落地或交接缺口的？",
    },
    "operational-impact": {
      key: "operational-impact",
      field: "operationalImpact",
      prompt: () =>
        "这个问题会给上线节奏、准备度，或现场执行带来什么影响？",
    },
  },
  buildDiagnosis: (fields) => {
    if (fields.painType === "handoff-delay") {
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
          "项目交接会卡住，是因为计划、执行和现场团队之间的责任切换不够明确，无法承受真实上线压力。",
        nextAction:
          "为受影响里程碑指定一个明确交接负责人，并在下一次检查时统一使用一份共享就绪视图。",
      };
    }

    if (fields.painType === "dependency-blindspot") {
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
          "项目计划遗漏了一个或多个真实依赖，导致下游团队等到项目已经推进时才发现准备缺口。",
        nextAction:
          "找出上次延期里被漏掉的那个依赖，在下一个上线关口前补上一个明确的就绪检查。",
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
        "跨团队执行发生偏差，是因为落地要求在规划阶段很清楚，但落到日常交付和状态负责时过于松散。",
      nextAction:
        "挑一个正在滑坡的工作流，在下一次落地评审前把负责人、截止时间和完成标准都收紧。",
    };
  },
};

const warehouseReceivingRail: DiagnosticRail = {
  key: "warehouse-receiving",
  label: "仓库收货",
  workbenchSummary:
    "把模糊的收货抱怨收敛成清晰的执行问题，并给现场一个可先落地的动作。",
  interviewContextLabel: "仓库收货",
  stepOrder: sharedStepOrder,
  steps: {
    "problem-symptom": {
      key: "problem-symptom",
      field: "painType",
      suggestedAnswers: inventorySymptomChoices,
      prompt: () =>
        "在收货环节，最常出问题的是哪一类，缺货、积压，还是库存准确性偏差？",
    },
    "frequency-pattern": {
      key: "frequency-pattern",
      field: "frequency",
      prompt: (state) =>
        state.fields.painType === "overstock"
          ? "到货库存还没上架入位就开始堆积的情况，通常多久发生一次？"
          : "这个收货问题通常多久出现一次？",
    },
    "time-window": {
      key: "time-window",
      field: "timeWindow",
      prompt: () => "收货积压最常在什么时候出现？",
    },
    "affected-scope": {
      key: "affected-scope",
      field: "affectedScope",
      prompt: () => "最常受影响的是哪些到货 SKU、月台或暂存区域？",
    },
    "people-involved": {
      key: "people-involved",
      field: "peopleInvolved",
      prompt: () => "收货开始积压时，通常会牵涉哪些人？",
    },
    "current-workaround": {
      key: "current-workaround",
      field: "currentWorkaround",
      prompt: () => "团队现在是怎么临时处理收货积压的？",
    },
    "operational-impact": {
      key: "operational-impact",
      field: "operationalImpact",
      prompt: () => "这个问题会对收货和入位带来什么运营影响？",
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
        ? "收货到入位之间缺少清晰交接，导致库存长时间滞留在暂存区，责任切换太晚。"
        : "收货执行已经偏离原本设计的入库管控节奏。",
    nextAction:
      fields.painType === "overstock"
        ? "先复盘受影响到货窗口里的收货到入位责任分工和交接时间。"
        : "先复盘受影响流程里的收货责任和交接时间。",
  }),
};

export const DEFAULT_RAIL_KEY: RailKey = "inventory-replenishment";

const diagnosticRails: Record<RailKey, DiagnosticRail> = {
  "inventory-replenishment": inventoryReplenishmentRail,
  "store-stock-replenishment": storeStockReplenishmentRail,
  "store-inventory-control": storeInventoryControlRail,
  "store-service-complaints": storeServiceComplaintsRail,
  "project-rollout-handoff": projectRolloutHandoffRail,
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
