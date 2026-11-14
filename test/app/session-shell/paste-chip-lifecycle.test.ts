import { afterEach, describe, expect, it, vi } from "vitest";
import { PromptChipStore } from "../../../src/app/session-shell/prompt-chips.js";
import { startPasteExecutor } from "../../../src/app/session-shell/paste-executor.js";
import type { PreparedPaste } from "../../../src/app/session-shell/paste-protocol.js";

vi.mock("../../../src/app/session-shell/paste-executor.js", () => ({
  startPasteExecutor: vi.fn(),
  createPasteHelperPool: () => ({ warm() {}, replenish() {}, take() { return undefined; }, dispose() {}, warmed: false }),
}));
afterEach(() => { vi.useRealTimers(); vi.clearAllMocks(); });
const paths = Array.from({ length: 96 }, (_, i) => ({ kind: "file" as const, fullPath: `/work/${i}.txt` }));
const tag = (index: number) => `[📄 ${index}.txt]`;
function prepare(...values: PreparedPaste[]) {
  vi.useFakeTimers();
  for (const value of values) vi.mocked(startPasteExecutor).mockImplementationOnce(() => ({ result: Promise.resolve(value), stopped: Promise.resolve(), cancel() {} }));
  return new PromptChipStore({ isolated: true });
}

/** Chunked adoption is provisional until the actual editor/submission acknowledges the reservation. */
describe("provisional paste chip ownership", () => {
  it("retains image capacity while earlier acquired text may still become an image file", async () => {
    vi.useFakeTimers();
    const pending = Promise.withResolvers<PreparedPaste>();
    let firstPhase!: NonNullable<Parameters<typeof startPasteExecutor>[2]>;
    vi.mocked(startPasteExecutor).mockImplementationOnce((_content, _signal, phase) => {
      firstPhase = phase!; phase?.("acquired-text");
      return { result: pending.promise, stopped: Promise.resolve(), cancel() {} };
    }).mockImplementationOnce((_content, _signal, phase) => {
      phase?.("acquired-text"); phase?.("acquired-image");
      return { result: Promise.resolve(null), stopped: Promise.resolve(), cancel() {} };
    });
    const errors: unknown[] = [];
    const store = new PromptChipStore({ isolated: true, imageLimit: () => 1 });
    try {
      const first = store.beginPaste("", { kind: "text", text: "/work/first.png" }, error => errors.push(error));
      await vi.advanceTimersByTimeAsync(0);
      const second = store.beginPaste(first.marker, { kind: "text", text: "/work/second.png" }, error => errors.push(error));
      await vi.advanceTimersByTimeAsync(0);
      await second.result;
      expect(errors).toEqual([expect.objectContaining({ code: "image-count" })]);
      firstPhase("acquired-image");
      pending.resolve({ kind: "image", data: "eA==", mimeType: "image/png", width: 1, height: 1, transformed: false });
      await vi.advanceTimersByTimeAsync(0);
      const ready = await first.result; first.complete?.();
      expect(store.prepareSubmission(ready).images).toHaveLength(1);
    } finally { pending.resolve(null); await store.dispose(); }
  });

  it("rolls back partial path adoption after cancellation without retaining unused chips", async () => {
    const store = prepare({ kind: "paths", paths });
    const job = store.beginPaste("", { kind: "text", text: "generated" }, () => {});
    await vi.advanceTimersByTimeAsync(0);
    expect(store.expandCopiedText(tag(0))).toBe(paths[0]!.fullPath);
    expect(store.expandCopiedText(tag(40))).toBe(tag(40)); // Performance: yielded after the first 32 paths.
    store.reconcileDraft("");
    await vi.advanceTimersByTimeAsync(2);
    await expect(job.result).resolves.toBe("");
    expect(store.expandCopiedText(tag(0))).toBe(tag(0));
    expect(store.expandCopiedText(tag(40))).toBe(tag(40));
    await store.dispose();
  });

  it("does not delete a provisional chip that another successfully committed paste reused", async () => {
    const store = prepare({ kind: "paths", paths }, { kind: "paths", paths: [paths[0]!] });
    const first = store.beginPaste("", { kind: "text", text: "generated first" }, () => {});
    await vi.advanceTimersByTimeAsync(0);
    const second = store.beginPaste(first.marker, { kind: "text", text: "generated second" }, () => {});
    await vi.advanceTimersByTimeAsync(1);
    await expect(second.result).resolves.toBe(tag(0)); second.complete?.();
    store.reconcileDraft(tag(0));
    await vi.advanceTimersByTimeAsync(2);
    await expect(first.result).resolves.toBe("");
    expect(store.expandCopiedText(tag(0))).toBe(paths[0]!.fullPath);
    expect(store.expandCopiedText(tag(1))).toBe(tag(1));
    await store.dispose();
  });
});
