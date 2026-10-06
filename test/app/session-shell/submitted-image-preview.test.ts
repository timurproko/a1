import { stripTerminalSequences } from "@earendil-works/pi-tui";
import { afterEach, describe, expect, it, vi } from "vitest";
import { screenshotPng } from "../../fixtures/image-sources.js";
import { transcriptLifecycleFixture } from "../../support/rendering/transcript-lifecycle-fixture.js";

afterEach(() => vi.unstubAllEnvs());

describe.runIf(process.platform === "win32")("Windows submitted-image composition", () => {
  it("renders Windows WezTerm submissions as composable cells without Kitty placements", async () => {
    vi.stubEnv("WT_SESSION", undefined);
    vi.stubEnv("WEZTERM_PANE", "pane");
    vi.stubEnv("TERM_PROGRAM", "WezTerm");
    const data = screenshotPng(240, 120, false).toString("base64");
    const value = await transcriptLifecycleFixture({ messages: [{
      role: "user", timestamp: 1,
      content: [{ type: "text", text: "inspect [📷 screenshot-0123456789]" }, { type: "image", mimeType: "image/png", data }],
    }] });
    try {
      await vi.waitFor(() => expect(stripTerminalSequences(value.shell.root.render(80).join("\n")))
        .toMatch(/[▘▝▀▖▌▞▛▗▚▐▜▄▙▟█]/u), { timeout: 15_000 });
      const rows = value.shell.root.render(80).join("\n");
      expect(rows).not.toMatch(/\u001b_G|\u001bP|\u001b\]1337;File=|iVBOR/u);
      expect(value.backend.resolveTranscriptImage(value.backend.view().transcript[0]!.imageReferences![0]!.assetId)?.data).toBe(data);
    } finally { await value.dispose(); }
  }, 20_000);

  it("renders ordinary cells while retaining the exact attachment", async () => {
    vi.stubEnv("WT_SESSION", "test-session");
    vi.stubEnv("WEZTERM_PANE", undefined);
    vi.stubEnv("TERM_PROGRAM", undefined);
    const data = screenshotPng(240, 120, false).toString("base64");
    const value = await transcriptLifecycleFixture({ messages: [{
      role: "user", timestamp: 1,
      content: [{ type: "text", text: "inspect [📷 screenshot-0123456789]" }, { type: "image", mimeType: "image/png", data }],
    }] });
    try {
      const block = value.backend.view().transcript[0]!;
      await vi.waitFor(() => expect(stripTerminalSequences(value.shell.root.render(80).join("\n")))
        .toMatch(/[▘▝▀▖▌▞▛▗▚▐▜▄▙▟█]/u), { timeout: 15_000 });
      const rows = value.shell.root.render(80).join("\n");
      expect(rows).not.toMatch(/\u001b_G|\u001bP|\u001b\]1337;File=|iVBOR/u);
      expect(value.backend.resolveTranscriptImage(block.imageReferences![0]!.assetId)?.data).toBe(data);
    } finally { await value.dispose(); }
  }, 20_000);
});
