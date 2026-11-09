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
  it("converges with the independent pinned component, which now re-converts a replaced result", async () => {
    await fixture();
    const reference = pinned();
    reference.updateResult({ content: [image(255, "image/jpeg")], isError: false }, true);
    await vi.waitFor(() => expect(kittyData(reference.render(80))).toHaveLength(1));
    const oldPixels = kittyData(reference.render(80));
    const replacement = image(0, "image/png");
    reference.updateResult({ content: [replacement], isError: false }, true);
    // Compatibility: the pinned engine re-converts a replaced tool result, so the stale payload this
    // baseline used to record is gone upstream; owned delivery and caching are asserted separately below.
    await vi.waitFor(() => expect(kittyData(reference.render(80))).toEqual([replacement.data]));
    expect(kittyData(reference.render(80))).not.toEqual(oldPixels);
  });

  it("replaces a converted JPEG with current PNG bytes on the same invocation", async () => {
    const value = await fixture();
    await value.emit(update([image(255, "image/jpeg")]));
    const mounted = value.shell.root.transcript.component("tool-image")!;
    await vi.waitFor(() => expect(kittyData(mounted.render(80))).toHaveLength(1));
    const replacement = image(0, "image/png");
    await value.emit(update([replacement]));
    expect(value.shell.root.transcript.component("tool-image")).toBe(mounted);
    expect(kittyData(mounted.render(80))).toEqual([replacement.data]);
  });

  it("matches a fresh independent pinned renderer after JPEG replacement", async () => {
    const value = await fixture();
    await value.emit(update([image(255, "image/jpeg")]));
    const mounted = value.shell.root.transcript.component("tool-image")!;
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
    const mounted = value.shell.root.transcript.component("tool-image")!;
    await vi.waitFor(() => {
      expect(kittyData(reference.render(80))).toHaveLength(1);
      expect(kittyData(mounted.render(80))).toEqual(kittyData(reference.render(80)));
    });
  });

  it.each([null, "iterm2"] as const)("uses the owned unsupported and hidden fallback policy for capability %s", async protocol => {
    const value = await fixture();
    setCapabilities({ ...getCapabilities(), images: protocol });
    const content = [image(255, "image/jpeg")];
    await value.emit(update(content));
    const mounted = value.shell.root.transcript.component("tool-image")!;
    const reference = pinned();
    reference.markExecutionStarted(); reference.setArgsComplete();
    reference.updateResult({ content, isError: false }, true);
    for (const width of [40, 80, 192]) {
      if (protocol === null) {
        expect(mounted.render(width).map(stripAnsi).join("\n")).not.toContain("[Image:");
        expect(reference.render(width).map(stripAnsi).join("\n")).toContain("[Image:");
      } else expect(mounted.render(width)).toEqual(reference.render(width));
    }
    mounted.setImagePresentation(false, 80); reference.setShowImages(false);
    expect(reference.render(80).map(stripAnsi).join("\n")).toContain("image/jpeg");
    expect(mounted.render(80).map(stripAnsi).join("\n")).not.toContain("image/jpeg");
  });

  it.each([null, "kitty", "iterm2"] as const)("hides existing and subsequent tool images without gaps at capability %s", async protocol => {
    const value = await fixture();
    setCapabilities({ ...getCapabilities(), images: protocol });
    const first = image(255, "image/png"), second = image(0, "image/png");
    const text = { type: "text" as const, text: "ORDINARY_TOOL_RESULT" };
    const send = (content: (typeof first | typeof text)[]) => value.emit({
      type: "tool_execution_update", toolCallId: "image", toolName: "unknown", partialResult: { content },
    });
    await send([text]);
    const mounted = value.shell.root.transcript.component("tool-image")!;
    const baseline = [40, 80, 192].map(width => mounted.render(width));
    await send([text, first, second]);
    value.shell.root.setImagePresentation(false, 80);
    for (const [index, width] of [40, 80, 192].entries()) expect(mounted.render(width)).toEqual(baseline[index]);
    await send([text, second]);
    expect(mounted.render(80)).toEqual(baseline[1]);
    const block = value.backend.view().transcript.find(block => block.id === "tool-image")!;
    expect(value.backend.extensions.resolveTranscriptImage(block.imageReferences![0]!.assetId)).toMatchObject(second);
    value.shell.root.setImagePresentation(true, 80);
    const visible = mounted.render(80).join("\n");
    if (protocol === "kitty") expect(kittyData(mounted.render(80))).toEqual([second.data]);
    else if (protocol === "iterm2") expect(visible).toContain("\u001b]1337;File=");
    else expect(mounted.render(80)).toEqual(baseline[1]);
    value.shell.root.setImagePresentation(false, 80);
    await send([]);
    const empty = mounted.render(80);
    await send([first, second]);
    expect(mounted.render(80)).toEqual(empty);
    expect(mounted.render(80).join("\n")).not.toContain("\u001b_G");
  });

  it.each([[40, 54], [80, 60], [192, 54]])("publishes converted image bytes through the real scheduler at unchanged semantic revision at %s x %s", async (width, height) => {
    // Compatibility: pinned Image scales to its width budget; keep its complete placement in the visible viewport.
    const value = await fixture(height, width);
    const content = [image(255, "image/jpeg")];
    await value.emit({ type: "tool_execution_end", toolCallId: "image", toolName: "unknown", isError: false, result: { content } });
    const revision = value.backend.session.view().transcript.at(-1)!.revision;
    await vi.waitFor(() => expect(value.shell.root.transcript.component("tool-image")!.presentationRevision).toBeGreaterThan(0));
    await vi.waitFor(() => expect(kittyData(value.terminal.writes.map(write => write.data)).length).toBeGreaterThan(0));
    expect(value.backend.session.view().transcript.at(-1)!.revision).toBe(revision);
  });

  it("shows an unavailable fallback when Kitty conversion fails without hiding unaffected output", async () => {
    const value = await fixture();
    await value.emit({ type: "tool_execution_end", toolCallId: "image", toolName: "unknown", isError: false,
      result: { content: [{ type: "text", text: "UNAFFECTED_RESULT" }, { type: "image", mimeType: "image/jpeg", data: "AQID" }] } });
    const mounted = value.shell.root.transcript.component("tool-image")!;
    await vi.waitFor(() => {
      const text = mounted.render(80).map(stripAnsi).join("\n");
      expect(text).toContain("UNAFFECTED_RESULT");
      expect(text).toMatch(/\[Image (?:unavailable|conversion failed)/);
    });
    expect(value.backend.session.view().transcript.at(-1)?.toolState?.execution).toBe("succeeded");
  });
});
