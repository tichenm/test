export const DIAGNOSIS_PAIN_TYPES = [
  "stockout",
  "overstock",
  "inventory-accuracy",
  "staffing-gap",
  "schedule-instability",
  "shift-handoff-gap",
  "repair-delay",
  "recurring-breakdown",
  "vendor-response-gap",
  "shrinkage-spike",
  "waste-spike",
  "writeoff-response-gap",
  "promo-launch-delay",
  "display-breakdown",
  "signage-mismatch",
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
  "repair-delay": "repair-delay",
  "维修太慢": "repair-delay",
  "维修迟迟没好": "repair-delay",
  "设备修复太慢": "repair-delay",
  "recurring-breakdown": "recurring-breakdown",
  "反复坏": "recurring-breakdown",
  "反复故障": "recurring-breakdown",
  "总是重复坏": "recurring-breakdown",
  "vendor-response-gap": "vendor-response-gap",
  "报修没人接": "vendor-response-gap",
  "维修商没响应": "vendor-response-gap",
  "报修升级没人跟": "vendor-response-gap",
  "shrinkage-spike": "shrinkage-spike",
  "损耗偏高": "shrinkage-spike",
  "损耗突然上升": "shrinkage-spike",
  "盘点损耗偏高": "shrinkage-spike",
  "waste-spike": "waste-spike",
  "报废偏多": "waste-spike",
  "临期报废偏多": "waste-spike",
  "报废突然变多": "waste-spike",
  "writeoff-response-gap": "writeoff-response-gap",
  "报损没人跟": "writeoff-response-gap",
  "报损迟迟没人确认": "writeoff-response-gap",
  "报损升级没人跟": "writeoff-response-gap",
  "promo-launch-delay": "promo-launch-delay",
  "活动落地太慢": "promo-launch-delay",
  "活动该上没上": "promo-launch-delay",
  "促销上线延迟": "promo-launch-delay",
  "display-breakdown": "display-breakdown",
  "陈列没到位": "display-breakdown",
  "陈列执行断档": "display-breakdown",
  "端架没搭好": "display-breakdown",
  "signage-mismatch": "signage-mismatch",
  "价签口径不一致": "signage-mismatch",
  "价签和收银不一致": "signage-mismatch",
  "活动价签不一致": "signage-mismatch",
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
    case "repair-delay":
      return "维修太慢";
    case "recurring-breakdown":
      return "反复故障";
    case "vendor-response-gap":
      return "报修没人接";
    case "shrinkage-spike":
      return "损耗偏高";
    case "waste-spike":
      return "报废偏多";
    case "writeoff-response-gap":
      return "报损没人跟";
    case "promo-launch-delay":
      return "活动落地太慢";
    case "display-breakdown":
      return "陈列没到位";
    case "signage-mismatch":
      return "价签口径不一致";
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
