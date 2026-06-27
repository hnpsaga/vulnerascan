import http from "http";
import url from "url";
import path from "path";
import fs from "fs";
import { DashboardService, DashboardFilter } from "../workspace/dashboard-service.js";

export interface DashboardServerOptions {
  port?: number;
  host?: string;
}

export class DashboardServer {
  private service: DashboardService;
  private port: number;
  private host: string;
  private server: http.Server | null = null;

  constructor(options?: DashboardServerOptions, baseDir?: string) {
    this.service = new DashboardService(baseDir);
    this.port = options?.port || 4000;
    this.host = options?.host || "localhost";
  }

  start(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.server = http.createServer((req, res) => {
        // Set CORS headers
        res.setHeader("Access-Control-Allow-Origin", "*");
        res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
        res.setHeader("Access-Control-Allow-Headers", "Content-Type");

        if (req.method === "OPTIONS") {
          res.writeHead(204);
          res.end();
          return;
        }

        const handleRequest = async (): Promise<void> => {
          try {
            const parsedUrl = url.parse(req.url || "", true);
            const pathname = parsedUrl.pathname || "";
            const query = parsedUrl.query;

            // Build filter
            const filter: DashboardFilter = {};
            if (typeof query.project === "string") filter.project = query.project;
            if (typeof query.ecosystem === "string") filter.ecosystem = query.ecosystem;
            if (typeof query.severity === "string") filter.severity = query.severity;
            if (typeof query.startDate === "string") filter.startDate = query.startDate;
            if (typeof query.endDate === "string") filter.endDate = query.endDate;

            if (pathname === "/api/summary") {
              const summary = await this.service.getDashboardSummary(filter);
              res.writeHead(200, { "Content-Type": "application/json" });
              res.end(JSON.stringify(summary));
              return;
            }

            if (pathname === "/api/projects") {
              const projects = await this.service.getProjectSummaries(filter);
              res.writeHead(200, { "Content-Type": "application/json" });
              res.end(JSON.stringify(projects));
              return;
            }

            if (pathname === "/api/timeline") {
              const timeline = await this.service.getScanTimeline(filter);
              res.writeHead(200, { "Content-Type": "application/json" });
              res.end(JSON.stringify(timeline));
              return;
            }

            // GET /api/projects/:id/runs/:runId/findings
            const findingsRegex = /^\/api\/projects\/([^/]+)\/runs\/([^/]+)\/findings$/;
            const findingsMatch = pathname.match(findingsRegex);
            if (findingsMatch) {
              const workspaceId = findingsMatch[1];
              const runId = findingsMatch[2];
              const findings = await this.service.getFindingsForRun(workspaceId, runId);
              res.writeHead(200, { "Content-Type": "application/json" });
              res.end(JSON.stringify(findings));
              return;
            }

            // GET /api/projects/:id/runs/:runId/report/:format
            const reportRegex =
              /^\/api\/projects\/([^/]+)\/runs\/([^/]+)\/report\/(json|markdown|csv)$/;
            const reportMatch = pathname.match(reportRegex);
            if (reportMatch) {
              const workspaceId = reportMatch[1];
              const runId = reportMatch[2];
              const format = reportMatch[3];

              const fileMap: Record<string, string> = {
                json: "vulnerabilities.json",
                markdown: "vulnerabilities.md",
                csv: "vulnerabilities.csv",
              };

              const fileName = fileMap[format];
              // Read from workspace runs directory. Try both flat layout and nested layout.
              const runDir = path.join(this.service.workspacesBaseDir, workspaceId, "runs", runId);
              let filePath = path.join(runDir, fileName);

              if (!fs.existsSync(filePath)) {
                // Try layout where workspacesBaseDir is VULNERASCAN_HOME directly and runs is under workspaceId
                const nestedRunDir = path.join(
                  this.service.workspacesBaseDir,
                  "workspaces",
                  workspaceId,
                  "runs",
                  runId,
                );
                filePath = path.join(nestedRunDir, fileName);
              }

              if (!fs.existsSync(filePath)) {
                // Try layout where workspacesBaseDir is tempBaseDir and we look up .vulnerascan/workspaces
                const absoluteHomeDir = path.dirname(this.service.workspacesBaseDir);
                const otherNestedRunDir = path.join(
                  absoluteHomeDir,
                  ".vulnerascan",
                  "workspaces",
                  workspaceId,
                  "runs",
                  runId,
                );
                filePath = path.join(otherNestedRunDir, fileName);
              }

              if (fs.existsSync(filePath)) {
                const contentTypeMap: Record<string, string> = {
                  json: "application/json",
                  markdown: "text/markdown",
                  csv: "text/csv",
                };
                res.writeHead(200, {
                  "Content-Type": contentTypeMap[format],
                  "Content-Disposition": `attachment; filename="${fileName}"`,
                });
                fs.createReadStream(filePath).pipe(res);
                return;
              } else {
                res.writeHead(404, { "Content-Type": "application/json" });
                res.end(JSON.stringify({ error: "Report file not found." }));
                return;
              }
            }

            res.writeHead(404, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: "Not Found" }));
          } catch (err: unknown) {
            const message = err instanceof Error ? err.message : String(err);
            res.writeHead(500, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: message }));
          }
        };

        void handleRequest();
      });

      this.server.listen(this.port, this.host, () => {
        resolve();
      });

      this.server.on("error", (err) => {
        reject(err);
      });
    });
  }

  stop(): Promise<void> {
    return new Promise((resolve) => {
      if (this.server) {
        this.server.close(() => {
          resolve();
        });
      } else {
        resolve();
      }
    });
  }
}
