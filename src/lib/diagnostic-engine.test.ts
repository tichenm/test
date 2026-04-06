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
});
