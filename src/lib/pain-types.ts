export const DIAGNOSIS_PAIN_TYPES = [
  "stockout",
  "overstock",
  "inventory-accuracy",
  "handoff-delay",
  "execution-drift",
  "dependency-blindspot",
] as const;

export type PainType = (typeof DIAGNOSIS_PAIN_TYPES)[number];

export function isPainType(value: string): value is PainType {
  return DIAGNOSIS_PAIN_TYPES.includes(value as PainType);
}

export function getDiagnosisPainTypeLabel(painType: string) {
  switch (painType) {
    case "stockout":
      return "Stockout";
    case "overstock":
      return "Overstock";
    case "inventory-accuracy":
      return "Inventory accuracy";
    case "handoff-delay":
      return "Handoff delay";
    case "execution-drift":
      return "Execution drift";
    case "dependency-blindspot":
      return "Dependency blindspot";
    default:
      return painType
        .split("-")
        .filter(Boolean)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" ");
  }
}
