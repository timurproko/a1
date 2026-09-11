import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { rm } from "node:fs/promises";
import { screenshotPng } from "../../../fixtures/image-sources.js";
import { PromptChipStore } from "../../../../src/integrations/pi/session-ui/prompt-chips.js";

const cleanup: string[] = [];
afterEach(async () => {
  await Promise.all(cleanup.splice(0).map(directory => rm(directory, { recursive: true, force: true })));
});

describe("PromptChipStore", () => {
  it("shows an atomic screenshot chip immediately while keeping readiness internal", async () => {
    const store = new PromptChipStore();
    const data = screenshotPng(4, 4).toString("base64");
    let release!: (content: { kind: "image"; data: string; mimeType: string }) => void;
    const errors: unknown[] = [];
    const content = new Promise<{ kind: "image"; data: string; mimeType: string }>(resolve => { release = resolve; });
    const paste = store.beginPaste("", () => content, error => errors.push(error));
    try {
      expect(paste.marker).toMatch(/^\[📷 screenshot-[a-f0-9]+\]$/u);
      expect(paste.marker).not.toContain("preparing");
      expect(store.atomicRanges(paste.marker)).toEqual([{ start: 0, end: paste.marker.length }]);
      expect(store.hasPending(paste.marker)).toBe(true);
      expect(() => store.prepareSubmission(paste.marker)).toThrow("still preparing");
      release({ kind: "image", data, mimeType: "image/png" });
      const ready = await paste.result;
      expect(ready).toBe(`${paste.marker.slice(0, -1)}.png]`);
      expect(store.hasPending(paste.marker)).toBe(false);
      expect(store.prepareSubmission(`${paste.marker} ${ready}`)).toEqual({
        text: `${ready} ${ready}`,
        images: [{ type: "image", data, mimeType: "image/png" }],
      });
      expect(errors).toEqual([]);
    } finally { await store.dispose(); }
  });

  it("keeps failed screenshot chips visible, unsendable, and counted toward the image limit", async () => {
    const store = new PromptChipStore();
    const data = screenshotPng(4, 4).toString("base64");
    const errors: unknown[] = [];
    const draft = Array.from({ length: 7 }, () => store.transformPastedContent({ kind: "image", data, mimeType: "image/png" })).join("");
    try {
      const failed = store.beginPaste(draft, async () => { throw new Error("clipboard unavailable"); }, error => errors.push(error));
      const failedChip = await failed.result;
      expect(failedChip).toMatch(/^\[📷 failed-[a-f0-9]+\]$/u);
      expect(() => store.prepareSubmission(draft + failedChip)).toThrow("Image preparation is unavailable");
      const ninth = store.beginPaste(draft + failedChip, async () => ({ kind: "image", data, mimeType: "image/png" }), error => errors.push(error));
      await ninth.result;
      expect(errors.at(-1)).toMatchObject({ code: "image-count" });
    } finally { await store.dispose(); }
  });

  it("serializes reusable history text and removes only registered image chips", async () => {
    const store = new PromptChipStore();
    try {
      const image = store.transformPastedContent({ kind: "image", data: screenshotPng(4, 4).toString("base64"), mimeType: "image/png" });
      const url = store.transformPastedContent({ kind: "text", text: "https://example.com/path" });
      expect(store.prepareHistoryText(`  explain ${image}\n${url}\n[📷 literal.png]  `))
        .toBe("explain \nhttps://example.com/path\n[📷 literal.png]");
      expect(store.prepareHistoryText(image)).toBe("");
      expect(store.prepareHistoryText("/skill:test\n  untouched 👩‍💻"))
        .toBe("/skill:test\n  untouched 👩‍💻");
    } finally { await store.dispose(); }
  });

  it("bounds pending images and still enforces the eight-image limit after preparation", async () => {
    const store = new PromptChipStore();
    const data = screenshotPng(4, 4).toString("base64");
    const errors: unknown[] = [];
    const read = async () => ({ kind: "image" as const, data, mimeType: "image/png" });
    let draft = "";
    const pastes = Array.from({ length: 8 }, () => {
      const paste = store.beginPaste(draft, read, error => errors.push(error));
      draft += paste.marker;
      return paste;
    });
    try {
      const overflow = store.beginPaste(draft, read, error => errors.push(error));
      await overflow.result;
      expect(errors[0]).toMatchObject({ code: "image-busy" });
      await Promise.all(pastes.map(paste => paste.result));
      expect(store.prepareSubmission(draft).images).toHaveLength(8);
      const ninth = store.beginPaste(draft, read, error => errors.push(error));
      await ninth.result;
      expect(errors.at(-1)).toMatchObject({ code: "image-count" });
      expect(() => store.prepareSubmission(draft + ninth.marker)).toThrow("at most 8 images");
      expect(store.prepareSubmission(draft).images).toHaveLength(8);
    } finally { store.dispose(); }
  });

  it("turns existing files and folders into atomic chips and expands their values", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "a1-prompt-chips-"));
    cleanup.push(root);
    const folder = path.join(root, "source folder");
    const file = path.join(root, "Clipboard (2).png");
    await mkdir(folder);
    await writeFile(file, "image", "utf8");
    const store = new PromptChipStore();

    const folderChip = store.transformPastedContent({ kind: "text", text: folder });
    const fileChip = store.transformPastedContent({ kind: "text", text: file });
    const combinedChips = store.transformPastedContent({ kind: "text", text: `"${folder}" "${file}"` });
    expect(folderChip).toBe("[📁 source folder]");
    expect(fileChip).toBe("[🖼  Clipboard (2).png]");
    expect(combinedChips).toBe(`${folderChip}${fileChip}`);
    expect(store.atomicRanges(`${folderChip} ${fileChip}`)).toHaveLength(2);
    expect(store.expandCopiedText(folderChip)).toBe(folder);
    expect(store.prepareSubmission(`inspect ${fileChip}`).text).toBe(`inspect ${file}`);
  });

  it("keeps a full URL target behind its truncated chip label", () => {
    const store = new PromptChipStore();
    const url = "https://example.com/a/very/useful/resource?with=details";
    const chip = store.transformPastedContent({ kind: "text", text: url });
    const row = `  ${chip}  `;
    const range = store.hyperlinkRanges(row)[0];

    expect(chip).toBe("[🔗 https://example.com/a/very/useful/resour…]");
    expect(range).toEqual({
      start: row.indexOf("https://"),
      end: row.indexOf("https://") + "https://example.com/a/very/useful/resour…".length,
      target: url,
    });
  });

  it("keeps canonical image chips in prompt text and emits their attachment once", () => {
    const store = new PromptChipStore();
    const chip = store.transformPastedContent({ kind: "image", data: "aW1hZ2U", mimeType: "image/png" });
    const prepared = store.prepareSubmission(`${chip} ${chip}`);
    expect(chip).toMatch(/^\[📷 screenshot-[a-f0-9]+\.png\]$/u);
    expect(prepared.text).toBe(`${chip} ${chip}`);
    expect(prepared.images).toEqual([{ type: "image", data: "aW1hZ2U=", mimeType: "image/png" }]);
  });

  it("does not create a chip for malformed image data", () => {
    const store = new PromptChipStore();
    const chip = store.transformPastedContent({ kind: "image", data: "data:image/png;base64,aW1hZ2U=", mimeType: "image/png" });
    expect(chip).toBe("");
    expect(store.prepareSubmission("unchanged")).toEqual({ text: "unchanged", images: [] });
  });
});
