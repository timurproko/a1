import { PhotonImage } from "@silvia-odwyer/photon-node";
import { ToolExecutionComponent } from "@earendil-works/pi-coding-agent";
import { getCapabilities, setCapabilities } from "@earendil-works/pi-tui";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createTuiFacade } from "../../../src/integrations/pi/components/shell-shared-facade.js";
import { stripAnsi } from "../../../src/ui/components/text.js";
import { assistantCall, transcriptLifecycleFixture } from "../../support/rendering/transcript-lifecycle-fixture.js";

const active: Awaited<ReturnType<typeof transcriptLifecycleFixture>>[] = [];
const capabilities = getCapabilities();
afterEach(async () => {
  for (const fixture of active.splice(0)) await fixture.dispose();
  setCapabilities(capabilities);
});

/** Tiny synthetic images make byte identity observable without private renderer state or screenshots. */
function image(red: number, mimeType: "image/png" | "image/jpeg" | "image/webp") {
  const pixels = new PhotonImage(new Uint8Array([red, 0, 255 - red, 255]), 1, 1);
  try {
    const bytes = mimeType === "image/png" ? pixels.get_bytes() : mimeType === "image/webp" ? pixels.get_bytes_webp() : pixels.get_bytes_jpeg(90);
    return { type: "image" as const, mimeType, data: Buffer.from(bytes).toString("base64") };
  } finally { pixels.free(); }
}

/** Read public Kitty payloads, excluding allocation IDs that legitimately differ across mounts. */
function kittyData(rows: readonly string[]): string[] {
  return [...rows.join("\n").matchAll(/\u001b_G[^;]*;([^\u001b]*)\u001b\\/g)].map(match => match[1]!);
}

async function fixture(height = 30, width = 80) {
  const value = await transcriptLifecycleFixture({ height, width });
  active.push(value);
  setCapabilities({ ...getCapabilities(), images: "kitty" });
  await value.emit({ type: "message_end", message: assistantCall("image", "unknown", {}) });
  return value;
}

function update(content: { type: "image"; mimeType: string; data: string }[]) {
  return { type: "tool_execution_update", toolCallId: "image", toolName: "unknown", partialResult: { content } };
}

function pinned() {
  return new ToolExecutionComponent("unknown", "image", {}, { showImages: true, imageWidthCells: 80 }, undefined,
    createTuiFacade({ getColumns: () => 80, getRows: () => 30, requestRender() {} }), process.cwd());
}

describe("transcript image conversion lifetime", () => {
  it("locates stale conversion in the independent pinned component, outside owned delivery and caching", async () => {
    await fixture();
    const reference = pinned();
    reference.updateResult({ content: [image(255, "image/jpeg")], isError: false }, true);
    await vi.waitFor(() => expect(kittyData(reference.render(80))).toHaveLength(1));
    const oldPixels = kittyData(reference.render(80));
    const replacement = image(0, "image/png");
    reference.updateResult({ content: [replacement], isError: false }, true);
    // Provenance: baseline attribution only; the required owned behavior is asserted separately below.
    expect(kittyData(reference.render(80))).toEqual(oldPixels);
    expect(kittyData(reference.render(80))).not.toEqual([replacement.data]);
  });

  it("replaces a converted JPEG with current PNG bytes on the same invocation", async () => {
    const value = await fixture();
    await value.emit(update([image(255, "image/jpeg")]));
    const mounted = value.shell.root.transcriptComponent("tool-image")!;
    await vi.waitFor(() => expect(kittyData(mounted.render(80))).toHaveLength(1));
    const replacement = image(0, "image/png");
    await value.emit(update([replacement]));
    expect(value.shell.root.transcriptComponent("tool-image")).toBe(mounted);
    expect(kittyData(mounted.render(80))).toEqual([replacement.data]);
  });

  it("matches a fresh independent pinned renderer after JPEG replacement", async () => {
    const value = await fixture();
    await value.emit(update([image(255, "image/jpeg")]));
    const mounted = value.shell.root.transcriptComponent("tool-image")!;
    await vi.waitFor(() => expect(kittyData(mounted.render(80))).toHaveLength(1));
    const replacement = image(0, "image/jpeg");
    const reference = pinned();
    reference.updateResult({ content: [replacement], isError: false }, true);
    await vi.waitFor(() => expect(kittyData(reference.render(80))).toHaveLength(1));
    await value.emit(update([replacement]));
    await vi.waitFor(() => expect(kittyData(mounted.render(80))).toEqual(kittyData(reference.render(80))));
  });

  it.each(["image/jpeg", "image/webp", "image/gif"] as const)("matches pinned conversion of supported %s content", async mimeType => {
    const value = await fixture();
    const content = [mimeType === "image/gif"
      ? { type: "image" as const, mimeType, data: "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7" }
      : image(255, mimeType)];
    const reference = pinned();
    reference.updateResult({ content, isError: false }, true);
    await value.emit(update(content));
    const mounted = value.shell.root.transcriptComponent("tool-image")!;
    await vi.waitFor(() => {
      expect(kittyData(reference.render(80))).toHaveLength(1);
      expect(kittyData(mounted.render(80))).toEqual(kittyData(reference.render(80)));
    });
  });

  it.each([null, "iterm2"] as const)("matches pinned original-image presentation for capability %s and hidden images", async protocol => {
    const value = await fixture();
    setCapabilities({ ...getCapabilities(), images: protocol });
    const content = [image(255, "image/jpeg")];
    await value.emit(update(content));
    const mounted = value.shell.root.transcriptComponent("tool-image")!;
    const reference = pinned();
    reference.markExecutionStarted(); reference.setArgsComplete();
    reference.updateResult({ content, isError: false }, true);
    for (const width of [40, 80, 192]) expect(mounted.render(width)).toEqual(reference.render(width));
    mounted.setImagePresentation(false, 80); reference.setShowImages(false);
    expect(mounted.render(80)).toEqual(reference.render(80));
    expect(mounted.render(80).map(stripAnsi).join("\n")).toContain("image/jpeg");
  });

  it.each([[40, 54], [80, 60], [192, 54]])("publishes converted image bytes through the real scheduler at unchanged semantic revision at %s x %s", async (width, height) => {
    // Compatibility: pinned Image scales to its width budget; keep its complete placement in the visible viewport.
    const value = await fixture(height, width);
    const content = [image(255, "image/jpeg")];
    await value.emit({ type: "tool_execution_end", toolCallId: "image", toolName: "unknown", isError: false, result: { content } });
    const revision = value.backend.view().transcript.at(-1)!.revision;
    await vi.waitFor(() => expect(value.shell.root.transcriptComponent("tool-image")!.presentationRevision).toBeGreaterThan(0));
    await vi.waitFor(() => expect(kittyData(value.terminal.writes.map(write => write.data)).length).toBeGreaterThan(0));
    expect(value.backend.view().transcript.at(-1)!.revision).toBe(revision);
  });

  it("shows an unavailable fallback when Kitty conversion fails without hiding unaffected output", async () => {
    const value = await fixture();
    await value.emit({ type: "tool_execution_end", toolCallId: "image", toolName: "unknown", isError: false,
      result: { content: [{ type: "text", text: "UNAFFECTED_RESULT" }, { type: "image", mimeType: "image/jpeg", data: "AQID" }] } });
    const mounted = value.shell.root.transcriptComponent("tool-image")!;
    await vi.waitFor(() => {
      const text = mounted.render(80).map(stripAnsi).join("\n");
      expect(text).toContain("UNAFFECTED_RESULT");
      expect(text).toMatch(/\[Image (?:unavailable|conversion failed)/);
    });
    expect(value.backend.view().transcript.at(-1)?.toolState?.execution).toBe("succeeded");
  });
});
