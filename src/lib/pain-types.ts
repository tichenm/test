export const DIAGNOSIS_PAIN_TYPES = [
  "stockout",
  "overstock",
  "inventory-accuracy",
  "staffing-gap",
  "schedule-instability",
  "shift-handoff-gap",
  "service-delay",
  "service-inconsistency",
  "handoff-delay",
  "execution-drift",
  "dependency-blindspot",
] as const;

export type PainType = (typeof DIAGNOSIS_PAIN_TYPES)[number];

export function isPainType(value: string): value is PainType {
  return DIAGNOSIS_PAIN_TYPES.includes(value as PainType);
}

const PAIN_TYPE_ALIASES: Record<string, PainType> = {
  stockout: "stockout",
  "缺货": "stockout",
  overstock: "overstock",
  "积压": "overstock",
  "inventory-accuracy": "inventory-accuracy",
  "库存准确性偏差": "inventory-accuracy",
  "库存不准": "inventory-accuracy",
  "staffing-gap": "staffing-gap",
  "人手不够": "staffing-gap",
  "人手缺口": "staffing-gap",
  "班次扛不住": "staffing-gap",
  "schedule-instability": "schedule-instability",
  "排班总变": "schedule-instability",
  "排班波动": "schedule-instability",
  "临时改班": "schedule-instability",
  "shift-handoff-gap": "shift-handoff-gap",
  "交接接不上": "shift-handoff-gap",
  "交接脱节": "shift-handoff-gap",
  "班次交接脱节": "shift-handoff-gap",
  "service-delay": "service-delay",
  "等待太久": "service-delay",
  "等待过长": "service-delay",
  "服务等待过长": "service-delay",
  "service-inconsistency": "service-inconsistency",
  "解释不一致": "service-inconsistency",
  "口径不一致": "service-inconsistency",
  "服务口径不一致": "service-inconsistency",
  "handoff-delay": "handoff-delay",
  "交接延迟": "handoff-delay",
  "服务动作接不上": "handoff-delay",
  "execution-drift": "execution-drift",
  "执行偏差": "execution-drift",
  "dependency-blindspot": "dependency-blindspot",
  "依赖盲区": "dependency-blindspot",
};

export function normalizePainTypeInput(value: string) {
  const normalized = value.trim().toLowerCase();

  return PAIN_TYPE_ALIASES[normalized] ?? value.trim();
}

export function getDiagnosisPainTypeLabel(painType: string) {
  switch (painType) {
    case "stockout":
      return "缺货";
    case "overstock":
      return "积压";
    case "inventory-accuracy":
      return "库存准确性偏差";
    case "staffing-gap":
      return "人手缺口";
    case "schedule-instability":
      return "排班波动";
    case "shift-handoff-gap":
      return "交接脱节";
    case "service-delay":
      return "等待过长";
    case "service-inconsistency":
      return "口径不一致";
    case "handoff-delay":
      return "交接延迟";
    case "execution-drift":
      return "执行偏差";
    case "dependency-blindspot":
      return "依赖盲区";
    default:
      return painType.replace(/-/g, " ");
  }
}
