"use client";

import { useEffect, useMemo, useState } from "react";

type RiskQuestion = {
  id: string;
  dimension: "LIKELIHOOD" | "SEVERITY" | "BOTH";
  factorType: "THREAT_DRIVER" | "RESILIENCE_FACTOR" | "CUSTOM";
  prompt: string;
  nistRef: string;
  isoRef: string;
};

type MetadataResponse = {
  sectors: string[];
  risks: Array<{ value: string; label: string }>;
  questions: Record<string, RiskQuestion[]>;
};

type AssetRecord = {
  id: string;
  assetCode: string;
  name: string;
};

type AssessmentRecord = {
  id: string;
  risk: string;
  sector: string;
  likelihood: number;
  severity: number;
  finalScore: number;
  riskLevel: string;
  residualRisk: string;
};

type CustomResponse = {
  dimension: "LIKELIHOOD" | "SEVERITY" | "BOTH";
  factorType: "CUSTOM";
  prompt: string;
  value: number;
};

const scoreOptions = [-2, -1, -0.5, 0, 0.5, 1, 2];

export default function Home() {
  const [metadata, setMetadata] = useState<MetadataResponse | null>(null);
  const [assets, setAssets] = useState<AssetRecord[]>([]);
  const [assessments, setAssessments] = useState<AssessmentRecord[]>([]);

  const [assetForm, setAssetForm] = useState({
    assetCode: "IA-001",
    name: "Student Information System Database",
    description: "Primary source of student profile and records.",
    owner: "CISO Office",
    sector: "Information/Database",
    confidentiality: 3,
    integrity: 3,
    availability: 2,
  });

  const [assessmentForm, setAssessmentForm] = useState({
    sector: "Information/Database",
    risk: "DATA_BREACH",
    assetId: "",
    controlEffectiveness: "Partially Effective",
    justification:
      "Initial student analysis based on known controls, observed vulnerabilities, and realistic attack narratives.",
  });
  const [customPrompt, setCustomPrompt] = useState("");
  const [customDimension, setCustomDimension] = useState<"LIKELIHOOD" | "SEVERITY" | "BOTH">("BOTH");
  const [customValue, setCustomValue] = useState(0);
  const [customResponses, setCustomResponses] = useState<CustomResponse[]>([]);
  const [responses, setResponses] = useState<Record<string, number>>({});

  async function refresh() {
    const [metaRes, assetsRes, assessRes] = await Promise.all([
      fetch("/api/metadata"),
      fetch("/api/assets"),
      fetch("/api/assessments"),
    ]);
    const [meta, assetsData, assessmentData] = await Promise.all([
      metaRes.json() as Promise<MetadataResponse>,
      assetsRes.json() as Promise<AssetRecord[]>,
      assessRes.json() as Promise<AssessmentRecord[]>,
    ]);
    setMetadata(meta);
    setAssets(assetsData);
    setAssessments(assessmentData);
  }

  useEffect(() => {
    let active = true;
    (async () => {
      if (!active) return;
      await refresh();
    })();
    return () => {
      active = false;
    };
  }, []);

  const activeQuestions: RiskQuestion[] = useMemo(() => {
    if (!metadata?.questions) return [];
    return metadata.questions[assessmentForm.risk] ?? [];
  }, [metadata, assessmentForm.risk]);

  async function createAsset(e: React.FormEvent) {
    e.preventDefault();
    await fetch("/api/assets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(assetForm),
    });
    await refresh();
  }

  async function createAssessment(e: React.FormEvent) {
    e.preventDefault();
    const standardResponses = activeQuestions.map((q) => ({
      dimension: q.dimension,
      factorType: q.factorType,
      prompt: `${q.prompt} (${q.nistRef}; ${q.isoRef})`,
      value: Number(responses[q.id] ?? 0),
    }));
    const payload = {
      ...assessmentForm,
      responses: [...standardResponses, ...customResponses],
    };
    await fetch("/api/assessments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setCustomResponses([]);
    setResponses({});
    await refresh();
  }

  function addCustomResponse() {
    if (!customPrompt.trim()) return;
    setCustomResponses((prev) => [
      ...prev,
      {
        dimension: customDimension,
        factorType: "CUSTOM",
        prompt: customPrompt,
        value: Number(customValue),
      },
    ]);
    setCustomPrompt("");
    setCustomValue(0);
  }

  return (
    <div className="min-h-screen bg-slate-950 p-8 text-slate-100">
      <main className="mx-auto max-w-6xl space-y-8">
        <header className="rounded-xl border border-slate-800 bg-slate-900 p-6">
          <h1 className="text-3xl font-bold">ImpactLens</h1>
          <p className="mt-2 text-slate-300">
            Information Security Risk Assessment Tool for qualitative student analysis using template-aligned controls and
            NIST/ISO references.
          </p>
          <a className="mt-3 inline-block text-sm text-cyan-300 underline" href="/database">
            View Database Records
          </a>
        </header>

        <section className="grid gap-6 lg:grid-cols-2">
          <form className="rounded-xl border border-slate-800 bg-slate-900 p-5 space-y-3" onSubmit={createAsset}>
            <h2 className="text-xl font-semibold">1) Information Asset Inventory</h2>
            <input className="w-full rounded bg-slate-800 p-2" value={assetForm.assetCode} onChange={(e) => setAssetForm({ ...assetForm, assetCode: e.target.value })} placeholder="Asset Code (IA-001)" />
            <input className="w-full rounded bg-slate-800 p-2" value={assetForm.name} onChange={(e) => setAssetForm({ ...assetForm, name: e.target.value })} placeholder="Asset Name" />
            <textarea className="w-full rounded bg-slate-800 p-2" value={assetForm.description} onChange={(e) => setAssetForm({ ...assetForm, description: e.target.value })} placeholder="Description" />
            <input className="w-full rounded bg-slate-800 p-2" value={assetForm.owner} onChange={(e) => setAssetForm({ ...assetForm, owner: e.target.value })} placeholder="Owner" />
            <select className="w-full rounded bg-slate-800 p-2" value={assetForm.sector} onChange={(e) => setAssetForm({ ...assetForm, sector: e.target.value })}>
              {metadata?.sectors?.map((sector: string) => <option key={sector}>{sector}</option>)}
            </select>
            <div className="grid grid-cols-3 gap-2">
              <label className="text-sm">C<input type="number" min={1} max={3} className="mt-1 w-full rounded bg-slate-800 p-2" value={assetForm.confidentiality} onChange={(e) => setAssetForm({ ...assetForm, confidentiality: Number(e.target.value) })} /></label>
              <label className="text-sm">I<input type="number" min={1} max={3} className="mt-1 w-full rounded bg-slate-800 p-2" value={assetForm.integrity} onChange={(e) => setAssetForm({ ...assetForm, integrity: Number(e.target.value) })} /></label>
              <label className="text-sm">A<input type="number" min={1} max={3} className="mt-1 w-full rounded bg-slate-800 p-2" value={assetForm.availability} onChange={(e) => setAssetForm({ ...assetForm, availability: Number(e.target.value) })} /></label>
            </div>
            <button className="rounded bg-cyan-500 px-4 py-2 font-semibold text-slate-900">Save Asset</button>
          </form>

          <form className="rounded-xl border border-slate-800 bg-slate-900 p-5 space-y-3" onSubmit={createAssessment}>
            <h2 className="text-xl font-semibold">2) Qualitative Impact Analysis</h2>
            <select className="w-full rounded bg-slate-800 p-2" value={assessmentForm.sector} onChange={(e) => setAssessmentForm({ ...assessmentForm, sector: e.target.value })}>
              {metadata?.sectors?.map((sector: string) => <option key={sector}>{sector}</option>)}
            </select>
            <select className="w-full rounded bg-slate-800 p-2" value={assessmentForm.risk} onChange={(e) => setAssessmentForm({ ...assessmentForm, risk: e.target.value })}>
              {metadata?.risks?.map((risk: { value: string; label: string }) => <option key={risk.value} value={risk.value}>{risk.label}</option>)}
            </select>
            <select className="w-full rounded bg-slate-800 p-2" value={assessmentForm.assetId} onChange={(e) => setAssessmentForm({ ...assessmentForm, assetId: e.target.value })}>
              <option value="">No linked asset</option>
              {assets.map((asset) => <option key={asset.id} value={asset.id}>{asset.assetCode} - {asset.name}</option>)}
            </select>
            <select className="w-full rounded bg-slate-800 p-2" value={assessmentForm.controlEffectiveness} onChange={(e) => setAssessmentForm({ ...assessmentForm, controlEffectiveness: e.target.value })}>
              {["Ineffective", "Partially Effective", "Substantially Effective", "Fully Effective"].map((level) => <option key={level}>{level}</option>)}
            </select>
            {activeQuestions.map((q) => (
              <div key={q.id} className="rounded border border-slate-700 p-2 text-sm">
                <p>{q.prompt}</p>
                <p className="text-xs text-slate-400">{q.dimension} | {q.factorType} | {q.nistRef} | {q.isoRef}</p>
                <select className="mt-2 w-full rounded bg-slate-800 p-2" value={responses[q.id] ?? 0} onChange={(e) => setResponses((prev) => ({ ...prev, [q.id]: Number(e.target.value) }))}>
                  {scoreOptions.map((option) => <option key={option} value={option}>{option > 0 ? `+${option}` : option}</option>)}
                </select>
              </div>
            ))}
            <div className="rounded border border-dashed border-slate-700 p-2">
              <h3 className="font-medium">Custom Scenario Question</h3>
              <input className="mt-2 w-full rounded bg-slate-800 p-2" value={customPrompt} onChange={(e) => setCustomPrompt(e.target.value)} placeholder="Type your custom scenario question" />
              <div className="mt-2 grid grid-cols-2 gap-2">
                <select className="rounded bg-slate-800 p-2" value={customDimension} onChange={(e) => setCustomDimension(e.target.value as "LIKELIHOOD" | "SEVERITY" | "BOTH")}>
                  {["LIKELIHOOD", "SEVERITY", "BOTH"].map((v) => <option key={v}>{v}</option>)}
                </select>
                <select className="rounded bg-slate-800 p-2" value={customValue} onChange={(e) => setCustomValue(Number(e.target.value))}>
                  {scoreOptions.map((option) => <option key={option} value={option}>{option > 0 ? `+${option}` : option}</option>)}
                </select>
              </div>
              <button type="button" className="mt-2 rounded bg-slate-700 px-3 py-1 text-sm" onClick={addCustomResponse}>Add Custom Question</button>
              {customResponses.map((entry, idx) => <p key={`${entry.prompt}-${idx}`} className="mt-1 text-xs text-cyan-300">{entry.dimension}: {entry.prompt} ({entry.value})</p>)}
            </div>
            <textarea className="w-full rounded bg-slate-800 p-2" value={assessmentForm.justification} onChange={(e) => setAssessmentForm({ ...assessmentForm, justification: e.target.value })} placeholder="Evidence and rationale" />
            <button className="rounded bg-emerald-500 px-4 py-2 font-semibold text-slate-900">Run Assessment</button>
          </form>
        </section>

        <section className="rounded-xl border border-slate-800 bg-slate-900 p-5">
          <h2 className="text-xl font-semibold">3) Assessment Highlights</h2>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            {assessments.slice(0, 6).map((record) => (
              <article key={record.id} className="rounded border border-slate-700 p-3">
                <p className="font-medium">{record.risk}</p>
                <p className="text-sm text-slate-300">Sector: {record.sector}</p>
                <p className="text-sm text-slate-300">Likelihood {record.likelihood} x Severity {record.severity} = {record.finalScore}</p>
                <p className="text-sm text-slate-300">Inherent: {record.riskLevel} | Residual: {record.residualRisk}</p>
                <a className="mt-2 inline-block text-cyan-300 underline text-sm" href={`/api/assessments/${record.id}/report`}>Download Summary</a>
              </article>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
