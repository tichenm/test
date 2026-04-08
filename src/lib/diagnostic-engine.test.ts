import {
  advanceInterview,
  buildDiagnosisRecord,
  createInterviewState,
  getCurrentStepDefinition,
} from "@/lib/diagnostic-engine";

describe("diagnostic engine", () => {
  it("starts on the symptom step", () => {
    const state = createInterviewState("inventory-replenishment");

    expect(state.currentStep).toBe("problem-symptom");
    expect(getCurrentStepDefinition(state).field).toBe("painType");
  });

  it("exposes quick symptom choices for rails that define first-step options", () => {
    const state = createInterviewState("store-service-complaints" as never);
    const step = getCurrentStepDefinition(state);

    expect(step.field).toBe("painType");
    expect(step.suggestedAnswers).toEqual([
      { label: "等待太久", value: "service-delay" },
      { label: "解释不一致", value: "service-inconsistency" },
      { label: "服务动作接不上", value: "handoff-delay" },
    ]);
  });

  it("does not advance when the current step field is still missing", () => {
    const initial = createInterviewState("inventory-replenishment");

    const result = advanceInterview(initial, {});

    expect(result.state.currentStep).toBe("problem-symptom");
    expect(result.status).toBe("needs-more-detail");
  });

  it("uses branch-aware wording after the symptom is known", () => {
    const initial = createInterviewState("inventory-replenishment");

    const afterSymptom = advanceInterview(initial, {
      painType: "stockout",
    }).state;

    expect(afterSymptom.currentStep).toBe("frequency-pattern");
    expect(getCurrentStepDefinition(afterSymptom).prompt(afterSymptom)).toContain(
      "缺货通常多久发生一次",
    );
  });

  it("builds a strict diagnosis record after all required fields are captured", () => {
    let state = createInterviewState("inventory-replenishment");

    state = advanceInterview(state, { painType: "stockout" }).state;
    state = advanceInterview(state, { frequency: "weekly" }).state;
    state = advanceInterview(state, { timeWindow: "weekends" }).state;
    state = advanceInterview(state, { affectedScope: "fast-moving SKUs" }).state;
    state = advanceInterview(state, { peopleInvolved: "shift leads" }).state;
    state = advanceInterview(state, {
      currentWorkaround: "manual Slack reminders",
    }).state;
    const completion = advanceInterview(state, {
      operationalImpact: "missed weekend sales and rushed transfers",
    });

    expect(completion.status).toBe("diagnosis-ready");

    const record = buildDiagnosisRecord(completion.state);

    expect(record).toMatchObject({
      painType: "stockout",
      severity: "high",
      frequency: "weekly",
      timeWindow: "weekends",
      affectedScope: "fast-moving SKUs",
      peopleInvolved: "shift leads",
      currentWorkaround: "manual Slack reminders",
      operationalImpact: "missed weekend sales and rushed transfers",
      likelyRootCause: expect.stringContaining("补货交接过晚"),
      nextAction: expect.stringContaining("补货交接"),
    });
  });

  it("uses rail-specific wording for warehouse receiving interviews", () => {
    const initial = createInterviewState("warehouse-receiving" as never);

    const afterSymptom = advanceInterview(initial, {
      painType: "overstock",
    }).state;

    expect(afterSymptom.currentStep).toBe("frequency-pattern");
    expect(getCurrentStepDefinition(afterSymptom).prompt(afterSymptom)).toContain(
      "到货库存还没上架入位就开始堆积",
    );
  });

  it("builds rail-specific diagnosis copy for warehouse receiving interviews", () => {
    let state = createInterviewState("warehouse-receiving" as never);

    state = advanceInterview(state, { painType: "overstock" }).state;
    state = advanceInterview(state, { frequency: "daily" }).state;
    state = advanceInterview(state, { timeWindow: "morning receiving" }).state;
    state = advanceInterview(state, { affectedScope: "overflow pallets" }).state;
    state = advanceInterview(state, { peopleInvolved: "receiving leads" }).state;
    state = advanceInterview(state, {
      currentWorkaround: "temporary floor stacking",
    }).state;
    const completion = advanceInterview(state, {
      operationalImpact: "putaway delays and blocked aisles",
    });

    const record = buildDiagnosisRecord(completion.state);

    expect(record).toMatchObject({
      painType: "overstock",
      severity: "medium",
      likelyRootCause: expect.stringContaining("收货到入位之间缺少清晰交接"),
      nextAction: expect.stringContaining("收货到入位责任分工"),
    });
  });

  it("uses store-manager wording for store stock interviews", () => {
    const initial = createInterviewState("store-stock-replenishment" as never);

    const afterSymptom = advanceInterview(initial, {
      painType: "stockout",
    }).state;

    expect(afterSymptom.currentStep).toBe("frequency-pattern");
    expect(getCurrentStepDefinition(afterSymptom).prompt(afterSymptom)).toContain(
      "门店货架空掉或可售库存缺失",
    );
  });

  it("builds shared root-cause copy for store stock interviews when store and HQ signals both appear", () => {
    let state = createInterviewState("store-stock-replenishment" as never);

    state = advanceInterview(state, { painType: "stockout" }).state;
    state = advanceInterview(state, { frequency: "daily" }).state;
    state = advanceInterview(state, { timeWindow: "weekend peaks" }).state;
    state = advanceInterview(state, {
      affectedScope: "promo endcaps and beverage aisle",
    }).state;
    state = advanceInterview(state, {
      peopleInvolved: "store staff, shift leads, and HQ replenishment planning",
    }).state;
    state = advanceInterview(state, {
      currentWorkaround: "manual shelf checks and repeated HQ chat escalation",
    }).state;
    const completion = advanceInterview(state, {
      operationalImpact: "empty shelves and missed promo sales",
    });

    const record = buildDiagnosisRecord(completion.state);

    expect(record).toMatchObject({
      painType: "stockout",
      severity: "high",
      likelyRootCause: expect.stringContaining("共同导致"),
      nextAction: expect.stringContaining("一路追到门店上架执行"),
    });
  });

  it("builds a store-execution diagnosis when the breakdown is mostly on-floor execution drift", () => {
    let state = createInterviewState("store-stock-replenishment" as never);

    state = advanceInterview(state, { painType: "inventory-accuracy" }).state;
    state = advanceInterview(state, { frequency: "daily" }).state;
    state = advanceInterview(state, { timeWindow: "closing shift" }).state;
    state = advanceInterview(state, {
      affectedScope: "front coolers and impulse shelves",
    }).state;
    state = advanceInterview(state, {
      peopleInvolved: "store associates and the closing shift lead",
    }).state;
    state = advanceInterview(state, {
      currentWorkaround: "manual shelf checks and backroom recounts every night",
    }).state;
    const completion = advanceInterview(state, {
      operationalImpact: "the floor opens with the wrong counts and extra staff cleanup",
    });

    const record = buildDiagnosisRecord(completion.state);

    expect(record).toMatchObject({
      painType: "inventory-accuracy",
      severity: "medium",
      likelyRootCause: expect.stringContaining("门店执行问题"),
      nextAction: expect.stringContaining("货架检查"),
    });
  });

  it("builds an HQ or system diagnosis even when the pain shows up on store shelves", () => {
    let state = createInterviewState("store-stock-replenishment" as never);

    state = advanceInterview(state, { painType: "stockout" }).state;
    state = advanceInterview(state, { frequency: "every weekend campaign" }).state;
    state = advanceInterview(state, { timeWindow: "promo launch weekends" }).state;
    state = advanceInterview(state, {
      affectedScope: "promo shelves and high-traffic beverage displays",
    }).state;
    state = advanceInterview(state, {
      peopleInvolved: "HQ allocation planning and the merchandising system",
    }).state;
    state = advanceInterview(state, {
      currentWorkaround: "the store keeps escalating because the forecast and allocation signal stay too low",
    }).state;
    const completion = advanceInterview(state, {
      operationalImpact: "the shelf goes empty even though the team checks it on time",
    });

    const record = buildDiagnosisRecord(completion.state);

    expect(record).toMatchObject({
      painType: "stockout",
      severity: "high",
      likelyRootCause: expect.stringContaining("上游或系统问题"),
      nextAction: expect.stringContaining("对比门店真实销量"),
    });
  });

  it("uses inventory-control wording for store inventory control interviews", () => {
    const initial = createInterviewState("store-inventory-control" as never);

    const afterSymptom = advanceInterview(initial, {
      painType: "inventory-accuracy",
    }).state;

    expect(afterSymptom.currentStep).toBe("frequency-pattern");
    expect(getCurrentStepDefinition(afterSymptom).prompt(afterSymptom)).toContain(
      "系统盘点和货架或后仓实物对不上",
    );
  });

  it("uses service-experience wording for store service complaint interviews", () => {
    const initial = createInterviewState("store-service-complaints" as never);

    const afterSymptom = advanceInterview(initial, {
      painType: "service-delay" as never,
    }).state;

    expect(afterSymptom.currentStep).toBe("frequency-pattern");
    expect(getCurrentStepDefinition(afterSymptom).prompt(afterSymptom)).toContain(
      "顾客等待明显变长",
    );
  });

  it("builds service rail diagnosis copy around service handoff gaps", () => {
    let state = createInterviewState("store-service-complaints" as never);

    state = advanceInterview(state, { painType: "handoff-delay" as never }).state;
    state = advanceInterview(state, { frequency: "每个周末晚高峰" }).state;
    state = advanceInterview(state, { timeWindow: "晚高峰和交接班前后" }).state;
    state = advanceInterview(state, {
      affectedScope: "点单到出餐之间的顾客解释和排队安抚",
    }).state;
    state = advanceInterview(state, {
      peopleInvolved: "收银、出餐伙伴和值班店长",
    }).state;
    state = advanceInterview(state, {
      currentWorkaround: "店长临时顶到前场统一解释并安抚顾客",
    }).state;
    const completion = advanceInterview(state, {
      operationalImpact: "顾客等待更久，差评和投诉在高峰后集中出现",
    });

    const record = buildDiagnosisRecord(completion.state);

    expect(record).toMatchObject({
      painType: "handoff-delay",
      severity: "high",
      likelyRootCause: expect.stringContaining("服务链路"),
      nextAction: expect.stringContaining("交接"),
    });
  });

  it("builds rail-specific diagnosis copy for store inventory control interviews", () => {
    let state = createInterviewState("store-inventory-control" as never);

    state = advanceInterview(state, { painType: "inventory-accuracy" }).state;
    state = advanceInterview(state, { frequency: "three times a week" }).state;
    state = advanceInterview(state, { timeWindow: "during closing cycle counts" }).state;
    state = advanceInterview(state, {
      affectedScope: "front promo shelves and the backroom reserve rack",
    }).state;
    state = advanceInterview(state, {
      peopleInvolved: "store supervisors and closing associates",
    }).state;
    state = advanceInterview(state, {
      currentWorkaround: "manual recounts and WhatsApp photo checks",
    }).state;
    const completion = advanceInterview(state, {
      operationalImpact: "replenishment decisions keep using the wrong on-hand number",
    });

    const record = buildDiagnosisRecord(completion.state);

    expect(record).toMatchObject({
      painType: "inventory-accuracy",
      severity: "medium",
      likelyRootCause: expect.stringContaining("库存管控"),
      nextAction: expect.stringContaining("下一次盘点"),
    });
  });

  it("uses project rollout wording for project handoff interviews", () => {
    const initial = createInterviewState("project-rollout-handoff" as never);

    const afterSymptom = advanceInterview(initial, {
      painType: "handoff-delay" as never,
    }).state;

    expect(afterSymptom.currentStep).toBe("frequency-pattern");
    expect(getCurrentStepDefinition(afterSymptom).prompt(afterSymptom)).toContain(
      "交接卡住",
    );
  });

  it("builds project-specific diagnosis copy for rollout handoff interviews", () => {
    let state = createInterviewState("project-rollout-handoff" as never);

    state = advanceInterview(state, { painType: "handoff-delay" as never }).state;
    state = advanceInterview(state, { frequency: "every launch checkpoint" }).state;
    state = advanceInterview(state, { timeWindow: "during cross-team handoff windows" }).state;
    state = advanceInterview(state, {
      affectedScope: "site readiness signoff and vendor onboarding",
    }).state;
    state = advanceInterview(state, {
      peopleInvolved: "project manager, ops lead, and external vendor owner",
    }).state;
    state = advanceInterview(state, {
      currentWorkaround: "manual status chasing in chat and spreadsheets",
    }).state;
    const completion = advanceInterview(state, {
      operationalImpact: "launch dates slip because nobody trusts the last handoff state",
    });

    const record = buildDiagnosisRecord(completion.state);

    expect(record).toMatchObject({
      painType: "handoff-delay",
      severity: "high",
      likelyRootCause: expect.stringContaining("项目交接会卡住"),
      nextAction: expect.stringContaining("明确交接负责人"),
    });
  });
});
