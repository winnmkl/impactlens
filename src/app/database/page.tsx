import Link from "next/link";
import { prisma } from "@/lib/db";

export default async function DatabasePage() {
  const [assets, assessments, histories, signOffs] = await Promise.all([
    prisma.asset.findMany({ orderBy: { createdAt: "desc" }, take: 25 }),
    prisma.assessment.findMany({
      orderBy: { createdAt: "desc" },
      include: { asset: true, responses: true },
      take: 25,
    }),
    prisma.documentHistory.findMany({ orderBy: { createdAt: "desc" }, take: 25 }),
    prisma.signOff.findMany({ orderBy: { createdAt: "desc" }, take: 25 }),
  ]);

  return (
    <div className="min-h-screen bg-slate-950 p-8 text-slate-100">
      <main className="mx-auto max-w-6xl space-y-6">
        <Link className="text-cyan-300 underline" href="/">
          Back to ImpactLens
        </Link>
        <h1 className="text-3xl font-bold">ImpactLens Database View</h1>
        <p className="text-slate-300">Live records stored in SQLite via Prisma.</p>

        <section className="rounded-xl border border-slate-800 bg-slate-900 p-5">
          <h2 className="text-xl font-semibold">Assets ({assets.length})</h2>
          <pre className="mt-3 overflow-auto rounded bg-slate-950 p-3 text-xs">{JSON.stringify(assets, null, 2)}</pre>
        </section>
        <section className="rounded-xl border border-slate-800 bg-slate-900 p-5">
          <h2 className="text-xl font-semibold">Assessments ({assessments.length})</h2>
          <pre className="mt-3 overflow-auto rounded bg-slate-950 p-3 text-xs">{JSON.stringify(assessments, null, 2)}</pre>
        </section>
        <section className="rounded-xl border border-slate-800 bg-slate-900 p-5">
          <h2 className="text-xl font-semibold">Document History ({histories.length})</h2>
          <pre className="mt-3 overflow-auto rounded bg-slate-950 p-3 text-xs">{JSON.stringify(histories, null, 2)}</pre>
        </section>
        <section className="rounded-xl border border-slate-800 bg-slate-900 p-5">
          <h2 className="text-xl font-semibold">Sign Offs ({signOffs.length})</h2>
          <pre className="mt-3 overflow-auto rounded bg-slate-950 p-3 text-xs">{JSON.stringify(signOffs, null, 2)}</pre>
        </section>
      </main>
    </div>
  );
}
