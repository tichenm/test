import { z } from "zod";
import { DIAGNOSIS_PAIN_TYPES } from "@/lib/pain-types";

export const diagnosisRecordSchema = z.object({
  painType: z.enum(DIAGNOSIS_PAIN_TYPES),
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
