#!/usr/bin/env node

import { Command } from "commander";
import { scanCommand } from "./commands/scan.js";
import { doctorCommand } from "./commands/doctor.js";
import { versionCommand } from "./commands/version.js";

const program = new Command();

program
  .name("vulnerascan")
  .description("Developer-first vulnerability scanner for modern software projects.")
  .addCommand(scanCommand)
  .addCommand(doctorCommand)
  .addCommand(versionCommand);

program.parse(process.argv);
