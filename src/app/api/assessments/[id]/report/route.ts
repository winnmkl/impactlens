import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(_req: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const assessment = await prisma.assessment.findUnique({
    where: { id },
    include: { asset: true, responses: true },
  });

  if (!assessment) {
    return NextResponse.json({ message: "Assessment not found" }, { status: 404 });
  }

  const content = [
    "# ImpactLens Information Security Risk Assessment",
    "",
    `Assessment ID: ${assessment.id}`,
    `Date: ${assessment.createdAt.toISOString()}`,
    `Sector: ${assessment.sector}`,
    `Risk Scenario: ${assessment.risk}`,
    `Asset: ${assessment.asset?.name ?? "N/A"} (${assessment.asset?.assetCode ?? "N/A"})`,
    "",
    "## Qualitative Results",
    `- Likelihood: ${assessment.likelihood} / 5`,
    `- Severity: ${assessment.severity} / 5`,
    `- Final Score: ${assessment.finalScore}`,
    `- Inherent Risk: ${assessment.riskLevel}`,
    `- Control Effectiveness: ${assessment.controlEffectiveness}`,
    `- Residual Risk: ${assessment.residualRisk}`,
    "",
    "## Justification",
    assessment.justification || "No additional justification provided.",
    "",
    "## Response Evidence",
    ...assessment.responses.map(
      (r, index) =>
        `${index + 1}. [${r.dimension}] [${r.factorType}] ${r.prompt} => ${r.value > 0 ? "+" : ""}${r.value}`,
    ),
    "",
    "## Framework Mapping",
    "- NIST CSF 2.0: Identify, Protect, Detect, Respond, Recover",
    "- ISO/IEC 27001:2022: Risk treatment and control monitoring",
    "- Follows qualitative impact matrix style from template standard",
  ].join("\n");

  return new NextResponse(content, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Content-Disposition": `attachment; filename=\"impactlens-assessment-${id}.md\"`,
    },
  });
}
