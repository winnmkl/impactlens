export type AssessmentResponseInput = {
  dimension: "LIKELIHOOD" | "SEVERITY" | "BOTH";
  factorType: "THREAT_DRIVER" | "RESILIENCE_FACTOR" | "CUSTOM";
  prompt: string;
  value: number;
};

export function clampImpactScore(raw: number): number {
  const rounded = Math.ceil(raw);
  return Math.max(1, Math.min(5, rounded));
}

export function riskLevelFromScore(score: number): string {
  if (score >= 15) return "Critical";
  if (score >= 10) return "High";
  if (score >= 5) return "Moderate";
  return "Low";
}

export function residualRiskFromControl(
  overall: string,
  controlEffectiveness: "Ineffective" | "Partially Effective" | "Substantially Effective" | "Fully Effective",
): string {
  const levels = ["Low", "Moderate", "High", "Critical"] as const;
  const idx = levels.findIndex((v) => v === overall);
  if (idx < 0) return overall;
  const reduction =
    controlEffectiveness === "Fully Effective"
      ? 2
      : controlEffectiveness === "Substantially Effective"
        ? 1
        : 0;
  return levels[Math.max(0, idx - reduction)];
}

export function computeRisk(
  responses: AssessmentResponseInput[],
  controlEffectiveness: "Ineffective" | "Partially Effective" | "Substantially Effective" | "Fully Effective",
) {
  const baseLikelihood = 3;
  const baseSeverity = 3;

  const likelihoodDelta = responses
    .filter((r) => r.dimension === "LIKELIHOOD" || r.dimension === "BOTH")
    .reduce((acc, curr) => acc + curr.value, 0);
  const severityDelta = responses
    .filter((r) => r.dimension === "SEVERITY" || r.dimension === "BOTH")
    .reduce((acc, curr) => acc + curr.value, 0);

  const likelihood = clampImpactScore(baseLikelihood + likelihoodDelta);
  const severity = clampImpactScore(baseSeverity + severityDelta);
  const finalScore = likelihood * severity;
  const riskLevel = riskLevelFromScore(finalScore);
  const residualRisk = residualRiskFromControl(riskLevel, controlEffectiveness);

  return { likelihood, severity, finalScore, riskLevel, residualRisk };
}
