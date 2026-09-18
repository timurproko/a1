import { afterEach, describe, expect, it } from "vitest";
import { getCapabilities, setCapabilities, Text } from "@earendil-works/pi-tui";
import { transcriptLifecycleFixture, TranscriptFixtureSession } from "../../../support/rendering/transcript-lifecycle-fixture.js";

const active: Awaited<ReturnType<typeof transcriptLifecycleFixture>>[] = [];
const capabilities = getCapabilities();
afterEach(async () => {
  for (const fixture of active.splice(0)) await fixture.dispose();
  setCapabilities(capabilities);
});
async function fixture() {
  setCapabilities({ ...capabilities, images: null });
  const value = await transcriptLifecycleFixture();
  active.push(value);
  return value;
}
function update(id: string, data: string, text = "kept output") {
  return { type: "tool_execution_update", toolCallId: id, toolName: "unknown",
    partialResult: { content: [{ type: "text", text }, { type: "image", mimeType: "image/png", data }] } };
}
function assetId(value: Awaited<ReturnType<typeof fixture>>, id: string): string {
  return value.backend.view().transcript.find(block => block.id === `tool-${id}`)!.imageReferences![0]!.assetId;
}

describe("transcript attachment ownership", () => {
  it("releases replaced assets after delivery while retaining another invocation's shared asset", async () => {
    const value = await fixture();
    await value.emit(update("a", "AQID"), update("b", "AQID"));
    const original = assetId(value, "a");
    expect(assetId(value, "b")).toBe(original);
    await value.emit(update("a", "BAUG"));
    expect(value.backend.resolveTranscriptImage(original)).not.toBeNull();
    await value.emit(update("b", "BwgJ"));
    expect(value.backend.resolveTranscriptImage(original)).toBeNull();
    expect(value.backend.resolveTranscriptImage(assetId(value, "a"))).not.toBeNull();
    expect(value.backend.resolveTranscriptImage(assetId(value, "b"))).not.toBeNull();
  });

  it("does not retain every superseded attachment in a synchronous producer burst", async () => {
    const value = await fixture();
    const ids: string[] = [];
    for (let n = 0; n < 256; n++) {
      value.session.emit(update("burst", Buffer.from(`image-${n}`).toString("base64")));
      ids.push(assetId(value, "burst"));
    }
    expect(value.backend.deliveryDiagnostics().pending).toBeLessThan(4);
    expect(ids.slice(0, -1).filter(id => value.backend.resolveTranscriptImage(id) !== null)).toEqual([]);
    await value.backend.flushEvents();
    expect(value.backend.resolveTranscriptImage(ids.at(-1)!)).not.toBeNull();
  });

  it("retains sealed queued attachments until their event is consumed, then releases them", async () => {
    const value = await fixture();
    const delivered: (string | null)[] = [];
    const unsubscribe = value.backend.onEvent(event => {
      if (event.type === "transcript-block" && event.block.id === "tool-queued") {
        delivered.push(value.backend.resolveTranscriptImage(event.block.imageReferences![0]!.assetId)?.data ?? null);
      }
    });
    try {
      // Invariant: a protected barrier freezes the earlier large live block before its replacement.
      value.session.emit(update("queued", "AQID", "x".repeat(100_000)));
      const original = assetId(value, "queued");
      value.session.emit({ type: "auto_retry_start" });
      value.session.emit(update("queued", "BAUG", "x".repeat(100_000)));
      expect(value.backend.resolveTranscriptImage(original)).not.toBeNull();
      await value.backend.flushEvents();
      expect(delivered).toEqual(["AQID", "BAUG"]);
      expect(value.backend.resolveTranscriptImage(original)).toBeNull();
    } finally { unsubscribe(); }
  });

  it("keeps a resolved lazy image alive through reentrant listener production", async () => {
    const value = await fixture();
    const seen: (string | null)[] = [];
    const first = value.backend.onEvent(event => {
      if (event.type === "transcript-block" && event.block.id === "tool-lazy" && event.block.revision === 1) {
        value.session.emit(update("lazy", "BAUG", "y".repeat(100_000)));
      }
    });
    const second = value.backend.onEvent(event => {
      if (event.type === "transcript-block" && event.block.id === "tool-lazy") {
        seen.push(value.backend.resolveTranscriptImage(event.block.imageReferences![0]!.assetId)?.data ?? null);
      }
    });
    try {
      await value.emit(update("lazy", "AQID", "x".repeat(100_000)));
      expect(seen).toEqual(["AQID", "BAUG"]);
    } finally { first(); second(); }
  });

  it("freezes pending image snapshots before authoritative history removes their blocks", async () => {
    const value = await fixture();
    value.session.emit(update("removed", "AQID", "x".repeat(100_000)));
    const original = assetId(value, "removed");
    value.session.messages = [{ role: "user", timestamp: 1, content: "REPLACEMENT_HISTORY" }];
    await value.emit({ type: "agent_settled" });
    expect(value.backend.view().transcript.some(block => block.id === "tool-removed")).toBe(false);
    expect(value.backend.resolveTranscriptImage(original)).toBeNull();
  });

  it("keeps mounted image bytes through a settings rebuild while newer delivery is pending", async () => {
    const value = await fixture();
    await value.emit(update("mounted", "AQID"));
    const original = assetId(value, "mounted");
    const mounted = value.shell.root.transcriptComponent("tool-mounted")!;
    value.session.emit(update("mounted", "BAUG"));
    expect(value.backend.resolveTranscriptImage(original)).toBeNull();
    mounted.setOutputPad(0);
    expect(mounted.render(80).join("\n")).not.toContain("Image unavailable");
    await value.backend.flushEvents();
    expect(value.shell.root.transcriptComponent("tool-mounted")).toBe(mounted);
  });

  it("uses bounded recovery rather than deleting sources when history replacement cannot seal the queue", async () => {
    const value = await fixture();
    value.session.definitions.set("unknown", { name: "unknown", renderResult: () => new Text("bounded", 0, 0) });
    const text = "x".repeat(200_000);
    for (let n = 0; n < 32; n++) value.session.emit(update(`pressure-${n}`, "AQID", text));
    const original = assetId(value, "pressure-0");
    value.session.messages = [{ role: "user", timestamp: 1, content: "REPLACEMENT_HISTORY" }];
    await expect(value.emit({ type: "agent_settled" })).rejects.toThrow("Engine delivery did not complete");
    expect(value.backend.deliveryDiagnostics()).toMatchObject({ overloads: 1, pending: 0, recovering: false });
    expect(value.backend.deliveryDiagnostics().peakBytes).toBeLessThanOrEqual(8 * 1024 * 1024);
    expect(value.backend.snapshot().view.transcript.filter(block => block.kind === "tool-result"))
      .toHaveLength(32);
    expect(value.backend.resolveTranscriptImage(original)).toBeNull();
  });

  it("drops obsolete session and disposed assets without invalidating a replacement's shared content", async () => {
    const value = await fixture();
    await value.emit(update("old", "AQID"));
    const original = assetId(value, "old");
    await value.replaceSession(new TranscriptFixtureSession([{ role: "toolResult", timestamp: 2,
      toolCallId: "new", toolName: "unknown", content: [{ type: "image", mimeType: "image/png", data: "AQID" }] }]));
    expect(assetId(value, "new")).toBe(original);
    expect(value.backend.resolveTranscriptImage(original)).not.toBeNull();
    await value.backend.dispose();
    expect(value.backend.resolveTranscriptImage(original)).toBeNull();
  });
});
