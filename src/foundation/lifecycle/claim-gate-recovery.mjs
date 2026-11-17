import { createHash } from "node:crypto";
import { lstat, readFile, realpath, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { parseArgs } from "node:util";
import { inspectClaimGate, recoverClaimGate } from "./claim-gate-core.mjs";
import { cleanupClaimDirectory } from "./worktree-claim-boundary.mjs";

// Security: explicit scope and compare-bound approval; recovery never runs cleanup or deletes storage/claims.
const { positionals, values } = parseArgs({ allowPositionals: true, options: {
  scope: { type: "string" }, "data-dir": { type: "string" }, "common-dir": { type: "string" },
  worktree: { type: "string" }, output: { type: "string" }, approval: { type: "string" },
} });
try {
  let result;
  if (positionals.length !== 1) throw new Error("use inspect --scope global --data-dir DIR, inspect --scope target --common-dir DIR --worktree PATH, or recover --approval FILE");
  if (positionals[0] === "inspect") {
    let path;
    if (values.scope === "global" && values["data-dir"] && !values["common-dir"] && !values.worktree) {
      path = join(await realpath(cleanupClaimDirectory({ dataDir: values["data-dir"] })), "mutation.authority.gate");
    } else if (values.scope === "target" && values["common-dir"] && values.worktree && !values["data-dir"]) {
      const common = await realpath(values["common-dir"]), target = resolve(values.worktree);
      path = join(common, "worktree-claim-gates", `${createHash("sha256").update(process.platform === "win32" ? target.toLowerCase() : target).digest("hex")}.gate`);
    } else throw new Error("supply one explicit global or target scope; never switch namespaces to bypass a blocker");
    result = inspectClaimGate(path);
    if (values.output) await writeFile(values.output, JSON.stringify(result, null, 2), { flag: "wx", mode: 0o600 });
  } else if (positionals[0] === "recover" && values.approval && !values.scope && !values["data-dir"] && !values["common-dir"] && !values.worktree) {
    const stat = await lstat(values.approval);
    if (!stat.isFile() || stat.isSymbolicLink() || stat.nlink !== 1 || stat.size > 16384) throw new Error("approval is not a bounded regular file");
    result = recoverClaimGate(JSON.parse(await readFile(values.approval, "utf8")));
  } else throw new Error("unknown operation or conflicting selectors; no force-delete mode exists");
  console.log(JSON.stringify(result, null, 2));
  if (!["recovered", "recoverable", "idle", "absent"].includes(result?.state)) process.exitCode = 2;
} catch (error) { console.error(JSON.stringify({ state: "refused", detail: String(error.message) })); process.exitCode = 2; }
