import { z } from "zod";

export const diagnosisRecordSchema = z.object({
  painType: z.enum(["stockout", "overstock", "inventory-accuracy"]),
  severity: z.enum(["medium", "high"]),
  frequency: z.string().min(1),
  timeWindow: z.string().min(1),
  affectedScope: z.string().min(1),
  peopleInvolved: z.string().min(1),
  currentWorkaround: z.string().min(1),
  operationalImpact: z.string().min(1),
  likelyRootCause: z.string().min(1),
  nextAction: z.string().min(1),
});

export type DiagnosisRecord = z.infer<typeof diagnosisRecordSchema>;
