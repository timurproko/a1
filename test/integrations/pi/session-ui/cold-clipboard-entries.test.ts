import { Worker, type WorkerOptions } from "node:worker_threads";
import { describe, expect, it } from "vitest";
import { coldClipboardWorker } from "../../../support/cold-clipboard-entries.js";
import { screenshotPng } from "../../../fixtures/image-sources.js";

const image = new URL("../../../../src/integrations/pi/session-ui/image-worker.ts", import.meta.url);
const client = new URL("../../../../src/integrations/pi/session-ui/image-preparation-client.ts", import.meta.url);
const bootstrap = `import('tsx/esm/api').then(({ tsImport }) => tsImport(${JSON.stringify(image.href)}, ${JSON.stringify(client.href)}))`;

async function run(entry: string | URL, options: WorkerOptions) {
  const worker = new Worker(entry, options);
  worker.stdout?.resume(); worker.stderr?.resume();
  let value: unknown;
  try {
    return await new Promise<unknown>((resolve, reject) => {
      worker.once("message", message => { value = message; });
      worker.once("error", reject);
      worker.once("exit", code => code === 0 ? resolve(value) : reject(new Error("cold worker failed")));
    });
  } finally { await worker.terminate(); }
}

describe("cold emitted clipboard worker fixture", () => {
  it("changes only the exact source bootstrap entry and eval flag", () => {
    const data = { kind: "canonicalize" };
    const options = { eval: true, workerData: data, stdout: true, stderr: true };
    const selected = coldClipboardWorker(bootstrap, options);
    expect(selected.selected).toBe(true);
    expect(selected.entry).toEqual(new URL("../../../../dist/integrations/pi/session-ui/image-worker.js", import.meta.url));
    expect(selected.options).toEqual({ ...options, eval: false });
    expect(selected.options!.workerData).toBe(data);
    expect(options.eval).toBe(true);
  });

  it("leaves unrelated worker code and options untouched", () => {
    const options = { eval: true, workerData: "private fixture data" };
    expect(coldClipboardWorker("unrelated worker", options)).toEqual({ entry: "unrelated worker", options, selected: false });
    expect(coldClipboardWorker("unrelated worker", options).options).toBe(options);
    expect(coldClipboardWorker(bootstrap, { eval: false }).selected).toBe(false);
  });

  it.each([false, true])("preserves real source/emitted canonicalization outcomes (malformed=%s)", async malformed => {
    const data = screenshotPng(16, 16).toString("base64");
    const options = { eval: true, stdout: true, stderr: true,
      workerData: { kind: "canonicalize", source: { data: malformed ? "data:image/png;base64,invalid!" : data.replace(/=+$/u, ""), mimeType: "image/png" } } };
    const selected = coldClipboardWorker(bootstrap, options);
    const expected = { ok: true, value: malformed ? null : { data, mimeType: "image/png" } };
    expect(await run(bootstrap, options)).toEqual(expected);
    expect(await run(selected.entry, selected.options!)).toEqual(expected);
  }, 10_000);
});
