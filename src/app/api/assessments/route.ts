import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { computeRisk, type AssessmentResponseInput } from "@/lib/scoring";

type ControlEffectiveness = "Ineffective" | "Partially Effective" | "Substantially Effective" | "Fully Effective";

export async function GET() {
  const records = await prisma.assessment.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      asset: true,
      responses: true,
    },
  });
  return NextResponse.json(records);
}

export async function POST(req: Request) {
  const body = await req.json();
  const responses = (body.responses ?? []) as AssessmentResponseInput[];
  const controlEffectiveness = (body.controlEffectiveness ?? "Partially Effective") as ControlEffectiveness;
  const result = computeRisk(responses, controlEffectiveness);

  const created = await prisma.assessment.create({
    data: {
      sector: body.sector,
      risk: body.risk,
      assetId: body.assetId || null,
      controlEffectiveness,
      justification: body.justification ?? "",
      likelihood: result.likelihood,
      severity: result.severity,
      finalScore: result.finalScore,
      riskLevel: result.riskLevel,
      residualRisk: result.residualRisk,
      responses: {
        create: responses.map((r) => ({
          dimension: r.dimension,
          factorType: r.factorType,
          prompt: r.prompt,
          value: r.value,
        })),
      },
    },
    include: {
      asset: true,
      responses: true,
    },
  });

  return NextResponse.json(created, { status: 201 });
}
