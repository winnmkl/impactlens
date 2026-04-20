import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const [assets, assessments, histories, signOffs] = await Promise.all([
    prisma.asset.findMany({ orderBy: { createdAt: "desc" }, take: 20 }),
    prisma.assessment.findMany({
      orderBy: { createdAt: "desc" },
      include: { responses: true, asset: true },
      take: 20,
    }),
    prisma.documentHistory.findMany({ orderBy: { createdAt: "desc" }, take: 20 }),
    prisma.signOff.findMany({ orderBy: { createdAt: "desc" }, take: 20 }),
  ]);

  return NextResponse.json({
    assets,
    assessments,
    documentHistories: histories,
    signOffs,
  });
}
