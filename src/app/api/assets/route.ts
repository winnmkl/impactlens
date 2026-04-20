import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const assets = await prisma.asset.findMany({
    orderBy: { createdAt: "desc" },
    include: { assessments: true },
  });
  return NextResponse.json(assets);
}

export async function POST(req: Request) {
  const body = await req.json();

  const confidentiality = Number(body.confidentiality ?? 1);
  const integrity = Number(body.integrity ?? 1);
  const availability = Number(body.availability ?? 1);
  const assetValue = confidentiality + integrity + availability;
  const classification =
    assetValue >= 8 ? "Restricted" : assetValue >= 6 ? "Confidential" : assetValue >= 4 ? "Internal Use" : "Public";

  const created = await prisma.asset.create({
    data: {
      assetCode: body.assetCode,
      name: body.name,
      description: body.description,
      owner: body.owner,
      sector: body.sector,
      confidentiality,
      integrity,
      availability,
      assetValue,
      classification,
    },
  });

  return NextResponse.json(created, { status: 201 });
}
