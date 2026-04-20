import { NextResponse } from "next/server";
import { riskCatalog, riskOptions, sectors } from "@/lib/catalog";

export async function GET() {
  return NextResponse.json({
    sectors,
    risks: riskOptions,
    questions: riskCatalog,
    customValueRange: [-2, -1, -0.5, 0, 0.5, 1, 2],
  });
}
