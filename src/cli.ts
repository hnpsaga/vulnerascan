#!/usr/bin/env node

import { Command } from "commander";
import { scanCommand } from "./commands/scan.js";
import { doctorCommand } from "./commands/doctor.js";
import { versionCommand } from "./commands/version.js";
import { dashboardCommand } from "./commands/dashboard.js";
import { exportCommand } from "./commands/export.js";

const program = new Command();

program
  .name("vulnerascan")
  .description("Developer-first vulnerability scanner for modern software projects.")
  .addCommand(scanCommand)
  .addCommand(doctorCommand)
  .addCommand(versionCommand)
  .addCommand(dashboardCommand)
  .addCommand(exportCommand);

program.parse(process.argv);
