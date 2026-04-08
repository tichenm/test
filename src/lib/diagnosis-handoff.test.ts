import { describe, expect, it } from "vitest";

import {
  buildDiagnosisHandoffBrief,
  buildDiagnosisHandoffFilename,
} from "@/lib/diagnosis-handoff";

describe("diagnosis handoff", () => {
  it("builds a manager-ready handoff brief from a completed diagnosis", () => {
    const brief = buildDiagnosisHandoffBrief({
      railKey: "warehouse-receiving",
      storeName: "North Hub",
      roleName: "Warehouse supervisor",
      startedAt: new Date("2026-04-06T09:00:00.000Z"),
      diagnosisRecord: {
        painType: "overstock",
        severity: "medium",
        frequency: "daily",
        timeWindow: "during the first inbound wave",
        affectedScope: "Dock 3 and the cold-chain staging lane",
        peopleInvolved: "Receiving clerks and putaway leads",
        currentWorkaround: "Teams reshuffle labor manually after trucks arrive.",
        operationalImpact: "Putaway falls behind and replenishment misses the next cut-off.",
        likelyRootCause:
          "Receiving-to-putaway ownership is not clear when multiple inbound loads land together.",
        nextAction: "Assign a named putaway lead for the first inbound wave and review the handoff.",
        aiSummary:
          "Receiving is backing up at Dock 3 because ownership shifts too late. The backlog then pushes putaway past the next replenishment cut-off. Start by assigning a named putaway lead for the first inbound wave.",
        reviewStatus: "reviewing",
        ownerName: "Kai",
        reviewNote: "Pilot the new handoff on Tuesday morning.",
      },
    });

    expect(brief).toContain("引导式痛点诊断交接摘要");
    expect(brief).toContain("诊断流程：仓库收货");
    expect(brief).toContain("站点：North Hub");
    expect(brief).toContain("角色：Warehouse supervisor");
    expect(brief).toContain("痛点类型：积压");
    expect(brief).toContain("跟进状态：跟进中");
    expect(brief).toContain("负责人：Kai");
    expect(brief).toContain("跟进备注：Pilot the new handoff on Tuesday morning.");
    expect(brief).toContain("总结：Receiving is backing up at Dock 3");
  });

  it("falls back cleanly when optional management fields are missing", () => {
    const brief = buildDiagnosisHandoffBrief({
      railKey: "inventory-replenishment",
      storeName: null,
      roleName: null,
      startedAt: new Date("2026-04-06T08:00:00.000Z"),
      diagnosisRecord: {
        painType: "stockout",
        severity: "high",
        frequency: "weekly",
        timeWindow: "before weekend open",
        affectedScope: "Fast-moving promo SKUs",
        peopleInvolved: "Shift leads",
        currentWorkaround: "Slack reminders and manual shelf checks.",
        operationalImpact: "Sales are missed and store teams make rush transfers.",
        likelyRootCause: "Friday replenishment handoff lands too late.",
        nextAction: "Move the Friday replenishment review earlier.",
        aiSummary:
          "Weekend stockouts are being caused by a late Friday replenishment handoff. Start by moving the review earlier in the day.",
        reviewStatus: "new",
        ownerName: null,
        reviewNote: null,
      },
    });

    expect(brief).toContain("站点：未填写");
    expect(brief).toContain("角色：未填写");
    expect(brief).toContain("负责人：未指派");
    expect(brief).toContain("跟进备注：还没有跟进备注。");
  });

  it("creates a stable download filename", () => {
    expect(
      buildDiagnosisHandoffFilename({
        railKey: "warehouse-receiving",
        storeName: "North Hub",
        diagnosisRecord: {
          painType: "inventory-accuracy",
        },
      }),
    ).toBe("north-hub-warehouse-receiving-inventory-accuracy-handoff.txt");
  });

  it("renders manager-friendly pain labels for project rollout diagnoses", () => {
    const brief = buildDiagnosisHandoffBrief({
      railKey: "project-rollout-handoff",
      storeName: "Region East launch",
      roleName: "Project manager",
      startedAt: new Date("2026-04-07T09:00:00.000Z"),
      diagnosisRecord: {
        painType: "handoff-delay",
        severity: "high",
        frequency: "every weekly cutover",
        timeWindow: "final readiness week",
        affectedScope: "vendor signoff and site enablement",
        peopleInvolved: "project manager and regional ops",
        currentWorkaround: "manual chase messages",
        operationalImpact: "launch slips by days",
        likelyRootCause: "Handoff ownership is unclear between rollout and field execution.",
        nextAction: "Assign one handoff owner and one readiness checkpoint.",
        aiSummary: "Launch status is stalling on the same cross-team handoff.",
        reviewStatus: "new",
      },
    });

    expect(brief).toContain("痛点类型：交接延迟");
  });
});
