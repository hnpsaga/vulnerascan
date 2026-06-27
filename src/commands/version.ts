import { Command } from "commander";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function getPackageVersion(): string {
  try {
    // Try to find package.json up the tree
    let currentDir = __dirname;
    while (currentDir !== path.parse(currentDir).root) {
      const packageJsonPath = path.join(currentDir, "package.json");
      if (fs.existsSync(packageJsonPath)) {
        const content = fs.readFileSync(packageJsonPath, "utf8");
        const pkg = JSON.parse(content) as { version?: string };
        if (pkg.version) {
          return pkg.version;
        }
      }
      currentDir = path.dirname(currentDir);
    }
  } catch {
    // ignore and fallback
  }
  return "0.0.3"; // Fallback version if package.json cannot be read
}

export const versionCommand = new Command("version")
  .description("Print the current VulneraScan version")
  .action(() => {
    console.log(`VulneraScan v${getPackageVersion()}`);
  });
