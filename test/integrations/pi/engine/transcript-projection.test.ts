import { describe, expect, it } from "vitest";
import { PiTranscriptProjection } from "../../../../src/integrations/pi/engine/transcript-projection.js";
import type { OwnedUiTranscriptBlock } from "../../../../src/contracts/owned-ui/index.js";

function projection(retryAttempt = 0) {
  const changes: OwnedUiTranscriptBlock[] = [];
  const target = new PiTranscriptProjection({ retryAttempt: () => retryAttempt, blockChanged: block => changes.push(block) });
  return { target, changes };
}

const user = (text: string, timestamp = 1_000) => ({ role: "user", content: [{ type: "text", text }], timestamp });
const assistant = (text: string, extra: Record<string, unknown> = {}, timestamp = 2_000) =>
  ({ role: "assistant", content: [{ type: "text", text }], timestamp, ...extra });
const toolCallMessage = (id: string, extra: Record<string, unknown> = {}) =>
  ({ role: "assistant", content: [{ type: "toolCall", id, name: "read", arguments: { path: "a.txt" } }], timestamp: 3_000, ...extra });

describe("PiTranscriptProjection", () => {
  it("projects user and assistant messages into stable, revisioned blocks and reports each change", () => {
    const { target, changes } = projection();
    const first = target.upsertMessage(user("hello"), "finalized");
    expect(first).toMatchObject({ kind: "user", status: "finalized", text: "hello", revision: 1 });
    const live = target.upsertMessage(assistant("par"), "live");
    expect(live).toMatchObject({ kind: "assistant", status: "live", revision: 2 });
    target.upsertMessage(assistant("partial"), "live");
    expect(target.blocks.map(block => [block.id, block.text, block.revision])).toEqual([
      [first!.id, "hello", 1],
      [live!.id, "partial", 3],
    ]);
    expect(changes).toHaveLength(3);
    expect(target.block(live!.id)?.text).toBe("partial");
  });

  it("derives image-only presentation without mutating persisted user text or attachment guidance", () => {
    const { target } = projection();
    const marker = "[📷 screenshot-0123456789]";
    const dimension = "[Image: original 3840x2280, displayed at 2000x1188. Multiply coordinates by 1.92 to map to original image.]";
    const conversion = "[Image converted from image/bmp to image/png.]";
    const message = {
      role: "user",
      content: [
        { type: "text", text: `inspect ${marker} beside [📷 literal.png]\n\n${conversion}\n${dimension}` },
        { type: "image", data: "aW1hZ2U=", mimeType: "image/png" },
      ],
      timestamp: 1_500,
    };
    const projected = target.upsertMessage(message, "finalized")!;
    expect(projected.text).toContain(marker);
    expect(projected.text).toContain(dimension);
    expect(projected.userPresentation).toEqual({
      visibleText: "inspect beside [📷 literal.png]",
      imageNotices: [conversion, dimension],
    });
    expect(projected.imageReferences).toHaveLength(1);
  });

  it("derives an attachment-only view and preserves successful note order", () => {
    const { target } = projection();
    const conversion = "[Image converted from image/bmp to image/png.]";
    const firstDimension = "[Image: original 3840x2280, displayed at 2000x1188. Multiply coordinates by 1.92 to map to original image.]";
    const secondDimension = "[Image: original 3000x2000, displayed at 1500x1000. Multiply coordinates by 2.00 to map to original image.]";
    const text = `[📷 screenshot-0123456789][📷 screenshot-abcdef0123-resized]\n\n${conversion}\n${firstDimension}\n${secondDimension}`;
    const projected = target.upsertMessage({ role: "user", content: [
      { type: "text", text },
      { type: "image", data: "Zmlyc3Q=", mimeType: "image/png" },
      { type: "image", data: "c2Vjb25k", mimeType: "image/jpeg" },
    ], timestamp: 1_600 }, "finalized")!;
    expect(projected.text).toBe(text);
    expect(projected.userPresentation).toEqual({
      visibleText: "",
      imageNotices: [conversion, firstDimension, secondDimension],
    });
    expect(projected.imageReferences?.map(image => image.mimeType)).toEqual(["image/png", "image/jpeg"]);
  });

  it("keeps omission failures and all generated-looking text visible when attachment provenance is ambiguous", () => {
    const { target } = projection();
    const marker = "[📷 screenshot-0123456789]";
    const literal = "[📷 screenshot-abcdef0123]";
    const failure = "[Image omitted: could not be resized below the inline image size limit.]";
    const projected = target.upsertMessage({ role: "user", content: [
      { type: "text", text: `${marker} ${literal}\n\n${failure}` },
      { type: "image", data: "aW1hZ2U=", mimeType: "image/png" },
    ], timestamp: 1_700 }, "finalized")!;
    expect(projected.userPresentation).toBeUndefined();
    expect(projected.text).toBe(`${marker} ${literal}\n\n${failure}`);
  });

  it("extracts successful notes around an omitted-image failure without hiding the failure", () => {
    const { target } = projection();
    const first = "[📷 screenshot-0123456789]";
    const second = "[📷 screenshot-abcdef0123]";
    const dimension = "[Image: original 3000x2000, displayed at 1500x1000. Multiply coordinates by 2.00 to map to original image.]";
    const failure = "[Image omitted: could not be resized below the inline image size limit.]";
    const projected = target.upsertMessage({ role: "user", content: [
      { type: "text", text: `${first}${second}\n\n${dimension}\n${failure}` },
      { type: "image", data: "aW1hZ2U=", mimeType: "image/png" },
    ], timestamp: 1_750 }, "finalized")!;
    expect(projected.userPresentation).toEqual({
      visibleText: `${first}${second}\n\n${failure}`,
      imageNotices: [dimension],
    });
  });

  it("does not derive or trim presentation for ordinary image-bearing text", () => {
    const { target } = projection();
    const text = "  authored spacing stays  ";
    const projected = target.upsertMessage({ role: "user", content: [
      { type: "text", text },
      { type: "image", data: "aW1hZ2U=", mimeType: "image/png" },
    ], timestamp: 1_800 }, "finalized")!;
    expect(projected.text).toBe(text);
    expect(projected.userPresentation).toBeUndefined();
  });

  it("keeps image-looking text visible when no image attachment establishes generated provenance", () => {
    const { target } = projection();
    const text = "literal [📷 screenshot-0123456789] and [Image: original 1x1, displayed at 1x1.]";
    expect(target.upsertMessage(user(text), "finalized")).toMatchObject({ text });
    expect(target.blocks[0]?.userPresentation).toBeUndefined();
  });

  it("keeps a message's block id across streaming, settlement, and the same timestamp reused by a later message", () => {
    const { target } = projection();
    const streaming = assistant("a");
    const startId = target.upsertMessage(streaming, "live")!.id;
    expect(target.upsertMessage(streaming, "finalized")!.id).toBe(startId);
    // Invariant: a different message object with the same role and timestamp is a new occurrence, not an overwrite.
    const laterId = target.upsertMessage(assistant("b"), "live")!.id;
    expect(laterId).not.toBe(startId);
    expect(target.blocks).toHaveLength(2);
  });

  it("does not emit or bump a block that repeats itself and does not let a late update reopen a settled tool", () => {
    const { target, changes } = projection();
    target.upsertToolExecution({ type: "tool_execution_start", toolCallId: "call-1", toolName: "read", args: { path: "a" } });
    target.upsertToolExecution({ type: "tool_execution_end", toolCallId: "call-1", toolName: "read", result: { content: [{ type: "text", text: "done" }] }, isError: false });
    const settled = target.block("tool-call-1")!;
    expect(settled).toMatchObject({ kind: "tool-result", status: "finalized", toolState: { execution: "succeeded" } });
    const before = changes.length;
    target.upsertToolExecution({ type: "tool_execution_update", toolCallId: "call-1", toolName: "read", partialResult: { content: [] } });
    target.upsertToolExecution({ type: "tool_execution_start", toolCallId: "call-1", toolName: "read", args: { path: "a" } });
    target.upsert(settled);
    expect(changes).toHaveLength(before);
    expect(target.block("tool-call-1")).toBe(settled);
  });

  it("settles pending tool declarations when the assistant message that declared them fails or aborts", () => {
    const { target } = projection(2);
    target.upsertMessage(toolCallMessage("call-2"), "live");
    expect(target.block("tool-call-2")).toMatchObject({ kind: "tool-call", toolState: { execution: "pending" } });
    target.settleFailedDeclarations({ role: "assistant", stopReason: "aborted" });
    expect(target.block("tool-call-2")).toMatchObject({
      kind: "tool-result", status: "finalized", toolState: { execution: "aborted" }, text: "Aborted after 2 retry attempts",
    });
  });

  it("rebuilds from authoritative messages while reusing unchanged blocks and their revisions", () => {
    const { target } = projection();
    target.upsertMessage(user("one"), "finalized");
    target.upsertMessage(assistant("two"), "finalized");
    const [keptUser, keptAssistant] = target.blocks;
    const rebuilt = target.rebuild([user("one"), assistant("two"), user("three", 4_000)], "finalized");
    expect(rebuilt[0]).toBe(keptUser);
    expect(rebuilt[1]).toBe(keptAssistant);
    expect(rebuilt[2]).toMatchObject({ kind: "user", text: "three" });
    target.replace(rebuilt);
    expect(target.blocks).toHaveLength(3);
    expect(target.snapshot()).toBe(target.snapshot());
    target.upsertMessage(user("four", 5_000), "finalized");
    expect(target.snapshot()).toHaveLength(4);
  });

  it("merges a finished run by the session's message positions without replacing other blocks", () => {
    const { target } = projection();
    const sessionMessages = [user("q"), assistant("r")];
    target.replace(target.rebuild(sessionMessages, "finalized"));
    const extra = assistant("s", {}, 6_000);
    target.mergeRun([sessionMessages[1]!, extra], [...sessionMessages, extra]);
    expect(target.blocks.map(block => block.text)).toEqual(["q", "r", "s"]);
    expect(target.blocks.every(block => block.status === "finalized")).toBe(true);
  });

  it("hands out monotonic revisions for new ids and successor revisions for existing ones", () => {
    const { target } = projection();
    expect(target.nextRevision("fresh-a")).toBe(1);
    expect(target.nextRevision("fresh-b")).toBe(2);
    const block = target.upsertMessage(user("x"), "finalized")!;
    expect(target.nextRevision(block.id)).toBe(block.revision + 1);
  });
});
