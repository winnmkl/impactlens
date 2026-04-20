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
  description: string;
  owner: string;
  sector: string;
  classification: "Public" | "Internal Use" | "Confidential" | "Restricted";
  confidentiality: number;
  integrity: number;
  availability: number;
  assetValue: number;
};

type AssessmentRecord = {
  id: string;
  assetId?: string | null;
  risk: string;
  sector: string;
  likelihood: number;
  severity: number;
  finalScore: number;
  riskLevel: string;
  residualRisk: string;
  controlEffectiveness: string;
  justification: string;
};

type CustomResponse = {
  dimension: "LIKELIHOOD" | "SEVERITY" | "BOTH";
  factorType: "CUSTOM";
  prompt: string;
  value: number;
};

const scoreOptions = [-2, -1, -0.5, 0, 0.5, 1, 2];
type Section = "dashboard" | "add" | "register" | "risk" | "matrix" | "controls" | "actions" | "guidelines";

export default function Home() {
  const [section, setSection] = useState<Section>("dashboard");
  const [metadata, setMetadata] = useState<MetadataResponse | null>(null);
  const [assets, setAssets] = useState<AssetRecord[]>([]);
  const [assessments, setAssessments] = useState<AssessmentRecord[]>([]);
  const [notification, setNotification] = useState<{ text: string; error: boolean } | null>(null);

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
  const [search, setSearch] = useState("");
  const [riskFilter, setRiskFilter] = useState("");
  const now = new Date();
  const [yearFrom, setYearFrom] = useState(now.getFullYear());
  const [yearTo, setYearTo] = useState(now.getFullYear() + 1);

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
    async function load() {
      await refresh();
    }
    void load();
  }, []);

  const activeQuestions: RiskQuestion[] = useMemo(() => {
    if (!metadata?.questions) return [];
    return metadata.questions[assessmentForm.risk] ?? [];
  }, [metadata, assessmentForm.risk]);

  const linkedByAsset = useMemo(() => {
    const map = new Map<string, AssessmentRecord>();
    for (const assessment of assessments) {
      if (assessment.assetId && !map.has(assessment.assetId)) {
        map.set(assessment.assetId, assessment);
      }
    }
    return map;
  }, [assessments]);

  const highCount = useMemo(
    () => assessments.filter((item) => item.residualRisk === "High" || item.residualRisk === "Critical").length,
    [assessments],
  );
  const moderateCount = useMemo(() => assessments.filter((item) => item.residualRisk === "Moderate").length, [assessments]);
  const piiLikeCount = useMemo(
    () => assets.filter((asset) => asset.classification === "Confidential" || asset.classification === "Restricted").length,
    [assets],
  );

  const filteredAssets = useMemo(() => {
    const term = search.toLowerCase().trim();
    if (!term) return assets;
    return assets.filter(
      (asset) =>
        asset.name.toLowerCase().includes(term) ||
        asset.assetCode.toLowerCase().includes(term) ||
        asset.owner.toLowerCase().includes(term),
    );
  }, [assets, search]);

  const filteredAssessments = useMemo(() => {
    if (!riskFilter) return assessments;
    return assessments.filter((item) => item.residualRisk === riskFilter);
  }, [assessments, riskFilter]);

  async function createAsset(e: React.FormEvent) {
    e.preventDefault();
    await fetch("/api/assets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(assetForm),
    });
    setNotification({ text: "Asset saved successfully", error: false });
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
    setNotification({ text: "Risk assessment completed", error: false });
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

  function classBadge(classification: AssetRecord["classification"]) {
    const map: Record<AssetRecord["classification"], string> = {
      Public: "badge-pub",
      "Internal Use": "badge-int",
      Confidential: "badge-con",
      Restricted: "badge-res",
    };
    return <span className={`badge ${map[classification]}`}>{classification}</span>;
  }

  function riskBadge(level: string) {
    const cls =
      level === "Critical"
        ? "badge-cr"
        : level === "High"
          ? "badge-hi"
          : level === "Moderate"
            ? "badge-mo"
            : level === "Low"
              ? "badge-lo"
              : "badge-vl";
    return <span className={`badge ${cls}`}>{level}</span>;
  }

  const controlCoverage = useMemo(() => {
    const scoreMap: Record<string, number> = {
      Ineffective: 15,
      "Partially Effective": 40,
      "Substantially Effective": 75,
      "Fully Effective": 100,
    };
    const avg =
      assessments.length === 0
        ? 0
        : Math.round(
            assessments.reduce((acc, curr) => acc + (scoreMap[curr.controlEffectiveness] ?? 0), 0) / assessments.length,
          );
    return avg;
  }, [assessments]);

  const controlDistribution = useMemo(() => {
    const buckets: Record<string, number> = {
      Ineffective: 0,
      "Partially Effective": 0,
      "Substantially Effective": 0,
      "Fully Effective": 0,
    };
    for (const item of assessments) {
      if (buckets[item.controlEffectiveness] !== undefined) {
        buckets[item.controlEffectiveness] += 1;
      }
    }
    return buckets;
  }, [assessments]);

  const actionPlanCandidates = useMemo(
    () => assessments.filter((item) => item.residualRisk === "High" || item.residualRisk === "Moderate" || item.residualRisk === "Critical"),
    [assessments],
  );

  useEffect(() => {
    if (!notification) return;
    const timeout = setTimeout(() => setNotification(null), 2600);
    return () => clearTimeout(timeout);
  }, [notification]);

  return (
    <div className="iar-root">
      <header className="iar-header">
        <div className="logo">
          <div className="logo-lens" aria-hidden="true">
            <span className="lens-ring" />
            <span className="lens-core" />
            <span className="lens-glint" />
          </div>
          <div className="logo-mark">ImpactLens</div>
          <div className="logo-sub">Information Security Risk Assessment Platform</div>
        </div>
        <div className="header-right">
          <div className="status-dot" />
          <div className="header-stat">
            Assets: <span>{assets.length}</span>
          </div>
          <div className="header-stat">
            High Risk: <span style={{ color: "var(--danger)" }}>{highCount}</span>
          </div>
          <div className="header-stat">
            Year:
            <span style={{ display: "inline-flex", alignItems: "center", gap: 4, marginLeft: 6 }}>
              <input
                style={{ width: 68, padding: "2px 6px", fontSize: 10 }}
                type="number"
                value={yearFrom}
                onChange={(e) => setYearFrom(Number(e.target.value))}
              />
              -
              <input
                style={{ width: 68, padding: "2px 6px", fontSize: 10 }}
                type="number"
                value={yearTo}
                onChange={(e) => setYearTo(Number(e.target.value))}
              />
            </span>
          </div>
          <a className="btn btn-sm" href="/database">
            Database
          </a>
        </div>
      </header>

      <div className="layout">
        <nav>
          <div className="nav-section">
            <div className="nav-label">Overview</div>
            <button className={`nav-item ${section === "dashboard" ? "active" : ""}`} onClick={() => setSection("dashboard")}>
              <span className="nav-icon">[■]</span> Dashboard
            </button>
          </div>
          <div className="nav-section">
            <div className="nav-label">Assets</div>
            <button className={`nav-item ${section === "add" ? "active" : ""}`} onClick={() => setSection("add")}>
              <span className="nav-icon">[+]</span> Add Asset
            </button>
            <button className={`nav-item ${section === "register" ? "active" : ""}`} onClick={() => setSection("register")}>
              <span className="nav-icon">[≡]</span> Register
            </button>
          </div>
          <div className="nav-section">
            <div className="nav-label">Risk</div>
            <button className={`nav-item ${section === "risk" ? "active" : ""}`} onClick={() => setSection("risk")}>
              <span className="nav-icon">[△]</span> Risk Register
              <span className="nav-badge">{highCount}</span>
            </button>
            <button className={`nav-item ${section === "matrix" ? "active" : ""}`} onClick={() => setSection("matrix")}>
              <span className="nav-icon">[#]</span> Risk Matrix
            </button>
          </div>
          <div className="nav-section">
            <div className="nav-label">Controls</div>
            <button className={`nav-item ${section === "controls" ? "active" : ""}`} onClick={() => setSection("controls")}>
              <span className="nav-icon">[✓]</span> Control Measures
            </button>
            <button className={`nav-item ${section === "actions" ? "active" : ""}`} onClick={() => setSection("actions")}>
              <span className="nav-icon">[!]</span> Action Plans
              <span className="nav-badge">{actionPlanCandidates.length}</span>
            </button>
          </div>
          <div className="nav-section">
            <div className="nav-label">Reference</div>
            <button className={`nav-item ${section === "guidelines" ? "active" : ""}`} onClick={() => setSection("guidelines")}>
              <span className="nav-icon">[?]</span> Guidelines
            </button>
          </div>
        </nav>

        <main>
          {section === "dashboard" && (
            <>
              <div className="page-header">
                <div>
                  <div className="page-title">DASH<span>BOARD</span></div>
                  <div className="page-desc">{"// system overview - real-time risk posture"}</div>
                  <div className="page-desc">{`// assessment cycle ${yearFrom}-${yearTo}`}</div>
                </div>
              </div>
              <div className="metrics-grid">
                <div className="metric-card accent">
                  <div className="metric-num">{assets.length}</div>
                  <div className="metric-label">Total Assets</div>
                </div>
                <div className="metric-card danger">
                  <div className="metric-num">{highCount}</div>
                  <div className="metric-label">High Residual Risk</div>
                </div>
                <div className="metric-card warn">
                  <div className="metric-num">{moderateCount}</div>
                  <div className="metric-label">Moderate Residual Risk</div>
                </div>
                <div className="metric-card info">
                  <div className="metric-num">{piiLikeCount}</div>
                  <div className="metric-label">Confidential / Restricted</div>
                </div>
              </div>
              <div className="card">
                <div className="card-header">Top risk assets</div>
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Asset</th>
                        <th>Risk</th>
                        <th>Inherent</th>
                        <th>Residual</th>
                        <th>Report</th>
                      </tr>
                    </thead>
                    <tbody>
                      {assessments.slice(0, 6).map((record) => (
                        <tr key={record.id}>
                          <td>{assets.find((x) => x.id === record.assetId)?.name ?? "Unlinked asset"}</td>
                          <td>{record.risk}</td>
                          <td>{riskBadge(record.riskLevel)}</td>
                          <td>{riskBadge(record.residualRisk)}</td>
                          <td>
                            <a className="btn btn-sm" href={`/api/assessments/${record.id}/report`}>
                              Export
                            </a>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {section === "add" && (
            <>
              <div className="page-header">
                <div>
                  <div className="page-title">ADD <span>ASSET</span></div>
                  <div className="page-desc">{"// register asset and run qualitative impact analysis"}</div>
                </div>
              </div>

              <form className="card" onSubmit={createAsset}>
                <div className="card-header">01 - Primary details</div>
                <div className="grid-2">
                  <div>
                    <label>Asset ID</label>
                    <input value={assetForm.assetCode} onChange={(e) => setAssetForm({ ...assetForm, assetCode: e.target.value })} />
                  </div>
                  <div>
                    <label>Sector</label>
                    <select value={assetForm.sector} onChange={(e) => setAssetForm({ ...assetForm, sector: e.target.value })}>
                      {metadata?.sectors.map((sector) => (
                        <option key={sector}>{sector}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="grid-2">
                  <div>
                    <label>Asset Name</label>
                    <input value={assetForm.name} onChange={(e) => setAssetForm({ ...assetForm, name: e.target.value })} />
                  </div>
                  <div>
                    <label>Owner</label>
                    <input value={assetForm.owner} onChange={(e) => setAssetForm({ ...assetForm, owner: e.target.value })} />
                  </div>
                </div>
                <label>Description</label>
                <textarea value={assetForm.description} onChange={(e) => setAssetForm({ ...assetForm, description: e.target.value })} />

                <div className="grid-3">
                  <div>
                    <label>Confidentiality</label>
                    <select
                      value={assetForm.confidentiality}
                      onChange={(e) => setAssetForm({ ...assetForm, confidentiality: Number(e.target.value) })}
                    >
                      <option value={1}>Low (1)</option>
                      <option value={2}>Medium (2)</option>
                      <option value={3}>High (3)</option>
                    </select>
                  </div>
                  <div>
                    <label>Integrity</label>
                    <select value={assetForm.integrity} onChange={(e) => setAssetForm({ ...assetForm, integrity: Number(e.target.value) })}>
                      <option value={1}>Low (1)</option>
                      <option value={2}>Medium (2)</option>
                      <option value={3}>High (3)</option>
                    </select>
                  </div>
                  <div>
                    <label>Availability</label>
                    <select
                      value={assetForm.availability}
                      onChange={(e) => setAssetForm({ ...assetForm, availability: Number(e.target.value) })}
                    >
                      <option value={1}>Low (1)</option>
                      <option value={2}>Medium (2)</option>
                      <option value={3}>High (3)</option>
                    </select>
                  </div>
                </div>
                <div className="action-row">
                  <button className="btn btn-primary">Save Asset</button>
                </div>
              </form>

              <form className="card" onSubmit={createAssessment}>
                <div className="card-header">02 - Risk assessment and controls</div>
                <div className="grid-2">
                  <div>
                    <label>Linked Asset</label>
                    <select value={assessmentForm.assetId} onChange={(e) => setAssessmentForm({ ...assessmentForm, assetId: e.target.value })}>
                      <option value="">No linked asset</option>
                      {assets.map((asset) => (
                        <option key={asset.id} value={asset.id}>
                          {asset.assetCode} - {asset.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label>Risk Scenario</label>
                    <select value={assessmentForm.risk} onChange={(e) => setAssessmentForm({ ...assessmentForm, risk: e.target.value })}>
                      {metadata?.risks.map((risk) => (
                        <option key={risk.value} value={risk.value}>
                          {risk.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="grid-2">
                  <div>
                    <label>Sector</label>
                    <select value={assessmentForm.sector} onChange={(e) => setAssessmentForm({ ...assessmentForm, sector: e.target.value })}>
                      {metadata?.sectors.map((sector) => (
                        <option key={sector}>{sector}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label>Control Effectiveness</label>
                    <select
                      value={assessmentForm.controlEffectiveness}
                      onChange={(e) => setAssessmentForm({ ...assessmentForm, controlEffectiveness: e.target.value })}
                    >
                      {["Ineffective", "Partially Effective", "Substantially Effective", "Fully Effective"].map((level) => (
                        <option key={level}>{level}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="card-header">Question scoring</div>
                {activeQuestions.map((question) => (
                  <div key={question.id} className="info-row">
                    <div className="val">
                      {question.prompt}
                      <div className="lbl">
                        {question.dimension} | {question.factorType} | {question.nistRef} | {question.isoRef}
                      </div>
                    </div>
                    <select
                      style={{ maxWidth: 120 }}
                      value={responses[question.id] ?? 0}
                      onChange={(e) => setResponses((prev) => ({ ...prev, [question.id]: Number(e.target.value) }))}
                    >
                      {scoreOptions.map((option) => (
                        <option key={option} value={option}>
                          {option > 0 ? `+${option}` : option}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
                <div className="divider" />
                <div className="grid-3">
                  <input value={customPrompt} onChange={(e) => setCustomPrompt(e.target.value)} placeholder="Custom scenario question" />
                  <select value={customDimension} onChange={(e) => setCustomDimension(e.target.value as CustomResponse["dimension"])}>
                    <option value="LIKELIHOOD">LIKELIHOOD</option>
                    <option value="SEVERITY">SEVERITY</option>
                    <option value="BOTH">BOTH</option>
                  </select>
                  <select value={customValue} onChange={(e) => setCustomValue(Number(e.target.value))}>
                    {scoreOptions.map((option) => (
                      <option key={option} value={option}>
                        {option > 0 ? `+${option}` : option}
                      </option>
                    ))}
                  </select>
                </div>
                <button type="button" className="btn btn-sm" onClick={addCustomResponse} style={{ marginTop: 8 }}>
                  Add Custom
                </button>
                {customResponses.map((entry, index) => (
                  <div className="info-row" key={`${entry.prompt}-${index}`}>
                    <div className="val">{entry.prompt}</div>
                    <div>{entry.value}</div>
                  </div>
                ))}
                <label>Justification</label>
                <textarea
                  value={assessmentForm.justification}
                  onChange={(e) => setAssessmentForm({ ...assessmentForm, justification: e.target.value })}
                />
                <div className="action-row">
                  <button className="btn btn-primary">Run Assessment</button>
                </div>
              </form>
            </>
          )}

          {section === "register" && (
            <>
              <div className="page-header">
                <div>
                  <div className="page-title">ASSET <span>REGISTER</span></div>
                  <div className="page-desc">{"// complete information asset inventory"}</div>
                </div>
              </div>
              <div className="search-bar">
                <input placeholder="Search by name, ID, owner..." value={search} onChange={(e) => setSearch(e.target.value)} />
              </div>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Asset ID</th>
                      <th>Name</th>
                      <th>Owner</th>
                      <th>CIA</th>
                      <th>Score</th>
                      <th>Classification</th>
                      <th>Residual Risk</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAssets.map((asset) => (
                      <tr key={asset.id}>
                        <td><span className="badge badge-id">{asset.assetCode}</span></td>
                        <td><strong>{asset.name}</strong></td>
                        <td>{asset.owner}</td>
                        <td>{asset.confidentiality}/{asset.integrity}/{asset.availability}</td>
                        <td>{asset.assetValue}</td>
                        <td>{classBadge(asset.classification)}</td>
                        <td>{riskBadge(linkedByAsset.get(asset.id)?.residualRisk ?? "Low")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {section === "risk" && (
            <>
              <div className="page-header">
                <div>
                  <div className="page-title">RISK <span>REGISTER</span></div>
                  <div className="page-desc">{"// inherent and residual risk across all assets"}</div>
                </div>
              </div>
              <div className="search-bar">
                <select value={riskFilter} onChange={(e) => setRiskFilter(e.target.value)}>
                  <option value="">All residual risks</option>
                  <option value="Critical">Critical</option>
                  <option value="High">High</option>
                  <option value="Moderate">Moderate</option>
                  <option value="Low">Low</option>
                </select>
              </div>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Asset</th>
                      <th>Risk</th>
                      <th>Likelihood</th>
                      <th>Severity</th>
                      <th>Inherent</th>
                      <th>Control Effectiveness</th>
                      <th>Residual</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAssessments.map((record) => (
                      <tr key={record.id}>
                        <td>{assets.find((asset) => asset.id === record.assetId)?.assetCode ?? "UNLINKED"}</td>
                        <td>{record.risk}</td>
                        <td>{record.likelihood}</td>
                        <td>{record.severity}</td>
                        <td>{riskBadge(record.riskLevel)}</td>
                        <td>{record.controlEffectiveness}</td>
                        <td>{riskBadge(record.residualRisk)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="card" style={{ marginTop: 16 }}>
                <div className="card-header">Control implementation coverage</div>
                <div className="ctrl-bar-wrap">
                  <div className="ctrl-bar-label">
                    <span>Overall effectiveness score</span>
                    <span>{controlCoverage}%</span>
                  </div>
                  <div className="ctrl-bar-track">
                    <div className="ctrl-bar-fill" style={{ width: `${controlCoverage}%`, background: "var(--accent)" }} />
                  </div>
                </div>
              </div>
            </>
          )}

          {section === "matrix" && (
            <>
              <div className="page-header">
                <div>
                  <div className="page-title">RISK <span>MATRIX</span></div>
                  <div className="page-desc">{"// probability x severity scoring reference"}</div>
                </div>
              </div>
              <div className="card">
                <div className="card-header">Inherent risk matrix</div>
                <div className="matrix">
                  <div className="mx-cell mx-hdr">Severity / Probability</div>
                  <div className="mx-cell mx-hdr">1</div>
                  <div className="mx-cell mx-hdr">2</div>
                  <div className="mx-cell mx-hdr">3</div>
                  <div className="mx-cell mx-hdr">4</div>
                  <div className="mx-cell mx-hdr">5</div>
                  <div className="mx-cell mx-hdr">5 High</div>
                  <div className="mx-cell mx-mo">M</div>
                  <div className="mx-cell mx-mo">M</div>
                  <div className="mx-cell mx-hi">H</div>
                  <div className="mx-cell mx-hi">H</div>
                  <div className="mx-cell mx-hi">H</div>
                  <div className="mx-cell mx-hdr">4 Major</div>
                  <div className="mx-cell mx-lo">L</div>
                  <div className="mx-cell mx-mo">M</div>
                  <div className="mx-cell mx-mo">M</div>
                  <div className="mx-cell mx-hi">H</div>
                  <div className="mx-cell mx-hi">H</div>
                  <div className="mx-cell mx-hdr">3 Moderate</div>
                  <div className="mx-cell mx-lo">L</div>
                  <div className="mx-cell mx-mo">M</div>
                  <div className="mx-cell mx-mo">M</div>
                  <div className="mx-cell mx-mo">M</div>
                  <div className="mx-cell mx-hi">H</div>
                  <div className="mx-cell mx-hdr">2 Minor</div>
                  <div className="mx-cell mx-lo">L</div>
                  <div className="mx-cell mx-lo">L</div>
                  <div className="mx-cell mx-mo">M</div>
                  <div className="mx-cell mx-mo">M</div>
                  <div className="mx-cell mx-mo">M</div>
                  <div className="mx-cell mx-hdr">1 Insignificant</div>
                  <div className="mx-cell mx-vl">VL</div>
                  <div className="mx-cell mx-lo">L</div>
                  <div className="mx-cell mx-lo">L</div>
                  <div className="mx-cell mx-lo">L</div>
                  <div className="mx-cell mx-mo">M</div>
                </div>
              </div>
            </>
          )}

          {section === "controls" && (
            <>
              <div className="page-header">
                <div>
                  <div className="page-title">CONTROL <span>MEASURES</span></div>
                  <div className="page-desc">{"// implementation status across all assets"}</div>
                </div>
              </div>
              <div className="card">
                <div className="card-header">Control implementation coverage</div>
                <div className="ctrl-bar-wrap">
                  <div className="ctrl-bar-label">
                    <span>Overall effectiveness score</span>
                    <span>{controlCoverage}%</span>
                  </div>
                  <div className="ctrl-bar-track">
                    <div className="ctrl-bar-fill" style={{ width: `${controlCoverage}%`, background: "var(--accent)" }} />
                  </div>
                </div>
              </div>
              <div className="card">
                <div className="card-header">Control effectiveness distribution</div>
                {Object.entries(controlDistribution).map(([label, value]) => {
                  const pct = assessments.length === 0 ? 0 : Math.round((value / assessments.length) * 100);
                  const color =
                    label === "Ineffective"
                      ? "var(--danger)"
                      : label === "Partially Effective"
                        ? "var(--warn)"
                        : label === "Substantially Effective"
                          ? "var(--accent2)"
                          : "var(--success)";
                  return (
                    <div className="chart-bar-row" key={label}>
                      <div className="chart-bar-label">{label}</div>
                      <div className="chart-bar-track">
                        <div className="chart-bar-fill" style={{ width: `${pct}%`, background: color }}>
                          {pct > 8 ? `${pct}%` : ""}
                        </div>
                      </div>
                      <div className="chart-bar-count">{value}</div>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {section === "actions" && (
            <>
              <div className="page-header">
                <div>
                  <div className="page-title">ACTION <span>PLANS</span></div>
                  <div className="page-desc">{"// mitigations for high and moderate residual risk"}</div>
                </div>
              </div>
              {actionPlanCandidates.length === 0 ? (
                <div className="card">
                  <div className="info-row">
                    <div className="lbl">Status</div>
                    <div className="val">No assets with High/Moderate/Critical residual risk.</div>
                  </div>
                </div>
              ) : (
                actionPlanCandidates.map((record) => (
                  <div className="card" key={record.id}>
                    <div className="card-header">Action required</div>
                    <div className="info-row">
                      <div className="lbl">Asset</div>
                      <div className="val">{assets.find((asset) => asset.id === record.assetId)?.name ?? "Unlinked asset"}</div>
                    </div>
                    <div className="info-row">
                      <div className="lbl">Risk</div>
                      <div className="val">{record.risk}</div>
                    </div>
                    <div className="info-row">
                      <div className="lbl">Residual rating</div>
                      <div className="val">{riskBadge(record.residualRisk)}</div>
                    </div>
                    <div className="info-row">
                      <div className="lbl">Suggested action</div>
                      <div className="val">{record.justification || "Define mitigation owner, target date, and treatment actions."}</div>
                    </div>
                  </div>
                ))
              )}
            </>
          )}

          {section === "guidelines" && (
            <>
              <div className="page-header">
                <div>
                  <div className="page-title">RISK <span>GUIDELINES</span></div>
                  <div className="page-desc">{"// reference documentation from template and standards"}</div>
                </div>
              </div>
              <div className="card">
                <div className="card-header">Asset classification and valuation</div>
                <div className="info-row"><div className="lbl">Score 3</div><div className="val">Public</div></div>
                <div className="info-row"><div className="lbl">Score 4-5</div><div className="val">Internal Use</div></div>
                <div className="info-row"><div className="lbl">Score 6-7</div><div className="val">Confidential</div></div>
                <div className="info-row"><div className="lbl">Score 8-9</div><div className="val">Restricted</div></div>
              </div>
              <div className="card">
                <div className="card-header">Framework mapping</div>
                <div className="info-row"><div className="lbl">NIST CSF</div><div className="val">Identify, Protect, Detect, Respond, Recover</div></div>
                <div className="info-row"><div className="lbl">ISO/IEC 27001</div><div className="val">Risk treatment, controls, continual improvement</div></div>
                <div className="info-row"><div className="lbl">Template standard</div><div className="val">Inherent risk matrix + control effectiveness + residual risk</div></div>
                <div className="info-row"><div className="lbl">Assessment cycle</div><div className="val">{`${yearFrom}-${yearTo}`}</div></div>
              </div>
            </>
          )}
        </main>
      </div>
      {notification && <div className={`notification show ${notification.error ? "error" : ""}`}>{notification.text}</div>}
    </div>
  );
}
