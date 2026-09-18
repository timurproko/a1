import { describe, expect, it, vi } from "vitest";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { createPasteHelperPool, startPasteExecutor } from "../../../../src/integrations/pi/session-ui/paste-executor.js";
import { canPreparePasteInline, preparePasteText } from "../../../../src/integrations/pi/session-ui/paste-text-preparation.js";
import { PASTE_TEXT_BYTES, pasteFragments } from "../../../../src/integrations/pi/session-ui/paste-protocol.js";
import { screenshotPng } from "../../../fixtures/image-sources.js";

/** Real isolated preparation; native clipboard reads are replaced only inside the fixture process. */
describe("isolated paste executor", () => {
  it.each(["hello", "https://example.com", "\ntext\nmore", "   "])("keeps bounded non-path inline preparation for %j", text => {
    expect(canPreparePasteInline(text)).toBe(true);
  });
  it.each(["/mnt/slow/path", "C:\\slow\\path", "file:///tmp/path", "'path'", '& "path"', "x".repeat(1001)])("isolates possible blocking work (case %#)", text => {
    expect(canPreparePasteInline(text)).toBe(false);
  });
  it("keeps surrogate boundaries and exact UTF-8 fragment accounting", () => {
    const text = "a".repeat(16_383) + "👩‍💻" + "b".repeat(16_384);
    const parts = [...pasteFragments(text)];
    expect(parts.join("")).toBe(text);
    expect(parts.reduce((count, part) => count + Buffer.byteLength(part), 0)).toBe(Buffer.byteLength(text));
  });
  it.each(["native", "empty", "denied"])("handles standalone %s clipboard acquisition without a prior copy", async mode => {
    const job = startPasteExecutor(undefined, new AbortController().signal, () => {}, new URL(`./paste-${mode}-fixture.mjs`, import.meta.url));
    try {
      if (mode === "denied") await expect(job.result).rejects.toMatchObject({ code: "paste-unavailable" });
      else await expect(job.result).resolves.toEqual(mode === "empty" ? null : { kind: "text", text: "external clipboard text" });
    } finally { job.cancel(); await job.stopped; }
  }, 10_000);
  it("cancels a real platform-command descendant even when it ignores graceful termination", async () => {
    const directory = await mkdtemp(join(tmpdir(), "clipboard-command-"));
    const pidFile = join(directory, "pid");
    vi.stubEnv("CLIPBOARD_COMMAND_TEST_PID", pidFile);
    const controller = new AbortController();
    const job = startPasteExecutor(undefined, controller.signal, () => {}, new URL("./paste-command-fixture.mjs", import.meta.url));
    void job.result.catch(() => {});
    try {
      let pid = 0;
      await vi.waitFor(async () => { pid = Number(await readFile(pidFile, "utf8")); expect(pid).toBeGreaterThan(0); }, { timeout: 5_000 });
      controller.abort();
      await expect(job.result).rejects.toMatchObject({ code: "image-canceled" });
      await job.stopped;
      await vi.waitFor(() => expect(() => process.kill(pid, 0)).toThrow(), { timeout: 2_000 });
    } finally { job.cancel(); await job.stopped; vi.unstubAllEnvs(); await rm(directory, { recursive: true, force: true }); }
  }, 10_000);

  it.each(["hello\r\nworld\t!", "x".repeat(1001), "https://example.com/long/path", "[paste #99 +30 lines]"])("matches shared classification without main-thread filesystem calls (case %#)", async text => {
    const job = startPasteExecutor({ kind: "text", text }, new AbortController().signal);
    try { await expect(job.result).resolves.toEqual(preparePasteText(text)); }
    finally { job.cancel(); await job.stopped; }
  }, 10_000);
  it("classifies actual file/folder paths and falls back safely when a probe blocks", async () => {
    const directory = await mkdtemp(join(tmpdir(), "paste-paths-"));
    const file = join(directory, "some file.txt");
    await writeFile(file, "fixture");
    const text = `"${file}" "${directory}"`;
    try {
      const ready = startPasteExecutor({ kind: "text", text }, new AbortController().signal);
      try { await expect(ready.result).resolves.toEqual(preparePasteText(text)); }
      finally { ready.cancel(); await ready.stopped; }
      const phases: string[] = [];
      const slow = startPasteExecutor({ kind: "text", text }, new AbortController().signal, phase => phases.push(phase), new URL("./paste-path-fixture.mjs", import.meta.url));
      try {
        await expect(slow.result).resolves.toEqual(preparePasteText(text, true));
        expect(phases).toContain("path-fallback");
      } finally { slow.cancel(); await slow.stopped; }
    } finally { await rm(directory, { recursive: true, force: true }); }
  }, 10_000);
  it.each([true, false])("takes the warm spare (announced: %s), prepares through it, and replenishes it after the paste", async announced => {
    const pool = createPasteHelperPool();
    try {
      pool.warm();
      expect(pool.warmed).toBe(true);
      if (announced) await new Promise(resolve => setTimeout(resolve, 1_500));
      const started = performance.now();
      const job = startPasteExecutor({ kind: "text", text: "spare hello" }, new AbortController().signal, () => {}, undefined, pool);
      try {
        await expect(job.result).resolves.toEqual(preparePasteText("spare hello"));
        if (announced) expect(performance.now() - started).toBeLessThan(500);
        await job.stopped;
        expect(pool.warmed).toBe(true);
      } finally { job.cancel(); await job.stopped; }
    } finally { pool.dispose(); }
  }, 15_000);
  it("prepares 16 MiB text as a compact chip description while parent timers advance", async () => {
    const text = "x".repeat(PASTE_TEXT_BYTES);
    let ticks = 0;
    const timer = setInterval(() => { ticks++; }, 1);
    const job = startPasteExecutor({ kind: "text", text }, new AbortController().signal);
    try {
      await expect(job.result).resolves.toMatchObject({ kind: "text", label: `${PASTE_TEXT_BYTES} chars`, text });
      expect(ticks).toBeGreaterThan(0);
    } finally { clearInterval(timer); job.cancel(); await job.stopped; }
  }, 15_000);
  it("rejects oversized source fragments without crashing the UI callback", async () => {
    const job = startPasteExecutor({ kind: "text", text: "x".repeat(PASTE_TEXT_BYTES + 1) }, new AbortController().signal);
    try { await expect(job.result).rejects.toMatchObject({ code: "paste-size" }); }
    finally { job.cancel(); await job.stopped; }
  }, 10_000);
  it("keeps existing image preparation and canonicalization in the isolated process", async () => {
    const job = startPasteExecutor({ kind: "image", mimeType: "image/png", data: screenshotPng(16, 16).toString("base64") }, new AbortController().signal);
    try { await expect(job.result).resolves.toMatchObject({ kind: "image", mimeType: "image/png", width: 16, height: 16 }); }
    finally { job.cancel(); await job.stopped; }
  }, 10_000);
  it("cancels a genuinely blocked acquisition and fences process exit", async () => {
    const controller = new AbortController();
    const job = startPasteExecutor(undefined, controller.signal, () => {}, new URL("./response-copy-stalled-helper.mjs", import.meta.url));
    try {
      await new Promise(resolve => setTimeout(resolve, 100));
      controller.abort();
      await expect(job.result).rejects.toMatchObject({ code: "image-canceled" });
    } finally { job.cancel(); await job.stopped; }
  }, 10_000);
});
