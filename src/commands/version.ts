import { Command } from "commander";

export const versionCommand = new Command("version")
  .description("Print the current VulneraScan version")
  .action(() => {
    console.log("VulneraScan v0.0.3");
  });
