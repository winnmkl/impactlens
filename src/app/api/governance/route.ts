import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const [history, signOff] = await Promise.all([
    prisma.documentHistory.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.signOff.findMany({ orderBy: { createdAt: "desc" } }),
  ]);

  return NextResponse.json({ history, signOff });
}

export async function POST(req: Request) {
  const body = await req.json();

  if (body.type === "history") {
    const created = await prisma.documentHistory.create({
      data: {
        version: body.version,
        description: body.description,
        modifiedBy: body.modifiedBy,
        approvedBy: body.approvedBy,
        approvedDate: new Date(body.approvedDate),
      },
    });
    return NextResponse.json(created, { status: 201 });
  }

  if (body.type === "signoff") {
    const created = await prisma.signOff.create({
      data: {
        preparedBy: body.preparedBy,
        reviewedBy: body.reviewedBy,
        approvedBy: body.approvedBy,
        reviewYear: Number(body.reviewYear),
        description: body.description,
      },
    });
    return NextResponse.json(created, { status: 201 });
  }

  return NextResponse.json({ message: "Invalid governance payload" }, { status: 400 });
}
