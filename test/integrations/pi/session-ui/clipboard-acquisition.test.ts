import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { describe, expect, it } from "vitest";
import { startPasteExecutor } from "../../../../src/integrations/pi/session-ui/paste-executor.js";
import { runPredecessorCommand } from "../../../support/predecessor-command.js";

function operations(mode: string): string[] {
  if (process.platform === "win32" || process.platform === "darwin") {
    return ["native-text", ...(["denied", "fallback"].includes(mode) ? [process.platform === "win32" ? "powershell.exe" : "pbpaste"] : [])];
  }
  return ["wl-paste", ...(["denied", "fallback"].includes(mode) ? ["xclip"] : [])];
}

describe.each(["source", "emitted"])("hermetic %s clipboard acquisition", entry => {
  it.each(["native", "empty", "denied", "fallback"])("keeps the real helper/classifier and observes the actual backend (%s)", async mode => {
    const root = await mkdtemp(join(tmpdir(), "clipboard-boundary-"));
    const trace = join(root, "operations");
    const script = join(root, "fixture.mjs");
    const source = new URL("./paste-fixture-base.mjs", import.meta.url).href;
    const emitted = new URL("./clipboard-built-fixture-base.mjs", import.meta.url).href;
    try {
      await writeFile(script, entry === "source"
        ? `import {runPasteFixture} from ${JSON.stringify(source)}; await runPasteFixture(${JSON.stringify(mode)},${JSON.stringify(trace)});`
        : `import {runBuiltClipboardFixture} from ${JSON.stringify(emitted)}; await runBuiltClipboardFixture('paste-helper',${JSON.stringify(mode)},${JSON.stringify(trace)});`);
      const job = startPasteExecutor(undefined, new AbortController().signal, () => {}, pathToFileURL(script));
      try {
        if (mode === "denied") await expect(job.result).rejects.toMatchObject({ code: "paste-unavailable" });
        else await expect(job.result).resolves.toEqual(mode === "empty" ? null : { kind: "text", text: entry === "source" ? "external clipboard text" : "packaged native text" });
      } finally { job.cancel(); await job.stopped; }
      expect((await readFile(trace, "utf8")).trim().split("\n")).toEqual(operations(mode));
    } finally { await rm(root, { recursive: true, force: true }); }
  }, 10_000);
});

it.for(["command", "arguments"])("rejects an unexpected clipboard %s and preserves unrelated process imports", async (fault, { signal }) => {
  const root = await mkdtemp(join(tmpdir(), "clipboard-boundary-control-"));
  try {
    const backend = new URL("./clipboard-acquisition-backend-fixture.mjs", import.meta.url);
    backend.searchParams.set("fixture", JSON.stringify({ mode: "native", text: "controlled" }));
    const installer = new URL("./clipboard-acquisition-fixture.mjs", import.meta.url).href;
    const script = join(root, "control.mjs");
    const command = fault === "command" ? "unrecognized-clipboard-operation" : process.platform === "win32" ? "powershell.exe" : process.platform === "darwin" ? "pbpaste" : "wl-paste";
    await writeFile(script, `
      import {installClipboardAcquisitionFixture} from ${JSON.stringify(installer)};
      installClipboardAcquisitionFixture('native','controlled');
      const backend=await import(${JSON.stringify(backend.href)});
      const rejected=await new Promise(resolve=>backend.execFile(${JSON.stringify(command)},['unexpected-argument'],{},error=>resolve(Boolean(error))));
      let nativeRejected=false; try {await backend.getText();} catch {nativeRejected=true;}
      const cp=await import('node:child_process');
      const unrelated=await new Promise((resolve,reject)=>cp.execFile(process.execPath,['-e',"process.stdout.write('unrelated-command')"],{encoding:'utf8'},(error,stdout)=>error?reject(error):resolve(stdout)));
      process.stdout.write(JSON.stringify({rejected,nativeRejected,unrelated}));
    `);
    const result = await runPredecessorCommand({ executable: process.execPath, arguments: [script], cwd: root, phase: "clipboard-boundary-control", signal });
    expect(JSON.parse(result.stdout)).toEqual({ rejected: true, nativeRejected: true, unrelated: "unrelated-command" });
  } finally { await rm(root, { recursive: true, force: true }); }
});
