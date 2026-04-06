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
      "run out of stock",
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
      likelyRootCause: expect.stringContaining("handoff"),
      nextAction: expect.stringContaining("handoff"),
    });
  });

  it("uses rail-specific wording for warehouse receiving interviews", () => {
    const initial = createInterviewState("warehouse-receiving" as never);

    const afterSymptom = advanceInterview(initial, {
      painType: "overstock",
    }).state;

    expect(afterSymptom.currentStep).toBe("frequency-pattern");
    expect(getCurrentStepDefinition(afterSymptom).prompt(afterSymptom)).toContain(
      "inbound",
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
      likelyRootCause: expect.stringContaining("putaway"),
      nextAction: expect.stringContaining("receiving"),
    });
  });

  it("uses store-manager wording for store stock interviews", () => {
    const initial = createInterviewState("store-stock-replenishment" as never);

    const afterSymptom = advanceInterview(initial, {
      painType: "stockout",
    }).state;

    expect(afterSymptom.currentStep).toBe("frequency-pattern");
    expect(getCurrentStepDefinition(afterSymptom).prompt(afterSymptom)).toContain(
      "empty shelf",
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
      likelyRootCause: expect.stringContaining("shared"),
      nextAction: expect.stringContaining("trace"),
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
      likelyRootCause: expect.stringContaining("store execution issue"),
      nextAction: expect.stringContaining("shelf-check"),
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
      likelyRootCause: expect.stringContaining("HQ or system issue"),
      nextAction: expect.stringContaining("compare store sell-through"),
    });
  });
});
