import fs from "fs";
import path from "path";
import { VulnerabilityDetectionResult } from "../vulnerability/vulnerability-models.js";
import { calculateSummary } from "./summary.js";
import { TerminalReporter } from "./terminal-reporter.js";
import { MarkdownReporter } from "./markdown-reporter.js";
import { CsvReporter } from "./csv-reporter.js";

export interface ReporterOptions {
  projectDirectory: string;
  runDirectory?: string;
  outputDirectory?: string;
  quiet?: boolean;
}

export class Reporter {
  private options: ReporterOptions;
  private terminalReporter: TerminalReporter;
  private markdownReporter: MarkdownReporter;
  private csvReporter: CsvReporter;

  constructor(options: ReporterOptions) {
    this.options = options;
    this.terminalReporter = new TerminalReporter();
    this.markdownReporter = new MarkdownReporter();
    this.csvReporter = new CsvReporter();
  }

  /**
   * Orchestrates formatting and output generation for all formats.
   * Returns a promise resolving to the correct exit code:
   * - 0 → Scan completed successfully with no vulnerabilities.
   * - 1 → Scan completed successfully and vulnerabilities were found.
   */
  async report(result: VulnerabilityDetectionResult): Promise<number> {
    const summary = calculateSummary(result);

    // 1. Terminal report
    if (!this.options.quiet) {
      this.terminalReporter.render(result, summary);
    }

    // Prepare content
    const mdContent = this.markdownReporter.generate(result, summary);
    const csvContent = this.csvReporter.generate(result);

    // Load extra context (dependency graph) for CycloneDX, SPDX, etc. if available
    let graph: import("../resolution/models/dependency-graph.js").DependencyGraph | undefined;
    if (this.options.runDirectory) {
      const graphPath = path.join(this.options.runDirectory, "dependency-graph.json");
      if (fs.existsSync(graphPath)) {
        try {
          graph = JSON.parse(
            fs.readFileSync(graphPath, "utf8"),
          ) as import("../resolution/models/dependency-graph.js").DependencyGraph;
        } catch {
          // Ignore
        }
      }
    }

    const {
      exportToSarif,
      exportToCycloneDx,
      exportToSpdx,
      generateLlmContextJson,
      generateLlmContextMd,
    } = await import("../exporters/index.js");

    const sarifData = exportToSarif(result);
    const cycloneDxData = exportToCycloneDx(result, graph);
    const spdxData = exportToSpdx(result, graph, path.basename(this.options.projectDirectory));
    const llmJson = generateLlmContextJson(
      result,
      graph,
      path.basename(this.options.projectDirectory),
    );
    const llmMd = generateLlmContextMd(llmJson);

    // Write to workspace run directory (canonical storage location)
    if (this.options.runDirectory) {
      await fs.promises.writeFile(
        path.join(this.options.runDirectory, "vulnerabilities.md"),
        mdContent,
        "utf8",
      );
      await fs.promises.writeFile(
        path.join(this.options.runDirectory, "vulnerabilities.csv"),
        csvContent,
        "utf8",
      );
      await fs.promises.writeFile(
        path.join(this.options.runDirectory, "vulnerabilities.sarif"),
        JSON.stringify(sarifData, null, 2),
        "utf8",
      );
      await fs.promises.writeFile(
        path.join(this.options.runDirectory, "bom.json"),
        JSON.stringify(cycloneDxData, null, 2),
        "utf8",
      );
      await fs.promises.writeFile(
        path.join(this.options.runDirectory, "project.spdx.json"),
        JSON.stringify(spdxData, null, 2),
        "utf8",
      );
      await fs.promises.writeFile(
        path.join(this.options.runDirectory, "llm-context.json"),
        JSON.stringify(llmJson, null, 2),
        "utf8",
      );
      await fs.promises.writeFile(
        path.join(this.options.runDirectory, "llm-context.md"),
        llmMd,
        "utf8",
      );
    }

    // Write to user-requested output directory
    if (this.options.outputDirectory) {
      const outDir = this.options.outputDirectory;
      if (!fs.existsSync(outDir)) {
        await fs.promises.mkdir(outDir, { recursive: true });
      }

      await fs.promises.writeFile(path.join(outDir, "vulnerabilities.md"), mdContent, "utf8");
      await fs.promises.writeFile(path.join(outDir, "vulnerabilities.csv"), csvContent, "utf8");
      await fs.promises.writeFile(
        path.join(outDir, "vulnerabilities.sarif"),
        JSON.stringify(sarifData, null, 2),
        "utf8",
      );
      await fs.promises.writeFile(
        path.join(outDir, "bom.json"),
        JSON.stringify(cycloneDxData, null, 2),
        "utf8",
      );
      await fs.promises.writeFile(
        path.join(outDir, "project.spdx.json"),
        JSON.stringify(spdxData, null, 2),
        "utf8",
      );
      await fs.promises.writeFile(
        path.join(outDir, "llm-context.json"),
        JSON.stringify(llmJson, null, 2),
        "utf8",
      );
      await fs.promises.writeFile(path.join(outDir, "llm-context.md"), llmMd, "utf8");
    }

    // Exit code: 0 if no findings, 1 if findings exist.
    return summary.totalFindings > 0 ? 1 : 0;
  }
}
