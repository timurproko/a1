import { execFile } from "node:child_process";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { promisify } from "node:util";
import { describe, expect, it } from "vitest";

const execFileAsync = promisify(execFile);

describe("self-update process settlement", () => {
  it("returns to the invoking process after verified activation without an interrupt", async () => {
    const updateModule = pathToFileURL(resolve("src/foundation/release/index.ts")).href;
    const script = `
      const { runSelfUpdate, UPDATE_JOURNAL_SCHEMA } = await import(${JSON.stringify(updateModule)});
      const packageRoot = ${JSON.stringify(resolve("fixture-global", "package"))};
      const globalRoot = ${JSON.stringify(resolve("fixture-global"))};
      let transaction = null;
      const journal = {
        path: "memory-journal",
        read: async () => transaction,
        begin: async input => transaction ??= { schema: UPDATE_JOURNAL_SCHEMA, transactionId: "exit-test", ...input, phase: "shutdown-intent", status: "active", error: null, startedAt: new Date(0).toISOString(), updatedAt: new Date(0).toISOString() },
        advance: async phase => transaction = { ...transaction, phase },
        finish: async (status, error = null) => transaction = { ...transaction, status, error },
        clearCompleted: async () => { transaction = null; },
      };
      const code = await runSelfUpdate({
        packageRoot,
        fileSystem: {
          readFile: async () => JSON.stringify({ version: "1.0.0" }),
          realpath: async path => path,
        },
        runner: async (_command, args) => args[0] === "view"
          ? { code: 0, stdout: "1.0.1\\n" }
          : args[0] === "root"
            ? { code: 0, stdout: globalRoot + "\\n" }
            : { code: 0, stdout: "installed" },
        lifecycle: {
          targetIsActive: async () => false,
          shutdownVerifiedOwners: async () => ({ priorActiveVersion: "1.0.0" }),
          verifyPackageUnlocked: async () => {},
          activateInstalled: async (_root, _target, phase) => {
            await phase("materialized");
            await phase("certified");
            await phase("active-reference-committed");
          },
        },
        transactionStore: journal,
        output: { stdout: () => {}, stderr: message => { throw new Error(message); } },
      });
      process.stdout.write("settled:" + code + "\\n");
    `;

    const result = await execFileAsync(process.execPath, ["--import", "tsx", "--input-type=module", "-e", script], {
      cwd: resolve("."),
      timeout: 10_000,
      windowsHide: true,
    });

    expect(result.stdout).toBe("settled:0\n");
    expect(result.stderr).toBe("");
  }, 15_000);
});
