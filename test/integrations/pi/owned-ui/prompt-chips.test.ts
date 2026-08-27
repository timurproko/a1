import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { rm } from "node:fs/promises";
import { PromptChipStore } from "../../../../src/integrations/pi/owned-ui/prompt-chips.js";

const cleanup: string[] = [];
afterEach(async () => {
  await Promise.all(cleanup.splice(0).map(directory => rm(directory, { recursive: true, force: true })));
});

describe("PromptChipStore", () => {
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

  it("keeps image chips in prompt text and emits their attachment once", () => {
    const store = new PromptChipStore();
    const chip = store.transformPastedContent({ kind: "image", data: "aW1hZ2U=", mimeType: "image/png" });
    const prepared = store.prepareSubmission(`${chip} ${chip}`);
    expect(chip).toMatch(/^\[📷 screenshot-[a-f0-9]+\.png\]$/u);
    expect(prepared.text).toBe(`${chip} ${chip}`);
    expect(prepared.images).toEqual([{ type: "image", data: "aW1hZ2U=", mimeType: "image/png" }]);
  });
});
