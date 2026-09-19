/**
 * Rewrites an open proposal's description from a fresh upgrade report: only the report between
 * the `<!-- pi-upgrade-report -->` markers changes, so the proposal and implementation text a
 * reviewer edited survives; a description without markers is replaced whole. Also writes the
 * comment the sync posts when it may not push. Used by `pi-upstream-sync.yml`; the pure rendering
 * lives in `pi-upgrade-report.mjs`.
 */
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { refreshUpgradeBody, renderUpgradeComment } from "./pi-upgrade-report.mjs";

const existingPath = argumentValue("--existing");
const reportPath = argumentValue("--report");
const outputPath = argumentValue("--output");
const commentPath = argumentValue("--comment");
if (!existingPath || !reportPath || !outputPath) throw new Error("usage: refresh-pi-upgrade-body.mjs --existing <body.md> --report <report.json> --output <body.md> [--comment <comment.md>]");

const report = JSON.parse(await readFile(resolve(reportPath), "utf8"));
const existing = await readFile(resolve(existingPath), "utf8");
await writeFile(resolve(outputPath), refreshUpgradeBody(existing, report));
if (commentPath) await writeFile(resolve(commentPath), renderUpgradeComment(report, { date: new Date().toISOString().slice(0, 10) }));
console.log(`Refreshed the proposal body for Pi ${report.version}${commentPath ? " and wrote the sync comment" : ""}`);

function argumentValue(flag) {
  const index = process.argv.indexOf(flag);
  return index === -1 ? undefined : process.argv[index + 1];
}
