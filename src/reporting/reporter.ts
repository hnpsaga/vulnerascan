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

    // 2. Markdown report
    const mdContent = this.markdownReporter.generate(result, summary);
    await fs.promises.writeFile(
      path.join(this.options.projectDirectory, "vulnerabilities.md"),
      mdContent,
      "utf8",
    );
    if (this.options.runDirectory) {
      await fs.promises.writeFile(
        path.join(this.options.runDirectory, "vulnerabilities.md"),
        mdContent,
        "utf8",
      );
    }

    // 3. CSV report
    const csvContent = this.csvReporter.generate(result);
    await fs.promises.writeFile(
      path.join(this.options.projectDirectory, "vulnerabilities.csv"),
      csvContent,
      "utf8",
    );
    if (this.options.runDirectory) {
      await fs.promises.writeFile(
        path.join(this.options.runDirectory, "vulnerabilities.csv"),
        csvContent,
        "utf8",
      );
    }

    // Exit code: 0 if no findings, 1 if findings exist.
    return summary.totalFindings > 0 ? 1 : 0;
  }
}
