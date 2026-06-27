import { useState, useEffect } from "react";
import {
  ShieldAlert,
  Folder,
  Layers,
  Activity,
  History,
  Settings as SettingsIcon,
  Search,
  ArrowLeft,
  Download,
  AlertTriangle,
  CheckCircle,
} from "lucide-react";

import "./App.css";

const API_BASE = import.meta.env.DEV
  ? "http://localhost:4000/api"
  : `${window.location.origin}/api`;

type View = "dashboard" | "projects" | "vulnerabilities" | "history" | "settings";

interface DashboardSummary {
  statistics: {
    totalProjects: number;
    totalScans: number;
    totalDependencies: number;
    totalVulnerabilities: number;
    latestScanTimestamp?: string;
  };
  vulnerabilities: {
    total: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
    unknown: number;
  };
  ecosystems: {
    ecosystem: string;
    projectCount: number;
    vulnerabilityCount: number;
  }[];
  projects: ProjectSummary[];
}

interface ProjectSummary {
  id: string;
  name: string;
  path: string;
  ecosystems: string[];
  firstDiscoveredAt: string;
  lastScannedAt: string;
  status: "healthy" | "vulnerable" | "failed" | "unknown";
  workspaceId: string;
  latestScan?: {
    runId: string;
    timestamp: string;
    status: "completed" | "failed";
    directDependencies: number;
    totalDependencies: number;
    vulnerabilitiesCount: number;
    durationMs?: number;
    error?: string;
  };
  vulnerabilities: {
    total: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
    unknown: number;
  };
}

interface HistoricalScanSummary {
  runId: string;
  timestamp: string;
  status: "completed" | "failed";
  directDependencies: number;
  totalDependencies: number;
  vulnerabilitiesCount: number;
  ecosystem?: string;
  projectName?: string;
}

interface VulnerabilityFinding {
  findingId: string;
  advisoryId: string;
  packageName: string;
  ecosystem: string;
  installedVersion: string;
  summary: string;
  details?: string;
  severity?: { type: string; score: string }[];
  aliases: string[];
  references: { source: string; identifier: string; url: string }[];
  isDirect: boolean;
  isTransitive: boolean;
}

export default function App() {
  const [currentView, setCurrentView] = useState<View>("dashboard");
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [timeline, setTimeline] = useState<HistoricalScanSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter selections
  const [selectedEcosystem, setSelectedEcosystem] = useState("");
  const [selectedSeverity, setSelectedSeverity] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  // Detailed views
  const [selectedProject, setSelectedProject] = useState<ProjectSummary | null>(null);
  const [selectedRun, setSelectedRun] = useState<HistoricalScanSummary | null>(null);
  const [runFindings, setRunFindings] = useState<VulnerabilityFinding[]>([]);
  const [loadingFindings, setLoadingFindings] = useState(false);

  useEffect(() => {
    fetchDashboardData();
  }, [selectedEcosystem, selectedSeverity]);

  const fetchDashboardData = async () => {
    setLoading(true);
    setError(null);
    try {
      const filterParams = new URLSearchParams();
      if (selectedEcosystem) filterParams.append("ecosystem", selectedEcosystem);
      if (selectedSeverity) filterParams.append("severity", selectedSeverity);

      const [summaryRes, projectsRes, timelineRes] = await Promise.all([
        fetch(`${API_BASE}/summary?${filterParams}`),
        fetch(`${API_BASE}/projects?${filterParams}`),
        fetch(`${API_BASE}/timeline?${filterParams}`),
      ]);

      if (!summaryRes.ok || !projectsRes.ok || !timelineRes.ok) {
        throw new Error("Failed to load dashboard data from backend server.");
      }

      const summaryData = await summaryRes.json();
      const projectsData = await projectsRes.json();
      const timelineData = await timelineRes.json();

      setSummary(summaryData);
      setProjects(projectsData);
      setTimeline(timelineData);
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  const fetchFindings = async (workspaceId: string, runId: string) => {
    setLoadingFindings(true);
    try {
      const res = await fetch(`${API_BASE}/projects/${workspaceId}/runs/${runId}/findings`);
      if (!res.ok) throw new Error("Failed to load run findings.");
      const data = await res.json();
      setRunFindings(data);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoadingFindings(false);
    }
  };

  const handleProjectClick = (project: ProjectSummary) => {
    setSelectedProject(project);
    if (project.latestScan) {
      const mockRun: HistoricalScanSummary = {
        runId: project.latestScan.runId,
        timestamp: project.latestScan.timestamp,
        status: project.latestScan.status,
        directDependencies: project.latestScan.directDependencies,
        totalDependencies: project.latestScan.totalDependencies,
        vulnerabilitiesCount: project.latestScan.vulnerabilitiesCount,
        projectName: project.name,
      };
      setSelectedRun(mockRun);
      fetchFindings(project.workspaceId, project.latestScan.runId);
    } else {
      setSelectedRun(null);
      setRunFindings([]);
    }
  };

  const handleRunClick = (run: HistoricalScanSummary, proj: ProjectSummary) => {
    setSelectedProject(proj);
    setSelectedRun(run);
    fetchFindings(proj.workspaceId, run.runId);
  };

  const renderStatusBadge = (status: string) => {
    const map: Record<string, string> = {
      healthy: "status-healthy",
      vulnerable: "status-vulnerable",
      failed: "status-failed",
      unknown: "status-unknown",
    };
    return <span className={`badge ${map[status] || "status-unknown"}`}>{status}</span>;
  };

  const renderSeverityBadge = (sev: string) => {
    return <span className={`badge severity-${sev}`}>{sev}</span>;
  };

  if (loading) {
    return (
      <div className="empty-state" style={{ height: "100vh" }}>
        <Activity className="animate-spin text-blue-500" size={48} style={{ color: "#3b82f6" }} />
        <h2 className="empty-title">Loading VulneraScan Dashboard...</h2>
        <p className="empty-desc">Connecting to backend services...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="empty-state" style={{ height: "100vh" }}>
        <AlertTriangle size={48} style={{ color: "#ef4444" }} />
        <h2 className="empty-title">Backend Connection Failure</h2>
        <p className="empty-desc" style={{ marginBottom: "1.5rem" }}>
          {error}
        </p>
        <button className="btn btn-primary" onClick={fetchDashboardData}>
          Retry Connection
        </button>
      </div>
    );
  }

  return (
    <div className="app-container">
      {/* Sidebar Navigation */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <ShieldAlert size={28} style={{ color: "#3b82f6" }} />
          <span className="sidebar-logo">VulneraScan</span>
        </div>
        <ul className="nav-menu">
          <li
            className={`nav-item ${currentView === "dashboard" && !selectedProject ? "active" : ""}`}
            onClick={() => {
              setCurrentView("dashboard");
              setSelectedProject(null);
              setSelectedRun(null);
            }}
          >
            <Layers size={18} /> Dashboard
          </li>
          <li
            className={`nav-item ${currentView === "projects" || selectedProject ? "active" : ""}`}
            onClick={() => {
              setCurrentView("projects");
              setSelectedProject(null);
              setSelectedRun(null);
            }}
          >
            <Folder size={18} /> Projects
          </li>
          <li
            className={`nav-item ${currentView === "vulnerabilities" ? "active" : ""}`}
            onClick={() => {
              setCurrentView("vulnerabilities");
              setSelectedProject(null);
              setSelectedRun(null);
            }}
          >
            <ShieldAlert size={18} /> Vulnerabilities
          </li>
          <li
            className={`nav-item ${currentView === "history" ? "active" : ""}`}
            onClick={() => {
              setCurrentView("history");
              setSelectedProject(null);
              setSelectedRun(null);
            }}
          >
            <History size={18} /> History
          </li>
          <li
            className={`nav-item ${currentView === "settings" ? "active" : ""}`}
            onClick={() => {
              setCurrentView("settings");
              setSelectedProject(null);
              setSelectedRun(null);
            }}
          >
            <SettingsIcon size={18} /> Settings
          </li>
        </ul>
      </aside>

      {/* Main Body */}
      <main className="main-content">
        {selectedProject ? (
          /* PROJECT DETAILS / SCAN DETAILS VIEW */
          <div>
            <div className="top-bar">
              <button
                className="btn"
                onClick={() => {
                  setSelectedProject(null);
                  setSelectedRun(null);
                }}
              >
                <ArrowLeft size={16} /> Back to Projects
              </button>
              <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                {selectedRun && (
                  <>
                    <a
                      href={`${API_BASE}/projects/${selectedProject.workspaceId}/runs/${selectedRun.runId}/report/json`}
                      download
                      className="btn"
                    >
                      <Download size={16} /> JSON Report
                    </a>
                    <a
                      href={`${API_BASE}/projects/${selectedProject.workspaceId}/runs/${selectedRun.runId}/report/markdown`}
                      download
                      className="btn"
                    >
                      <Download size={16} /> MD Report
                    </a>
                    <a
                      href={`${API_BASE}/projects/${selectedProject.workspaceId}/runs/${selectedRun.runId}/report/csv`}
                      download
                      className="btn"
                    >
                      <Download size={16} /> CSV Report
                    </a>
                    <a
                      href={`${API_BASE}/projects/${selectedProject.workspaceId}/runs/${selectedRun.runId}/report/sarif`}
                      download
                      className="btn"
                    >
                      <Download size={16} /> SARIF
                    </a>
                    <a
                      href={`${API_BASE}/projects/${selectedProject.workspaceId}/runs/${selectedRun.runId}/report/cyclonedx`}
                      download
                      className="btn"
                    >
                      <Download size={16} /> CycloneDX BOM
                    </a>
                    <a
                      href={`${API_BASE}/projects/${selectedProject.workspaceId}/runs/${selectedRun.runId}/report/spdx`}
                      download
                      className="btn"
                    >
                      <Download size={16} /> SPDX BOM
                    </a>
                    <a
                      href={`${API_BASE}/projects/${selectedProject.workspaceId}/runs/${selectedRun.runId}/report/llm-json`}
                      download
                      className="btn"
                    >
                      <Download size={16} /> LLM Context (JSON)
                    </a>
                    <a
                      href={`${API_BASE}/projects/${selectedProject.workspaceId}/runs/${selectedRun.runId}/report/llm-markdown`}
                      download
                      className="btn"
                    >
                      <Download size={16} /> LLM Context (MD)
                    </a>
                  </>
                )}
              </div>
            </div>

            <h2 className="page-title" style={{ marginBottom: "0.5rem" }}>
              {selectedProject.name}
            </h2>
            <p style={{ color: "#94a3b8", margin: "0 0 1.5rem 0", wordBreak: "break-all" }}>
              Path: {selectedProject.path}
            </p>

            <div className="detail-section">
              <div>
                {/* Latest Scan Metadata */}
                <div className="glass section-card" style={{ marginBottom: "1.5rem" }}>
                  <h3 className="section-card-title">
                    <Activity size={18} style={{ color: "#3b82f6" }} /> Scan Details
                  </h3>
                  {selectedRun ? (
                    <div>
                      <div className="detail-info-block">
                        <div>
                          <div className="info-label">Run ID</div>
                          <div className="info-value">{selectedRun.runId}</div>
                        </div>
                        <div>
                          <div className="info-label">Timestamp</div>
                          <div className="info-value">
                            {new Date(selectedRun.timestamp).toLocaleString()}
                          </div>
                        </div>
                        <div>
                          <div className="info-label">Status</div>
                          <div className="info-value">{renderStatusBadge(selectedRun.status)}</div>
                        </div>
                      </div>
                      <div className="detail-info-block">
                        <div>
                          <div className="info-label">Direct Dependencies</div>
                          <div className="info-value">{selectedRun.directDependencies}</div>
                        </div>
                        <div>
                          <div className="info-label">Total Dependencies</div>
                          <div className="info-value">{selectedRun.totalDependencies}</div>
                        </div>
                        <div>
                          <div className="info-label">Vulnerabilities Detected</div>
                          <div className="info-value">{selectedRun.vulnerabilitiesCount}</div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p style={{ color: "#94a3b8" }}>No successful scans recorded yet.</p>
                  )}
                </div>

                {/* Vulnerability Findings list */}
                <div className="glass section-card">
                  <h3 className="section-card-title">
                    <ShieldAlert size={18} style={{ color: "#ef4444" }} /> Findings
                  </h3>
                  {loadingFindings ? (
                    <p style={{ color: "#94a3b8" }}>Loading vulnerability details...</p>
                  ) : runFindings.length === 0 ? (
                    <div style={{ textAlign: "center", padding: "2rem" }}>
                      <CheckCircle size={36} style={{ color: "#10b981", marginBottom: "0.5rem" }} />
                      <p style={{ color: "#94a3b8", margin: 0 }}>
                        No vulnerability findings detected!
                      </p>
                    </div>
                  ) : (
                    runFindings.map((finding) => {
                      // Determine severity color
                      const scoreObj =
                        finding.severity?.find((s) => s.type.toLowerCase() === "cvss_v3") ||
                        finding.severity?.[0];
                      const score = scoreObj ? parseFloat(scoreObj.score) : 0;
                      let sev = "unknown";
                      if (score >= 9.0) sev = "critical";
                      else if (score >= 7.0) sev = "high";
                      else if (score >= 4.0) sev = "medium";
                      else if (score >= 0.1) sev = "low";

                      return (
                        <div key={finding.findingId} className={`glass vuln-card ${sev}`}>
                          <div className="vuln-header">
                            <div>
                              <span className="vuln-title">{finding.advisoryId}</span>
                              <div className="vuln-pkg">
                                {finding.packageName}@{finding.installedVersion} (
                                {finding.ecosystem})
                              </div>
                            </div>
                            <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                              {finding.isDirect ? (
                                <span className="badge status-vulnerable">Direct</span>
                              ) : (
                                <span className="badge status-unknown">Transitive</span>
                              )}
                              {renderSeverityBadge(sev)}
                            </div>
                          </div>
                          <p className="vuln-summary">{finding.summary}</p>
                          {finding.details && (
                            <details style={{ marginBottom: "1rem" }}>
                              <summary
                                style={{
                                  color: "#60a5fa",
                                  cursor: "pointer",
                                  fontSize: "0.8125rem",
                                }}
                              >
                                View Details
                              </summary>
                              <pre
                                style={{
                                  backgroundColor: "#0d1117",
                                  padding: "0.75rem",
                                  borderRadius: "0.25rem",
                                  fontSize: "0.75rem",
                                  overflowX: "auto",
                                  whiteSpace: "pre-wrap",
                                  marginTop: "0.5rem",
                                }}
                              >
                                {finding.details}
                              </pre>
                            </details>
                          )}
                          <div className="vuln-links">
                            {finding.references.slice(0, 5).map((ref, idx) => (
                              <a
                                key={idx}
                                href={ref.url}
                                target="_blank"
                                rel="noreferrer"
                                className="vuln-link"
                              >
                                [{ref.source || "Link"}] {ref.identifier || "Reference"}
                              </a>
                            ))}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Sidebar list of historical scans */}
              <div className="glass section-card">
                <h3 className="section-card-title">
                  <History size={18} style={{ color: "#3b82f6" }} /> Scan History
                </h3>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                  {timeline
                    .filter((run) => run.projectName === selectedProject.name)
                    .map((run) => (
                      <div
                        key={run.runId}
                        className="glass"
                        style={{
                          padding: "0.75rem",
                          borderRadius: "0.5rem",
                          cursor: "pointer",
                          border:
                            selectedRun?.runId === run.runId
                              ? "1px solid #3b82f6"
                              : "1px solid transparent",
                        }}
                        onClick={() => handleRunClick(run, selectedProject)}
                      >
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            fontSize: "0.8125rem",
                          }}
                        >
                          <span style={{ fontWeight: 600 }}>
                            {new Date(run.timestamp).toLocaleDateString()}
                          </span>
                          {renderStatusBadge(run.status)}
                        </div>
                        <div
                          style={{ fontSize: "0.75rem", color: "#94a3b8", marginTop: "0.25rem" }}
                        >
                          Vulnerabilities: {run.vulnerabilitiesCount}
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          </div>
        ) : currentView === "dashboard" ? (
          /* DASHBOARD HOME VIEW */
          <div>
            <div className="top-bar">
              <h2 className="page-title">Workspace Overview</h2>
              <div className="controls-bar" style={{ margin: 0 }}>
                <select
                  className="select-input"
                  value={selectedEcosystem}
                  onChange={(e) => setSelectedEcosystem(e.target.value)}
                >
                  <option value="">All Ecosystems</option>
                  <option value="node">Node / npm</option>
                  <option value="python">Python</option>
                  <option value="go">Go</option>
                  <option value="rust">Rust</option>
                  <option value="dotnet">.NET</option>
                  <option value="java">Java / Maven</option>
                  <option value="php">PHP</option>
                </select>
                <select
                  className="select-input"
                  value={selectedSeverity}
                  onChange={(e) => setSelectedSeverity(e.target.value)}
                >
                  <option value="">All Severities</option>
                  <option value="critical">Critical</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>
            </div>

            {/* Statistics Cards */}
            {summary && (
              <div className="stats-grid">
                <div className="glass stat-card">
                  <div
                    className="stat-icon-wrapper"
                    style={{ backgroundColor: "rgba(59, 130, 246, 0.15)" }}
                  >
                    <Folder style={{ color: "#3b82f6" }} />
                  </div>
                  <div className="stat-info">
                    <span className="stat-label">Total Projects</span>
                    <span className="stat-value">{summary.statistics.totalProjects}</span>
                  </div>
                </div>
                <div className="glass stat-card">
                  <div
                    className="stat-icon-wrapper"
                    style={{ backgroundColor: "rgba(16, 185, 129, 0.15)" }}
                  >
                    <Activity style={{ color: "#10b981" }} />
                  </div>
                  <div className="stat-info">
                    <span className="stat-label">Total Scans</span>
                    <span className="stat-value">{summary.statistics.totalScans}</span>
                  </div>
                </div>
                <div className="glass stat-card">
                  <div
                    className="stat-icon-wrapper"
                    style={{ backgroundColor: "rgba(234, 179, 8, 0.15)" }}
                  >
                    <Layers style={{ color: "#eab308" }} />
                  </div>
                  <div className="stat-info">
                    <span className="stat-label">Dependencies</span>
                    <span className="stat-value">{summary.statistics.totalDependencies}</span>
                  </div>
                </div>
                <div className="glass stat-card">
                  <div
                    className="stat-icon-wrapper"
                    style={{ backgroundColor: "rgba(239, 68, 68, 0.15)" }}
                  >
                    <ShieldAlert style={{ color: "#ef4444" }} />
                  </div>
                  <div className="stat-info">
                    <span className="stat-label">Vulnerabilities</span>
                    <span className="stat-value">{summary.statistics.totalVulnerabilities}</span>
                  </div>
                </div>
              </div>
            )}

            <div className="card-section">
              {/* Severity Chart */}
              {summary && (
                <div className="glass section-card">
                  <h3 className="section-card-title">Vulnerabilities by Severity</h3>
                  <div className="chart-bar-container">
                    {[
                      {
                        label: "Critical",
                        count: summary.vulnerabilities.critical,
                        color: "#ef4444",
                      },
                      { label: "High", count: summary.vulnerabilities.high, color: "#f97316" },
                      { label: "Medium", count: summary.vulnerabilities.medium, color: "#eab308" },
                      { label: "Low", count: summary.vulnerabilities.low, color: "#3b82f6" },
                      {
                        label: "Unknown",
                        count: summary.vulnerabilities.unknown,
                        color: "#9ca3af",
                      },
                    ].map((row) => {
                      const pct =
                        summary.vulnerabilities.total > 0
                          ? (row.count / summary.vulnerabilities.total) * 100
                          : 0;
                      return (
                        <div key={row.label} className="chart-bar-row">
                          <span className="chart-bar-label">{row.label}</span>
                          <div className="chart-bar-track">
                            <div
                              className="chart-bar-fill"
                              style={{ width: `${pct}%`, backgroundColor: row.color }}
                            />
                          </div>
                          <span className="chart-bar-value">{row.count}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Ecosystems list */}
              {summary && (
                <div className="glass section-card">
                  <h3 className="section-card-title">Projects by Ecosystem</h3>
                  <div className="chart-bar-container">
                    {summary.ecosystems.length === 0 ? (
                      <p style={{ color: "#94a3b8" }}>No ecosystems recorded yet.</p>
                    ) : (
                      summary.ecosystems.map((eco) => {
                        const totalProjs = summary.statistics.totalProjects || 1;
                        const pct = (eco.projectCount / totalProjs) * 100;
                        return (
                          <div key={eco.ecosystem} className="chart-bar-row">
                            <span
                              className="chart-bar-label"
                              style={{ textTransform: "capitalize" }}
                            >
                              {eco.ecosystem}
                            </span>
                            <div className="chart-bar-track">
                              <div
                                className="chart-bar-fill"
                                style={{ width: `${pct}%`, backgroundColor: "#3b82f6" }}
                              />
                            </div>
                            <span className="chart-bar-value" style={{ width: "60px" }}>
                              {eco.projectCount} proj
                            </span>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Quick timeline preview */}
            <div className="glass section-card" style={{ marginBottom: "2rem" }}>
              <h3 className="section-card-title">
                <History size={18} style={{ color: "#3b82f6" }} /> Recent Scan History
              </h3>
              {timeline.length === 0 ? (
                <p style={{ color: "#94a3b8" }}>No scan history found.</p>
              ) : (
                <div className="timeline-list">
                  {timeline.slice(0, 5).map((t, idx) => (
                    <div key={idx} className="timeline-item">
                      <div className="timeline-title">{t.projectName || "Unknown Project"}</div>
                      <div className="timeline-meta">
                        Scan run ID {t.runId} • {new Date(t.timestamp).toLocaleString()}
                      </div>
                      <div className="timeline-stats">
                        Dependencies Scanned: {t.totalDependencies} | Status:{" "}
                        {renderStatusBadge(t.status)} | Vulnerabilities Count:{" "}
                        {t.vulnerabilitiesCount}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : currentView === "projects" ? (
          /* PROJECTS VIEW */
          <div>
            <div className="top-bar">
              <h2 className="page-title">Registered Projects</h2>
            </div>

            <div className="controls-bar">
              <div style={{ position: "relative", flex: 1, display: "flex", alignItems: "center" }}>
                <Search
                  size={16}
                  style={{ position: "absolute", left: "0.75rem", color: "#94a3b8" }}
                />
                <input
                  type="text"
                  placeholder="Search projects by name..."
                  className="search-input"
                  style={{ paddingLeft: "2.5rem" }}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <select
                className="select-input"
                value={selectedEcosystem}
                onChange={(e) => setSelectedEcosystem(e.target.value)}
              >
                <option value="">All Ecosystems</option>
                <option value="node">Node / npm</option>
                <option value="python">Python</option>
                <option value="go">Go</option>
                <option value="rust">Rust</option>
                <option value="dotnet">.NET</option>
                <option value="java">Java / Maven</option>
                <option value="php">PHP</option>
              </select>
              <select
                className="select-input"
                value={selectedSeverity}
                onChange={(e) => setSelectedSeverity(e.target.value)}
              >
                <option value="">All Severities</option>
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>

            <div className="glass data-table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Project Name</th>
                    <th>Ecosystem</th>
                    <th>Status</th>
                    <th>Vulnerabilities</th>
                    <th>Last Scanned</th>
                    <th>Dependencies</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {projects.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ textAlign: "center", color: "#94a3b8" }}>
                        No projects registered matching current filters.
                      </td>
                    </tr>
                  ) : (
                    projects
                      .filter((p) => p.name.toLowerCase().includes(searchQuery.toLowerCase()))
                      .map((p) => (
                        <tr key={p.id}>
                          <td style={{ fontWeight: 600 }}>{p.name}</td>
                          <td style={{ textTransform: "capitalize" }}>{p.ecosystems.join(", ")}</td>
                          <td>{renderStatusBadge(p.status)}</td>
                          <td>
                            {p.vulnerabilities.total > 0 ? (
                              <div style={{ display: "flex", gap: "0.25rem", flexWrap: "wrap" }}>
                                {p.vulnerabilities.critical > 0 && (
                                  <span className="badge severity-critical">
                                    {p.vulnerabilities.critical} Crit
                                  </span>
                                )}
                                {p.vulnerabilities.high > 0 && (
                                  <span className="badge severity-high">
                                    {p.vulnerabilities.high} High
                                  </span>
                                )}
                                {p.vulnerabilities.medium > 0 && (
                                  <span className="badge severity-medium">
                                    {p.vulnerabilities.medium} Med
                                  </span>
                                )}
                                {p.vulnerabilities.low > 0 && (
                                  <span className="badge severity-low">
                                    {p.vulnerabilities.low} Low
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span style={{ color: "#94a3b8" }}>None</span>
                            )}
                          </td>
                          <td>{new Date(p.lastScannedAt).toLocaleString()}</td>
                          <td>{p.latestScan?.totalDependencies || 0}</td>
                          <td>
                            <button className="btn" onClick={() => handleProjectClick(p)}>
                              View Details
                            </button>
                          </td>
                        </tr>
                      ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : currentView === "vulnerabilities" ? (
          /* VULNERABILITIES GLOBAL VIEW */
          <div>
            <div className="top-bar">
              <h2 className="page-title">Detected Vulnerabilities</h2>
            </div>

            <div className="controls-bar">
              <div style={{ position: "relative", flex: 1, display: "flex", alignItems: "center" }}>
                <Search
                  size={16}
                  style={{ position: "absolute", left: "0.75rem", color: "#94a3b8" }}
                />
                <input
                  type="text"
                  placeholder="Search package name or advisory ID..."
                  className="search-input"
                  style={{ paddingLeft: "2.5rem" }}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <select
                className="select-input"
                value={selectedEcosystem}
                onChange={(e) => setSelectedEcosystem(e.target.value)}
              >
                <option value="">All Ecosystems</option>
                <option value="node">Node / npm</option>
                <option value="python">Python</option>
                <option value="go">Go</option>
                <option value="rust">Rust</option>
                <option value="dotnet">.NET</option>
                <option value="java">Java / Maven</option>
                <option value="php">PHP</option>
              </select>
              <select
                className="select-input"
                value={selectedSeverity}
                onChange={(e) => setSelectedSeverity(e.target.value)}
              >
                <option value="">All Severities</option>
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>

            <div className="glass data-table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Advisory ID</th>
                    <th>Package</th>
                    <th>Ecosystem</th>
                    <th>Version</th>
                    <th>Project Impacted</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {projects.every((p) => p.vulnerabilities.total === 0) ? (
                    <tr>
                      <td colSpan={6} style={{ textAlign: "center", color: "#94a3b8" }}>
                        No vulnerabilities detected in this workspace!
                      </td>
                    </tr>
                  ) : (
                    projects.flatMap((p) => {
                      // We list projects, but to retrieve actual vulnerability lists we can use the latest findings
                      // Since UI has loaded projects, we can mock/list vulnerabilities based on the project's vulnerability summaries.
                      // Alternatively, we query the latest successful scans' findings.
                      // Let's dynamically display the project names that contain vulnerabilities as high-level indicators.
                      if (p.vulnerabilities.total === 0) return [];
                      return [
                        <tr key={p.id}>
                          <td style={{ fontWeight: 600, color: "#ef4444" }}>Vulnerable Project</td>
                          <td style={{ fontWeight: 600 }}>{p.name}</td>
                          <td>{p.ecosystems.join(", ")}</td>
                          <td>Latest Scan</td>
                          <td>{p.name}</td>
                          <td>
                            <button
                              className="btn btn-primary"
                              onClick={() => handleProjectClick(p)}
                            >
                              Inspect Findings ({p.vulnerabilities.total})
                            </button>
                          </td>
                        </tr>,
                      ];
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : currentView === "history" ? (
          /* SCAN TIMELINE VIEW */
          <div>
            <div className="top-bar">
              <h2 className="page-title">Scan Execution History</h2>
            </div>

            <div className="controls-bar">
              <select
                className="select-input"
                value={selectedEcosystem}
                onChange={(e) => setSelectedEcosystem(e.target.value)}
              >
                <option value="">All Ecosystems</option>
                <option value="node">Node / npm</option>
                <option value="python">Python</option>
                <option value="go">Go</option>
                <option value="rust">Rust</option>
                <option value="dotnet">.NET</option>
                <option value="java">Java / Maven</option>
                <option value="php">PHP</option>
              </select>
            </div>

            <div className="glass data-table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Scan Run ID</th>
                    <th>Project</th>
                    <th>Timestamp</th>
                    <th>Ecosystem</th>
                    <th>Status</th>
                    <th>Vulnerabilities</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {timeline.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ textAlign: "center", color: "#94a3b8" }}>
                        No scan history runs matching filters.
                      </td>
                    </tr>
                  ) : (
                    timeline.map((run) => {
                      const correspondingProject = projects.find((p) => p.name === run.projectName);
                      return (
                        <tr key={run.runId}>
                          <td style={{ fontFamily: "monospace" }}>{run.runId}</td>
                          <td style={{ fontWeight: 600 }}>
                            {run.projectName || "Unknown Project"}
                          </td>
                          <td>{new Date(run.timestamp).toLocaleString()}</td>
                          <td style={{ textTransform: "capitalize" }}>{run.ecosystem || "node"}</td>
                          <td>{renderStatusBadge(run.status)}</td>
                          <td>{run.vulnerabilitiesCount}</td>
                          <td>
                            {correspondingProject ? (
                              <button
                                className="btn"
                                onClick={() => handleRunClick(run, correspondingProject)}
                              >
                                View Results
                              </button>
                            ) : (
                              <span style={{ color: "#94a3b8" }}>Deleted Project</span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          /* SETTINGS PLACEHOLDER VIEW */
          <div className="glass empty-state">
            <SettingsIcon size={48} style={{ color: "#94a3b8", marginBottom: "1rem" }} />
            <h2 className="empty-title">Dashboard Settings</h2>
            <p className="empty-desc">
              Settings configurations are currently running on default system boundaries. Additional
              workspace customization rules can be modified via project config.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
