import { parseArgs } from "node:util";
import { resolve } from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { createStateStore, digest, fail, registerEntry, transitionEntry } from "./local-cleanup-state.mjs";
import { captureWorktree, discoverRepository, inside, canonical } from "./local-cleanup-git.mjs";
import { cleanupReader } from "./local-cleanup-evidence.mjs";
import { reconcileLocalCleanup } from "./local-cleanup-reconcile.mjs";
import { watchLocalCleanup } from "./local-cleanup-watch.mjs";
import { completeLocalCleanup, handoffLocalCleanup, COMPLETION_DISPOSABLE_PATHS } from "./local-cleanup-complete.mjs";
import { discardLocalCleanup } from "./local-cleanup-discard.mjs";

const help = `Local worktree cleanup (disabled until explicitly enabled)
Usage: node scripts/governance/local-worktree-cleanup.mjs COMMAND --repo PRIMARY [options]
Commands: preview (default), status, handoff, sweep, complete, discard, enable, disable, once, watch, register, claim, release, recover
Handoff: --path PATH --change NAME --pr N
  Registers and releases the exact pushed worktree at maintainer hand-off; deletes nothing and enables nothing.
Sweep: one bounded pass that completes every handed-off candidate whose PR is verified merged, reports open ones as
  pending and rejected ones as awaiting-discard, and prunes merged local topic branches by pull-request evidence.
Complete: --path PATH --change NAME --pr N [--role implementation|archive|acceptance]
  Runs one exact-candidate post-merge cleanup with repository-owned generated paths: ${COMPLETION_DISPOSABLE_PATHS.join(", ")}.
Discard: --path PATH --change NAME --pr N --confirm-closed-unmerged
  Deletes only one verified closed-unmerged PR's unchanged remote ref, worktree, and local ref.
Registration: --path PATH --change NAME --source-pr N --candidate-pr N --role implementation|archive|acceptance
Optional low-level registration: --disposable node_modules (repeat for each explicitly disposable generated path)
Ownership: --id ID --generation GENERATION; LOCAL_CLEANUP_OWNER_TOKEN must contain at least 32 characters.
Recover additionally requires --confirm-stopped; no timeout or dead PID grants ownership.
Release records the current final HEAD after verifying the original directory and owner; leave its directory first.
Preview performs read-only remote queries, without changing repository refs, files, or state.
Watch must run outside removable worktrees. Stop with Ctrl+C or disable from another process.
No force discard, remote mutation, OS service installation, or automatic legacy adoption is provided.`;
const execute = promisify(execFile);
/** One relayable line per candidate and branch; identities only, never file contents or credentials. */
export function sweepLines(report) {
  const lines = [];
  if (report.error) lines.push(`sweep ${report.error === "mutation-busy" ? "deferred: another cleanup holds the mutation lock" : `failed: ${report.error}`}`);
  for (const row of report.results ?? []) {
    if (row.disposition === "unmanaged" || row.disposition === "already-absent" && row.reason === "verified-completed-journal") continue;
    const label = row.sourcePr ? `#${row.sourcePr}` : "candidate", name = row.path?.split("/").pop() ?? row.path;
    lines.push(`${label} ${name}: ${row.disposition}${row.reason ? ` (${row.reason})` : ""}${row.steps?.length ? ` [${row.steps.join(", ")}]` : ""}`);
  }
  for (const row of report.branches?.results ?? []) {
    lines.push(`branch ${row.ref.slice("refs/heads/".length)}: ${row.disposition}${row.reason ? ` (${row.reason})` : ""}${row.sourcePr ? ` #${row.sourcePr}` : ""}`);
  }
  if (report.coverage && !report.coverage.complete && !report.error || report.branches?.deferred) lines.push("sweep deferred: coverage incomplete, rerun to continue");
  if (!lines.length) lines.push("sweep: nothing handed off, nothing to prune");
  return lines;
}
function summary(state) {
  return { version: state.version, enabled: state.enabled, cursor: state.cursor,
    entries: state.entries.map(({ ownerHash, ...entry }) => entry) };
}

/** CLI mutators are explicit; importing the module has no effects. */
export async function main(args = process.argv.slice(2)) {
  const { values, positionals } = parseArgs({ args, allowPositionals: true, strict: true, options: {
    repo: { type: "string" }, path: { type: "string" }, change: { type: "string" }, pr: { type: "string" }, "source-pr": { type: "string" }, "candidate-pr": { type: "string" },
    role: { type: "string" }, disposable: { type: "string", multiple: true }, id: { type: "string" }, generation: { type: "string" },
    "confirm-stopped": { type: "boolean" }, "confirm-closed-unmerged": { type: "boolean" }, help: { type: "boolean" },
  } });
  if (values.help) { console.log(help); return; }
  if (positionals.length > 1) fail("command-count");
  const command = positionals[0] ?? "preview";
  if (!["preview", "status", "handoff", "sweep", "complete", "discard", "enable", "disable", "once", "watch", "register", "claim", "release", "recover"].includes(command)) fail("unknown-command");
  const identity = await discoverRepository(values.repo ?? process.cwd());
  const store = createStateStore(identity);
  if (command === "status") { console.log(JSON.stringify({ ...summary(await store.read()), stopped: await store.disabled() }, null, 2)); return; }
  if (command === "enable" || command === "disable") { await store[command](); console.log(`Local cleanup ${command}d; no worktrees removed.`); return; }
  if (["register", "claim", "release", "recover"].includes(command)) {
    const owner = process.env.LOCAL_CLEANUP_OWNER_TOKEN;
    await store.locked(async (state, save) => {
      let entry;
      if (command === "register") {
        if (!values.path) fail("registration-path-required");
        if (!["implementation", "archive", "acceptance"].includes(values.role)) fail("registration-role");
        const snapshot = await captureWorktree(identity, values.path);
        entry = registerEntry(state, { ...snapshot, change: values.change, sourcePr: Number(values["source-pr"]), candidatePr: Number(values["candidate-pr"]),
          role: values.role, disposable: values.disposable ?? [] }, owner);
      } else {
        entry = state.entries.find(item => item.id === values.id); if (!entry) fail("unknown-registration");
        if (entry.generation !== values.generation) fail("generation-changed");
        if (command === "recover" && !values["confirm-stopped"]) fail("recovery-confirmation-required");
        const snapshot = await captureWorktree(identity, entry.path);
        if (snapshot.filesystem !== entry.filesystem) fail("directory-replaced");
        if (command === "release") {
          if (entry.state !== "owned" || !owner || digest(owner) !== entry.ownerHash) fail("owner-mismatch");
          const cwd = await canonical(process.cwd());
          if (cwd === entry.path || inside(entry.path, cwd)) fail("leave-worktree-before-release");
          Object.assign(entry, snapshot);
        } else if (command === "claim" && (snapshot.head !== entry.head || snapshot.ref !== entry.ref)) fail("worktree-identity-changed");
        transitionEntry(entry, command, owner, values.generation);
      }
      await save(state); console.log(JSON.stringify({ id: entry.id, generation: entry.generation, state: entry.state, path: entry.path }));
    });
    return;
  }
  if (["complete", "discard", "sweep", "once", "watch"].includes(command) && inside(identity.root, await canonical(fileURLToPath(import.meta.url)))) fail("worker-code-inside-removable-root");
  let nextAllowed = 0;
  async function authorizedReader(deadline) {
    let token = process.env.GH_TOKEN ?? process.env.GITHUB_TOKEN;
    if (!token) {
      try { token = (await execute("gh", ["auth", "token", "--hostname", "github.com"], { timeout: 10000, encoding: "utf8", windowsHide: true })).stdout.trim(); }
      catch { /* Security: private-repository evidence fails closed without authentication. */ }
    }
    return cleanupReader({ repository: identity.repository, token, deadline, onBackoff: time => { nextAllowed = Math.max(nextAllowed, time); } });
  }
  if (command === "discard") {
    const sourcePr = Number(values.pr);
    if (!values.path || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(values.change ?? "")
      || !Number.isSafeInteger(sourcePr) || sourcePr < 1 || values["confirm-closed-unmerged"] !== true
      || values["source-pr"] !== undefined || values["candidate-pr"] !== undefined || values.role !== undefined
      || values.disposable !== undefined) fail("discard-arguments");
    const deadline = Date.now() + 60000;
    const report = await discardLocalCleanup({ identity, store, reader: await authorizedReader(deadline), path: values.path,
      change: values.change, sourcePr, confirmed: true, cwd: process.cwd(), deadline });
    console.log(JSON.stringify(report, null, 2));
    return;
  }
  if (command === "handoff") {
    const sourcePr = Number(values.pr);
    if (!values.path || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(values.change ?? "") || !Number.isSafeInteger(sourcePr) || sourcePr < 1
      || values["source-pr"] !== undefined || values["candidate-pr"] !== undefined || values.role !== undefined || values.disposable !== undefined) fail("handoff-arguments");
    const report = await handoffLocalCleanup({ identity, store, path: values.path, change: values.change, sourcePr });
    console.log(JSON.stringify(report, null, 2));
    return;
  }
  if (command === "sweep") {
    // Performance: each merged candidate costs three evidence loads, so a sweep gets three queue passes' worth of time.
    const started = Date.now(), deadline = started + 180000;
    const report = await reconcileLocalCleanup({ identity, store, reader: await authorizedReader(deadline), preview: false, deadline,
      requireEnabled: false, stopSince: started, pruneBranches: true, cwd: process.cwd() });
    report.lines = sweepLines(report);
    console.log(JSON.stringify(report, null, 2));
    if (report.error) process.exitCode = 1;
    return;
  }
  if (command === "complete") {
    const sourcePr = Number(values["source-pr"] ?? values.pr), candidatePr = Number(values["candidate-pr"] ?? values.pr ?? values["source-pr"]);
    const role = values.role ?? "implementation";
    if (!values.path || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(values.change ?? "")
      || !Number.isSafeInteger(sourcePr) || sourcePr < 1 || !Number.isSafeInteger(candidatePr) || candidatePr < 1
      || !["implementation", "archive", "acceptance"].includes(role)
      || values.pr && values["source-pr"] && values.pr !== values["source-pr"]
      || values.pr && values["candidate-pr"] && values.pr !== values["candidate-pr"]
      || role === "implementation" && sourcePr !== candidatePr) fail("completion-arguments");
    const deadline = Date.now() + 60000;
    const report = await completeLocalCleanup({ identity, store, reader: await authorizedReader(deadline), path: values.path,
      change: values.change, sourcePr, candidatePr, role, cwd: process.cwd(), reconcileOptions: { deadline } });
    console.log(JSON.stringify(report, null, 2));
    return;
  }
  let cancelled = false;
  const abort = new AbortController();
  const stop = () => { cancelled = true; abort.abort(); };
  process.on("SIGINT", stop); process.on("SIGTERM", stop);
  try {
    async function run() {
      const deadline = Date.now() + 60000;
      const reader = await authorizedReader(deadline);
      return reconcileLocalCleanup({ identity, store, reader, preview: command === "preview", deadline, cancelled: () => cancelled });
    }
    const emit = report => console.log(JSON.stringify(report, null, 2));
    if (command === "watch") await watchLocalCleanup({ run, emit, signal: abort.signal, retryAt: () => nextAllowed });
    else { const report = await run(); emit(report); if (report.error) process.exitCode = 1; }
  } finally { process.removeListener("SIGINT", stop); process.removeListener("SIGTERM", stop); }
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch(error => { console.error(JSON.stringify({ disposition: "blocked", reason: error.cleanupCode ?? "local-cleanup-failed" })); process.exitCode = 1; });
}
