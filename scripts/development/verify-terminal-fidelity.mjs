#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import process from "node:process";

function argument(name) {
  const index = process.argv.indexOf(name);
  return index < 0 ? null : process.argv[index + 1] ?? null;
}

function run(host, flag) {
  const result = spawnSync(host, [flag], { encoding: "utf8", windowsHide: true, timeout: 30_000 });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`${flag} failed (${result.status}): ${result.stderr || result.stdout}`);
  return result.stdout.trim().split(/\r?\n/u).filter(Boolean);
}

const host = argument("--host") ?? process.env.A1_TERMINAL_HOST_PATH;
if (!host) {
  console.error("usage: node scripts/development/verify-terminal-fidelity.mjs --host <a1-terminal-host>");
  process.exitCode = 2;
} else {
  const fidelityLines = run(host, "--probe-input");
  const selectionLines = run(host, "--probe-selection");
  const fidelity = JSON.parse(fidelityLines.at(-1));
  const selection = selectionLines.some(line => line.includes('"probe":"selection-passed"'));
  const required = [
    "keyEncoding", "kittyKeys", "textImeEncoding", "mouseEncoding", "paneRelativeMouse",
    "bracketedPaste", "clipboardOsc52", "hyperlinkOsc8", "cursorShape",
    "wideCombiningUnicode", "alternateScreen", "imageTextFallback", "faintIntensity",
  ];
  const missing = required.filter(key => fidelity[key] !== true);
  const report = {
    schema: "a1-terminal-fidelity-report-v1",
    platform: `${process.platform}-${process.arch}`,
    host,
    selection,
    fidelity,
    passed: selection && missing.length === 0 && fidelity.nodeRelay === false,
    missing,
  };
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  if (!report.passed) process.exitCode = 1;
}
