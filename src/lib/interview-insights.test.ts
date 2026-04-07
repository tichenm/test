import { describe, expect, it } from "vitest";

import { buildInterviewInsights } from "@/lib/interview-insights";

describe("buildInterviewInsights", () => {
  it("aggregates completed diagnoses into manager-friendly buckets", () => {
    const insights = buildInterviewInsights([
      {
        id: "completed-1",
        railKey: "inventory-replenishment",
        storeName: "Store 12",
        roleName: "Store manager",
        status: "COMPLETED",
        startedAt: new Date("2026-04-06T08:00:00.000Z"),
        diagnosisRecord: {
          painType: "stockout",
          severity: "high",
          nextAction: "Review replenishment timing",
          reviewStatus: "new",
        },
      },
      {
        id: "completed-2",
        railKey: "warehouse-receiving",
        storeName: "North Hub",
        roleName: "Warehouse supervisor",
        status: "COMPLETED",
        startedAt: new Date("2026-04-06T09:00:00.000Z"),
        diagnosisRecord: {
          painType: "overstock",
          severity: "medium",
          nextAction: "Review receiving handoff",
          reviewStatus: "reviewing",
        },
      },
      {
        id: "completed-3",
        railKey: "warehouse-receiving",
        storeName: "North Hub",
        roleName: "Warehouse supervisor",
        status: "COMPLETED",
        startedAt: new Date("2026-04-06T10:00:00.000Z"),
        diagnosisRecord: {
          painType: "overstock",
          severity: "medium",
          nextAction: "Review receiving handoff",
          reviewStatus: "resolved",
        },
      },
      {
        id: "active-1",
        railKey: "inventory-replenishment",
        storeName: null,
        roleName: null,
        status: "ACTIVE",
        startedAt: new Date("2026-04-06T11:00:00.000Z"),
        diagnosisRecord: null,
      },
    ]);

    expect(insights.summary).toEqual({
      totalSessions: 4,
      completedSessions: 3,
      activeSessions: 1,
      topPainType: "Overstock",
      topPainTypeCount: 2,
    });
    expect(insights.railBreakdown).toEqual([
      {
        key: "warehouse-receiving",
        label: "Warehouse receiving",
        count: 2,
      },
      {
        key: "inventory-replenishment",
        label: "Inventory and replenishment",
        count: 1,
      },
    ]);
    expect(insights.painTypeBreakdown).toEqual([
      { key: "overstock", label: "Overstock", count: 2 },
      { key: "stockout", label: "Stockout", count: 1 },
    ]);
    expect(insights.severityBreakdown).toEqual([
      { key: "medium", label: "medium", count: 2 },
      { key: "high", label: "high", count: 1 },
    ]);
    expect(insights.storeBreakdown).toEqual([
      { key: "North Hub", label: "North Hub", count: 2 },
      { key: "Store 12", label: "Store 12", count: 1 },
    ]);
    expect(insights.roleBreakdown).toEqual([
      { key: "Warehouse supervisor", label: "Warehouse supervisor", count: 2 },
      { key: "Store manager", label: "Store manager", count: 1 },
    ]);
    expect(insights.reviewStatusBreakdown).toEqual([
      { key: "new", label: "new", count: 1 },
      { key: "resolved", label: "resolved", count: 1 },
      { key: "reviewing", label: "reviewing", count: 1 },
    ]);
    expect(insights.topActions).toEqual([
      { label: "Review receiving handoff", count: 2 },
      { label: "Review replenishment timing", count: 1 },
    ]);
    expect(insights.recentCompleted.map((item) => item.id)).toEqual([
      "completed-3",
      "completed-2",
      "completed-1",
    ]);
  });

  it("falls back cleanly when there are no completed diagnoses yet", () => {
    const insights = buildInterviewInsights([
      {
        id: "active-1",
        railKey: "inventory-replenishment",
        storeName: null,
        roleName: null,
        status: "ACTIVE",
        startedAt: new Date("2026-04-06T11:00:00.000Z"),
        diagnosisRecord: null,
      },
    ]);

    expect(insights.summary).toEqual({
      totalSessions: 1,
      completedSessions: 0,
      activeSessions: 1,
      topPainType: null,
      topPainTypeCount: 0,
    });
    expect(insights.railBreakdown).toEqual([]);
    expect(insights.painTypeBreakdown).toEqual([]);
    expect(insights.severityBreakdown).toEqual([]);
    expect(insights.storeBreakdown).toEqual([]);
    expect(insights.roleBreakdown).toEqual([]);
    expect(insights.reviewStatusBreakdown).toEqual([]);
    expect(insights.topActions).toEqual([]);
    expect(insights.recentCompleted).toEqual([]);
  });
});
