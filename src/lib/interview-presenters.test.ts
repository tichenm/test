import { describe, expect, it } from "vitest";

import {
  getEmptyHistoryCopy,
  getInterviewCardTitle,
  getDiagnosisReviewStatusLabel,
  getInterviewRailLabel,
} from "@/lib/interview-presenters";

describe("interview presenters", () => {
  it("uses the diagnosis pain type as the card title when a diagnosis exists", () => {
    expect(
      getInterviewCardTitle({
        railKey: "warehouse-receiving",
        diagnosisRecord: {
          painType: "overstock",
        },
      }),
    ).toBe("overstock");
  });

  it("falls back to the rail label when the diagnosis is still in progress", () => {
    expect(
      getInterviewCardTitle({
        railKey: "warehouse-receiving",
        diagnosisRecord: null,
      }),
    ).toBe("Warehouse receiving review in progress");
  });

  it("returns the configured rail label for display chips", () => {
    expect(getInterviewRailLabel("inventory-replenishment")).toBe(
      "Inventory and replenishment",
    );
    expect(getInterviewRailLabel("warehouse-receiving")).toBe("Warehouse receiving");
  });

  it("falls back to the default rail label when persisted data is invalid", () => {
    expect(getInterviewRailLabel("unknown-rail")).toBe("Inventory and replenishment");
    expect(
      getInterviewCardTitle({
        railKey: "unknown-rail",
        diagnosisRecord: null,
      }),
    ).toBe("Inventory and replenishment review in progress");
  });

  it("returns neutral empty-state copy instead of hardcoded inventory wording", () => {
    expect(getEmptyHistoryCopy()).toContain("guided review");
    expect(getEmptyHistoryCopy()).not.toContain("inventory and replenishment");
  });

  it("formats review workflow statuses for manager-facing chips", () => {
    expect(getDiagnosisReviewStatusLabel("new")).toBe("New");
    expect(getDiagnosisReviewStatusLabel("reviewing")).toBe("Reviewing");
    expect(getDiagnosisReviewStatusLabel("accepted")).toBe("Accepted");
    expect(getDiagnosisReviewStatusLabel("resolved")).toBe("Resolved");
    expect(getDiagnosisReviewStatusLabel("unknown")).toBe("New");
  });
});
