#!/usr/bin/env node
import { runUi } from "../dist/src/ui/app.js";
import { resolveAddOnePaths } from "../dist/src/supervisor/paths.js";

process.exitCode = await runUi(resolveAddOnePaths().endpoint);
