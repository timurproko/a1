import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { pathToFileURL } from "node:url";
import { describe, expect, it } from "vitest";
import { discoverReleasePayload } from "../../../src/foundation/release/index.js";
import { createResponseCopyExecutor } from "../../../src/app/session-shell/response-copy-transport.js";
import { startPasteExecutor } from "../../../src/app/session-shell/paste-executor.js";
import { preparePasteText } from "../../../src/app/session-shell/paste-text-preparation.js";
import { screenshotPng } from "../../fixtures/image-sources.js";

/** Run after build (also performed by npm ci's prepare). Helpers deliberately run emitted JS without tsx. */
describe("cold packaged clipboard executors", () => {
  it("includes all executor/worker entries in the release and the native adapter in its dependency inventory", async () => {
    const payload = await discoverReleasePayload(process.cwd());
    const inventory = JSON.parse(await readFile("dist/runtime-payload-inventory.json", "utf8")) as { paths: string[] };
    for (const name of ["response-copy-helper", "paste-helper", "paste-text-worker", "image-worker", "path-chip-presentation"]) {
      expect(payload.paths).toContain(`dist/app/session-shell/${name}.js`);
    }
    expect(inventory.paths).toContain("node_modules/@mariozechner/clipboard/package.json");
  });

  it("delivers exact text through the emitted native copy helper without any UI terminal write", async () => {
    const text = "packaged native text";
    const phases: string[] = [];
    const job = createResponseCopyExecutor({ destination: "native", helper: new URL("./clipboard-built-copy-fixture.mjs", import.meta.url) })({
      literal: true, revision: 0, sourceUnits: text.length, rows: [{ text }],
      selection: { start: { line: 0, column: 0 }, end: { line: 0, column: Number.MAX_SAFE_INTEGER } },
    }, phase => phases.push(phase));
    try {
      await expect(job.result).resolves.toEqual({ outcome: "delivered" });
      await job.stopped;
      expect(phases).toEqual(["extracted", "submitting"]);
    } finally { job.cancel(); await job.stopped; }
  }, 5_000);

  it.each(["native", "native-empty", "fallback"])("reads independent text through a fresh emitted paste helper (%s)", async mode => {
    const root = await mkdtemp(join(tmpdir(), "packaged-clipboard-read-"));
    const script = join(root, "fixture.mjs");
    const fixture = new URL("./clipboard-built-fixture-base.mjs", import.meta.url).href;
    try {
      await writeFile(script, `import {runBuiltClipboardFixture} from ${JSON.stringify(fixture)}; await runBuiltClipboardFixture('paste-helper',${JSON.stringify(mode)});`);
      const job = startPasteExecutor(undefined, new AbortController().signal, () => {}, pathToFileURL(script));
      try {
        await expect(job.result).resolves.toEqual({ kind: "text", text: "packaged native text" });
        await job.stopped;
      } finally { job.cancel(); await job.stopped; }
    } finally { await rm(root, { recursive: true, force: true }); }
  }, 5_000);

  it.each([false, true])("compacts only complete path lists in the cold worker (invalid suffix=%s)", async invalid => {
    const directory = await mkdtemp(join(tmpdir(), "packaged-paste-paths-"));
    const file = join(directory, "generated.txt");
    await writeFile(file, "generated");
    const text = Array.from({ length: 256 }, () => `"${file}"`).join("\n") + (invalid ? "\nnot a path" : "");
    const job = startPasteExecutor({ kind: "text", text }, new AbortController().signal, () => {}, new URL("../../../dist/app/session-shell/paste-helper.js", import.meta.url));
    try {
      expect(preparePasteText(text).kind).toBe(invalid ? "text" : "paths");
      const expanded = invalid ? text : file.repeat(256);
      await expect(job.result).resolves.toEqual({ kind: "text", text: expanded, label: invalid ? "+257 lines" : `${expanded.length} chars` });
      await job.stopped;
    } finally { job.cancel(); await job.stopped; await rm(directory, { recursive: true, force: true }); }
  }, 10_000);

  it("prepares an image through the emitted helper and existing emitted codec worker", async () => {
    const source = screenshotPng(128, 64);
    const job = startPasteExecutor({ kind: "image", data: source.toString("base64"), mimeType: "image/png" }, new AbortController().signal, () => {}, new URL("../../../dist/app/session-shell/paste-helper.js", import.meta.url));
    try {
      await expect(job.result).resolves.toMatchObject({ kind: "image", mimeType: "image/png", width: 128, height: 64 });
      await job.stopped;
    } finally { job.cancel(); await job.stopped; }
  }, 15_000);
});
