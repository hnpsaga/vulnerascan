import { Command } from "commander";

export const scanCommand = new Command("scan")
  .description("Scan a project for vulnerabilities")
  .action(() => {
    console.log("Scanning functionality coming in v0.0.2");
  });
