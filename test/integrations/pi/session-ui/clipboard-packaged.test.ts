import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { discoverReleasePayload } from "../../../../src/foundation/release/index.js";
import { createResponseCopyExecutor } from "../../../../src/integrations/pi/session-ui/response-copy-transport.js";
import { startPasteExecutor } from "../../../../src/integrations/pi/session-ui/paste-executor.js";
import { screenshotPng } from "../../../fixtures/image-sources.js";

/** Run after build (also performed by npm ci's prepare). Helpers deliberately run emitted JS without tsx. */
describe("cold packaged clipboard executors", () => {
  it("includes all executor/worker entries in the release and the native adapter in its dependency inventory", async () => {
    const payload = await discoverReleasePayload(process.cwd());
    const inventory = JSON.parse(await readFile("dist/runtime-payload-inventory.json", "utf8")) as { paths: string[] };
    for (const name of ["response-copy-helper", "paste-helper", "paste-text-worker", "image-worker"]) {
      expect(payload.paths).toContain(`dist/integrations/pi/session-ui/${name}.js`);
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
    } finally { job.cancel(); }
  }, 5_000);

  it("reads independent native text through the emitted paste helper and classification worker", async () => {
    const job = startPasteExecutor(undefined, new AbortController().signal, () => {}, new URL("./clipboard-built-paste-fixture.mjs", import.meta.url));
    try {
      await expect(job.result).resolves.toEqual({ kind: "text", text: "packaged native text" });
      await job.stopped;
    } finally { job.cancel(); }
  }, 5_000);

  it("prepares an image through the emitted helper and existing emitted codec worker", async () => {
    const source = screenshotPng(128, 64);
    const job = startPasteExecutor({ kind: "image", data: source.toString("base64"), mimeType: "image/png" }, new AbortController().signal, () => {}, new URL("../../../../dist/integrations/pi/session-ui/paste-helper.js", import.meta.url));
    try {
      await expect(job.result).resolves.toMatchObject({ kind: "image", mimeType: "image/png", width: 128, height: 64 });
      await job.stopped;
    } finally { job.cancel(); }
  }, 15_000);
});
