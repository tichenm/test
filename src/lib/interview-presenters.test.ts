import { describe, expect, it } from "vitest";

import {
  getDiagnosisPainTypeLabel,
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
    ).toBe("积压");
  });

  it("falls back to the rail label when the diagnosis is still in progress", () => {
    expect(
      getInterviewCardTitle({
        railKey: "warehouse-receiving",
        diagnosisRecord: null,
      }),
    ).toBe("仓库收货诊断进行中");
  });

  it("returns the configured rail label for display chips", () => {
    expect(getInterviewRailLabel("inventory-replenishment")).toBe(
      "库存与补货",
    );
    expect(getInterviewRailLabel("store-stock-replenishment")).toBe(
      "门店库存与补货",
    );
    expect(getInterviewRailLabel("store-inventory-control")).toBe(
      "门店库存管控",
    );
    expect(getInterviewRailLabel("store-staffing-scheduling")).toBe(
      "门店排班与人手配置",
    );
    expect(getInterviewRailLabel("store-equipment-maintenance")).toBe(
      "门店设备故障与维修响应",
    );
    expect(getInterviewRailLabel("store-shrinkage-waste")).toBe(
      "门店损耗与报废",
    );
    expect(getInterviewRailLabel("store-promo-execution")).toBe(
      "门店促销执行与活动落地",
    );
    expect(getInterviewRailLabel("store-service-complaints")).toBe(
      "门店服务体验与客诉",
    );
    expect(getInterviewRailLabel("project-rollout-handoff")).toBe(
      "项目落地与交接",
    );
    expect(getInterviewRailLabel("warehouse-receiving")).toBe("仓库收货");
  });

  it("falls back to the default rail label when persisted data is invalid", () => {
    expect(getInterviewRailLabel("unknown-rail")).toBe("库存与补货");
    expect(
      getInterviewCardTitle({
        railKey: "unknown-rail",
        diagnosisRecord: null,
      }),
    ).toBe("库存与补货诊断进行中");
  });

  it("returns neutral empty-state copy instead of hardcoded inventory wording", () => {
    expect(getEmptyHistoryCopy()).toContain("引导式诊断");
    expect(getEmptyHistoryCopy()).not.toContain("库存与补货");
  });

  it("formats review workflow statuses for manager-facing chips", () => {
    expect(getDiagnosisReviewStatusLabel("new")).toBe("待跟进");
    expect(getDiagnosisReviewStatusLabel("reviewing")).toBe("跟进中");
    expect(getDiagnosisReviewStatusLabel("accepted")).toBe("已采纳");
    expect(getDiagnosisReviewStatusLabel("resolved")).toBe("已解决");
    expect(getDiagnosisReviewStatusLabel("unknown")).toBe("待跟进");
  });

  it("formats diagnosis pain types for manager-facing labels", () => {
    expect(getDiagnosisPainTypeLabel("stockout")).toBe("缺货");
    expect(getDiagnosisPainTypeLabel("inventory-accuracy")).toBe("库存准确性偏差");
    expect(getDiagnosisPainTypeLabel("handoff-delay")).toBe("交接延迟");
    expect(getDiagnosisPainTypeLabel("dependency-blindspot")).toBe("依赖盲区");
    expect(getDiagnosisPainTypeLabel("service-delay")).toBe("等待过长");
    expect(getDiagnosisPainTypeLabel("service-inconsistency")).toBe("口径不一致");
    expect(getDiagnosisPainTypeLabel("staffing-gap")).toBe("人手缺口");
    expect(getDiagnosisPainTypeLabel("schedule-instability")).toBe("排班波动");
    expect(getDiagnosisPainTypeLabel("shift-handoff-gap")).toBe("交接脱节");
    expect(getDiagnosisPainTypeLabel("repair-delay")).toBe("维修太慢");
    expect(getDiagnosisPainTypeLabel("recurring-breakdown")).toBe("反复故障");
    expect(getDiagnosisPainTypeLabel("vendor-response-gap")).toBe("报修没人接");
    expect(getDiagnosisPainTypeLabel("shrinkage-spike")).toBe("损耗偏高");
    expect(getDiagnosisPainTypeLabel("waste-spike")).toBe("报废偏多");
    expect(getDiagnosisPainTypeLabel("writeoff-response-gap")).toBe("报损没人跟");
    expect(getDiagnosisPainTypeLabel("promo-launch-delay")).toBe("活动落地太慢");
    expect(getDiagnosisPainTypeLabel("display-breakdown")).toBe("陈列没到位");
    expect(getDiagnosisPainTypeLabel("signage-mismatch")).toBe("价签口径不一致");
  });
});
