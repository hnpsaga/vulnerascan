import { describe, it, expect } from "vitest";
import { execSync, ExecException } from "child_process";
import path from "path";
import fs from "fs";

const CLI_ENTRY = path.resolve(__dirname, "../src/cli.ts");

describe("CLI Export Commands Integration", { timeout: 30000 }, () => {
  const testProjectDir = path.resolve(__dirname, "fixtures/node-with-lockfile");
  const emptyProjectDir = path.resolve(__dirname, "fixtures/node-without-lockfile"); // node-without-lockfile will serve as an un-scanned directory initially

  it("fails to export if no scan runs are available", () => {
    try {
      execSync(`node --import tsx/esm ${CLI_ENTRY} export sarif -p ${emptyProjectDir}`, {
        stdio: "pipe",
      });
      expect.fail("Should have failed");
    } catch (err) {
      const execErr = err as ExecException & { stderr: Buffer; status?: number };
      expect(execErr.status).toBe(1);
      expect(execErr.stderr.toString()).toContain("No scan runs found for this workspace");
    }
  });

  it("successfully exports to sarif, cyclonedx, spdx, and llm context", () => {
    // 1. Run a scan to ensure there is at least one run
    execSync(`node --import tsx/esm ${CLI_ENTRY} scan -p ${testProjectDir}`, { stdio: "ignore" });

    // 2. Test Export SARIF
    const sarifOut = execSync(
      `node --import tsx/esm ${CLI_ENTRY} export sarif -p ${testProjectDir}`,
      { encoding: "utf8" },
    );
    expect(sarifOut).toContain("SARIF export successfully generated");
    expect(fs.existsSync(path.join(process.cwd(), "vulnerabilities.sarif"))).toBe(true);
    fs.rmSync(path.join(process.cwd(), "vulnerabilities.sarif"), { force: true });

    // 3. Test Export CycloneDX
    const bomOut = execSync(
      `node --import tsx/esm ${CLI_ENTRY} export cyclonedx -p ${testProjectDir}`,
      { encoding: "utf8" },
    );
    expect(bomOut).toContain("CycloneDX export successfully generated");
    expect(fs.existsSync(path.join(process.cwd(), "bom.json"))).toBe(true);
    fs.rmSync(path.join(process.cwd(), "bom.json"), { force: true });

    // 4. Test Export SPDX
    const spdxOut = execSync(
      `node --import tsx/esm ${CLI_ENTRY} export spdx -p ${testProjectDir}`,
      { encoding: "utf8" },
    );
    expect(spdxOut).toContain("SPDX export successfully generated");
    expect(fs.existsSync(path.join(process.cwd(), "project.spdx.json"))).toBe(true);
    fs.rmSync(path.join(process.cwd(), "project.spdx.json"), { force: true });

    // 5. Test Export LLM Context
    const llmOut = execSync(`node --import tsx/esm ${CLI_ENTRY} export llm -p ${testProjectDir}`, {
      encoding: "utf8",
    });
    expect(llmOut).toContain("AI context exports successfully generated");
    expect(fs.existsSync(path.join(process.cwd(), "llm-context.json"))).toBe(true);
    expect(fs.existsSync(path.join(process.cwd(), "llm-context.md"))).toBe(true);
    fs.rmSync(path.join(process.cwd(), "llm-context.json"), { force: true });
    fs.rmSync(path.join(process.cwd(), "llm-context.md"), { force: true });
  });
});
