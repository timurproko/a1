import { afterEach, describe, expect, it, vi } from "vitest";
import path from "node:path";
import { PATH_CHIP_PRESENTATION_UNITS, PATH_CHIP_SUFFIX_UNITS, pathChipTag, preparePathPresentation } from "../../../../src/integrations/pi/session-ui/path-chip-presentation.js";
import type { ClipboardPath } from "../../../../src/integrations/pi/session-ui/paste-text-preparation.js";
import { PromptChipStore } from "../../../../src/integrations/pi/session-ui/prompt-chips.js";
import { startPasteExecutor } from "../../../../src/integrations/pi/session-ui/paste-executor.js";
import type { PreparedPaste } from "../../../../src/integrations/pi/session-ui/paste-protocol.js";

vi.mock("../../../../src/integrations/pi/session-ui/paste-executor.js", () => ({
  startPasteExecutor: vi.fn(),
  createPasteHelperPool: () => ({ warm() {}, replenish() {}, take() { return undefined; }, dispose() {}, warmed: false }),
}));
afterEach(() => { vi.clearAllMocks(); });
const file = (name: string): ClipboardPath => ({ kind: "file", fullPath: `/generated/${name}` });
const nextImmediate = () => new Promise<void>(resolve => setImmediate(resolve));

describe("bounded path-chip presentation", () => {
  it("retains the exact boundary and compacts one UTF-16 unit above it", () => {
    const fitting = file("x".repeat(PATH_CHIP_PRESENTATION_UNITS - PATH_CHIP_SUFFIX_UNITS - 5));
    expect(pathChipTag(fitting).length + PATH_CHIP_SUFFIX_UNITS).toBe(PATH_CHIP_PRESENTATION_UNITS);
    expect(preparePathPresentation([fitting])).toEqual({ kind: "paths", paths: [fitting] });
    const excess = file(`${"x".repeat(PATH_CHIP_PRESENTATION_UNITS - PATH_CHIP_SUFFIX_UNITS - 5)}y`);
    expect(preparePathPresentation([excess])).toEqual({ kind: "text", text: excess.fullPath, label: `${excess.fullPath.length} chars` });
  });

  it.each([
    [file("notes.txt"), "[📄 notes.txt]"],
    [{ kind: "folder", fullPath: "/generated/folder" }, "[📁 folder]"],
    [file("photo.PNG"), "[🖼  photo.PNG]"],
    [{ kind: "folder", fullPath: "/" }, "[📁 /]"],
    [file("界👩‍💻.txt"), "[📄 界👩‍💻.txt]"],
  ] as const)("shares the existing base tag (case %#)", (item, tag) => {
    expect(pathChipTag(item)).toBe(tag);
  });

  it("counts every duplicate and Unicode code unit, resetting for each paste", () => {
    const item = file("界👩‍💻.txt");
    const count = Math.floor(PATH_CHIP_PRESENTATION_UNITS / (pathChipTag(item).length + PATH_CHIP_SUFFIX_UNITS));
    const fitting = Array.from({ length: count }, () => item);
    expect(preparePathPresentation(fitting).kind).toBe("paths");
    expect(preparePathPresentation([...fitting, item])).toEqual({ kind: "text", text: item.fullPath.repeat(count + 1), label: `${item.fullPath.length * (count + 1)} chars` });
    expect(preparePathPresentation(fitting).kind).toBe("paths");
  });

  it("stops individual tag construction at the budget rather than formatting the entire list", () => {
    const item = file("name.txt"), paths = Array.from({ length: 6000 }, () => item);
    const unitCost = pathChipTag(item).length + PATH_CHIP_SUFFIX_UNITS;
    const basename = vi.spyOn(path, "basename");
    try {
      expect(preparePathPresentation(paths).kind).toBe("text");
      expect(basename).toHaveBeenCalledTimes(Math.floor(PATH_CHIP_PRESENTATION_UNITS / unitCost) + 1);
    } finally { basename.mockRestore(); }
  });

  it("adopts one ordinary text chip with exact copy/history/submission and no provisional member chips", async () => {
    const paths = Array.from({ length: 6000 }, (_, i) => file(`界\tname-${i % 2}.txt`));
    const prepared = preparePathPresentation(paths), expanded = paths.map(value => value.fullPath).join("");
    vi.mocked(startPasteExecutor).mockReturnValueOnce({ result: Promise.resolve(prepared), stopped: Promise.resolve(), cancel() {} });
    const store = new PromptChipStore({ isolated: true });
    try {
      const job = store.beginPaste("", { kind: "text", text: "generated fixture" }, () => {});
      const tag = await job.result; job.complete?.();
      expect(tag).toMatch(/^\[paste #1 \d+ chars\]$/u);
      expect(store.atomicRanges(tag)).toEqual([{ start: 0, end: tag.length }]);
      expect(store.expandCopiedText(tag) === expanded).toBe(true);
      expect(store.prepareHistoryText(tag) === expanded).toBe(true);
      expect(store.prepareSubmission(tag).text === expanded).toBe(true);
      expect(store.expandCopiedText(pathChipTag(paths[0]!))).toBe(pathChipTag(paths[0]!));
      store.reconcileDraft("");
      expect(store.prepareSubmission(tag).text === expanded).toBe(true);
    } finally { await store.dispose(); }
  });

  it("does not adopt a late compact result after its reservation is canceled", async () => {
    let finish!: (value: PreparedPaste) => void;
    vi.mocked(startPasteExecutor).mockReturnValueOnce({ result: new Promise(resolve => { finish = resolve; }), stopped: Promise.resolve(), cancel() {} });
    const store = new PromptChipStore({ isolated: true });
    try {
      const job = store.beginPaste("", { kind: "text", text: "generated fixture" }, () => {});
      await nextImmediate(); store.reconcileDraft("");
      const compact = preparePathPresentation(Array.from({ length: 6000 }, () => file("name.txt")));
      finish(compact);
      await expect(job.result).resolves.toBe("");
      await nextImmediate();
      expect(store.expandCopiedText(`[paste #1 ${compact.kind === "text" ? compact.text.length : 0} chars]`)).toMatch(/^\[paste #1 /u);
    } finally { await store.dispose(); }
  });
});
