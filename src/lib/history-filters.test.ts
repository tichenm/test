import { describe, expect, it } from "vitest";

import {
  buildHistoryFilterHref,
  buildHistoryFilterOptions,
  filterInterviewSessions,
  parseHistoryFilters,
} from "@/lib/history-filters";

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
    id: "completed-2",
    railKey: "warehouse-receiving",
    storeName: "North Hub",
    roleName: "Warehouse supervisor",
    status: "COMPLETED" as const,
    startedAt: new Date("2026-04-06T09:00:00.000Z"),
    diagnosisRecord: {
      painType: "overstock",
      severity: "medium",
      reviewStatus: "reviewing",
      likelyRootCause: "Putaway handoff is unclear",
      nextAction: "Review receiving handoff",
      ownerName: "Kai",
      reviewNote: "Dock 3 congestion",
      aiSummary: "Inbound pallets are waiting too long.",
    },
  },
  {
    id: "active-1",
    railKey: "warehouse-receiving",
    storeName: "North Hub",
    roleName: "Inbound lead",
    status: "ACTIVE" as const,
    startedAt: new Date("2026-04-06T10:00:00.000Z"),
    diagnosisRecord: null,
  },
];

describe("history filters", () => {
  it("normalizes invalid URL params back to safe defaults", () => {
    expect(
      parseHistoryFilters({
        status: "unknown",
        railKey: "not-a-rail",
        reviewStatus: "bad",
        painType: "broken",
        storeName: " Store 12 ",
        roleName: " Store manager ",
        q: "  weekend  ",
      }),
    ).toEqual({
      status: "all",
      railKey: "all",
      reviewStatus: "all",
      painType: "all",
      severity: "all",
      storeName: "Store 12",
      roleName: "Store manager",
      query: "weekend",
    });
  });

  it("filters interview sessions across exact filters and keyword search", () => {
    const filters = parseHistoryFilters({
      status: "completed",
      railKey: "warehouse-receiving",
      reviewStatus: "reviewing",
      painType: "overstock",
      storeName: "North Hub",
      roleName: "Warehouse supervisor",
      q: "dock 3",
    });

    expect(filterInterviewSessions(sessions, filters).map((session) => session.id)).toEqual([
      "completed-2",
    ]);
  });

  it("matches keyword search against management notes and diagnosis summaries", () => {
    const filters = parseHistoryFilters({
      q: "weekend",
    });

    expect(filterInterviewSessions(sessions, filters).map((session) => session.id)).toEqual([
      "completed-1",
    ]);
  });

  it("builds unique store and role options from existing sessions", () => {
    expect(buildHistoryFilterOptions(sessions)).toEqual({
      roleNames: ["Inbound lead", "Store manager", "Warehouse supervisor"],
      storeNames: ["North Hub", "Store 12"],
    });
  });

  it("builds clean history drill-down links without default params", () => {
    expect(
      buildHistoryFilterHref({
        railKey: "warehouse-receiving",
        reviewStatus: "reviewing",
        query: "dock 3",
      }),
    ).toBe("/history?railKey=warehouse-receiving&reviewStatus=reviewing&q=dock+3");

    expect(buildHistoryFilterHref({})).toBe("/history");
  });

  it("supports exact severity filtering for insights drilldowns", () => {
    const filters = parseHistoryFilters({
      status: "completed",
      severity: "high",
    });

    expect(filterInterviewSessions(sessions, filters).map((session) => session.id)).toEqual([
      "completed-1",
    ]);
    expect(buildHistoryFilterHref({ status: "completed", severity: "high" })).toBe(
      "/history?status=completed&severity=high",
    );
  });
});
