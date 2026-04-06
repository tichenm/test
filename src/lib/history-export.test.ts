import { describe, expect, it } from "vitest";

import {
  buildHistoryExportCsv,
  buildHistoryExportFilename,
} from "@/lib/history-export";

const sessions = [
  {
    id: "completed-1",
    railKey: "inventory-replenishment",
    storeName: "Store 12",
    roleName: "Store manager",
    status: "COMPLETED" as const,
    startedAt: new Date("2026-04-06T08:00:00.000Z"),
    diagnosisRecord: {
      painType: "stockout",
      severity: "high",
      reviewStatus: "new",
      likelyRootCause: "Late replenishment handoff",
      nextAction: "Review replenishment timing",
      ownerName: "Mina",
      reviewNote: "Weekend transfer issue",
      aiSummary: "Weekend stockouts are increasing.",
    },
  },
  {
    id: "active-1",
    railKey: "warehouse-receiving",
    storeName: null,
    roleName: null,
    status: "ACTIVE" as const,
    startedAt: new Date("2026-04-06T10:00:00.000Z"),
    diagnosisRecord: null,
  },
];

describe("history export", () => {
  it("builds a CSV export with manager-facing labels and empty fallbacks", () => {
    const csv = buildHistoryExportCsv(sessions);

    expect(csv).toContain(
      "Session ID,Started At,Session Status,Workflow,Site,Role,Pain Type,Severity,Review Status,Owner,Next Action,Likely Root Cause,Review Note,Summary",
    );
    expect(csv).toContain("completed-1");
    expect(csv).toContain("Inventory and replenishment");
    expect(csv).toContain("New");
    expect(csv).toContain("active-1");
    expect(csv).toContain("Active draft");
    expect(csv).toContain("Not specified");
  });

  it("escapes commas and quotes in exported fields", () => {
    const csv = buildHistoryExportCsv([
      {
        id: "completed-2",
        railKey: "warehouse-receiving",
        storeName: "North Hub",
        roleName: "Inbound \"A\" lead",
        status: "COMPLETED" as const,
        startedAt: new Date("2026-04-06T09:00:00.000Z"),
        diagnosisRecord: {
          painType: "overstock",
          severity: "medium",
          reviewStatus: "reviewing",
          likelyRootCause: "Dock 3, line 2 handoff is unclear",
          nextAction: "Review receiving handoff",
          ownerName: null,
          reviewNote: null,
          aiSummary: "Inbound backlog is growing.",
        },
      },
    ]);

    expect(csv).toContain("\"Inbound \"\"A\"\" lead\"");
    expect(csv).toContain("\"Dock 3, line 2 handoff is unclear\"");
  });

  it("creates a dated filename for filtered history exports", () => {
    expect(buildHistoryExportFilename(new Date("2026-04-06T12:00:00.000Z"))).toBe(
      "guided-pain-history-2026-04-06.csv",
    );
  });
});
