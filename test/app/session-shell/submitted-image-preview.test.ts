import { getCapabilities, setCapabilities, stripTerminalSequences } from "@earendil-works/pi-tui";
import { afterEach, describe, expect, it, vi } from "vitest";
import { screenshotPng } from "../../fixtures/image-sources.js";
import { transcriptLifecycleFixture } from "../../support/rendering/transcript-lifecycle-fixture.js";

const capabilities = getCapabilities();
afterEach(() => { setCapabilities(capabilities); vi.unstubAllEnvs(); });

describe.runIf(process.platform === "win32")("submitted image preview composition", () => {
  it.each(["kitty", null] as const)("renders a late-row Sixel preview with image capability %s", async images => {
    vi.stubEnv("WT_SESSION", "test-session");
    setCapabilities({ ...capabilities, images, trueColor: true });
    const data = screenshotPng(240, 120, false).toString("base64");
    const value = await transcriptLifecycleFixture({ messages: [{
      role: "user", timestamp: 1,
      content: [{ type: "text", text: "inspect [📷 screenshot-0123456789]" }, { type: "image", mimeType: "image/png", data }],
    }] });
    try {
      const block = value.backend.view().transcript[0]!;
      const component = value.shell.root.transcriptComponent(block.id)!;
      expect(stripTerminalSequences(value.shell.root.render(80).join("\n"))).toContain("Image preparing preview: image/png");
      await vi.waitFor(() => expect(value.shell.root.render(80).join("\n")).toMatch(/\u001bP[0-9;]*q/u), { timeout: 15_000 });
      expect(component.presentationRevision).toBeGreaterThan(0);
      const rows = value.shell.root.render(80).join("\n");
      expect(rows).toMatch(/\u001b_Gm=0;\u001b\\\u001b\[\d+A\u001bP[0-9;]*q/u);
      expect(rows).not.toMatch(/\u001b_Ga=(?:T|p)|\u001b\]1337;File=|iVBOR/u);
      expect(block.imageReferences).toHaveLength(1);
      expect(value.backend.resolveTranscriptImage(block.imageReferences![0]!.assetId)?.data).toBe(data);

      await value.emit({ type: "message_end", message: { role: "assistant", timestamp: 2, stopReason: "stop",
        content: [{ type: "text", text: "later output" }] } });
      value.shell.runtime.renderNow();
      expect(value.shell.root.render(80).join("\n")).toMatch(/\u001bP[0-9;]*q/u);
      const writes = value.terminal.writes.map(write => write.data).join("");
      expect(writes).toMatch(/\u001bP[0-9;]*q/u);
      expect(writes).not.toMatch(/\u001b_Ga=(?:T|p)|\u001b\]1337;File=|iVBOR/u);
    } finally { await value.dispose(); }
  }, 20_000);
});
