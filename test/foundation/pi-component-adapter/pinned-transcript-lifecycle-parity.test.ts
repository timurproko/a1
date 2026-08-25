import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { Text } from "@earendil-works/pi-tui";
import { describe, expect, it } from "vitest";
import type { OwnedUiTranscriptBlock, OwnedUiTranscriptBlockKind } from "../../../src/foundation/owned-ui-contracts/index.js";
import {
  applyPiTheme,
  createPiShellTranscriptComponent,
} from "../../../src/integrations/pi/components/index.js";
import { capturePinnedTranscriptFrames } from "./pinned-transcript-upstream-fixture.js";

function block(
  id: string,
  kind: OwnedUiTranscriptBlockKind,
  text: string,
  status: "live" | "finalized",
  revision: number,
  payload: Record<string, unknown> = {},
  title: string | null = null,
): OwnedUiTranscriptBlock {
  return { id, kind, text, status, revision, payload, title };
}

function actualFrames(width: number, resizedWidth: number) {
  applyPiTheme("dark");
  const initialBlocks = {
    assistant: block("assistant", "assistant", "Hello 🌍", "live", 1, { stopReason: "pending", timestamp: 0 }),
    thinking: block("thinking", "thinking", "Plan 日本語", "live", 1, { stopReason: "pending", timestamp: 0 }),
    tool: block("tool", "tool-call", "", "live", 1, {
      toolCallId: "tool-1", toolName: "read", arguments: { json: { path: "初.txt" } },
    }, "read"),
    bash: block("bash", "bash", "λ\n", "live", 1, { command: "printf 'λ'", excludeFromContext: false }),
    user: block("user", "user", "User 😀 message", "finalized", 1),
    custom: block("custom", "custom", "Custom café", "finalized", 1, { customType: "probe", display: true, timestamp: 0 }),
    compaction: block("compaction", "compaction", "Summary résumé", "finalized", 1, { tokensBefore: 123, timestamp: 0 }),
  } as const;
  const components = Object.fromEntries(Object.entries(initialBlocks).map(([name, value]) => [
    name,
    createPiShellTranscriptComponent(value, "D:/work"),
  ]));
  const render = (frameWidth: number) => Object.fromEntries(Object.entries(components).map(([name, component]) => [
    name,
    component.render(frameWidth),
  ]));
  const initial = render(width);
  components.tool!.update(block("tool", "tool-call", "partial …", "live", 2, {
    toolCallId: "tool-1", toolName: "read", arguments: { json: { path: "初.txt" } }, partialResult: true,
  }, "read"));
  const partial = render(width);

  components.assistant!.update(block("assistant", "assistant", "Hello 🌍 done", "finalized", 2, { stopReason: "stop", timestamp: 0 }));
  components.thinking!.update(block("thinking", "thinking", "Plan 日本語 done", "finalized", 2, { stopReason: "stop", timestamp: 0 }));
  components.tool!.update(block("tool", "tool-result", "result ✓", "finalized", 3, {
    toolCallId: "tool-1", toolName: "read", arguments: { json: { path: "初.txt", line: 2 } }, isError: false,
  }, "read"));
  components.tool!.setExpanded(true);
  components.bash!.update(block("bash", "bash", "λ\ndone ✓", "finalized", 2, {
    command: "printf 'λ'", exitCode: 0, cancelled: false, excludeFromContext: false,
  }));
  components.bash!.setExpanded(true);
  components.custom!.setExpanded(true);
  components.compaction!.setExpanded(true);
  const updated = render(width);
  const resized = render(resizedWidth);
  return { initial, partial, updated, resized };
}

describe("pinned transcript component lifecycle parity", () => {
  it.each([[24, 17], [40, 31], [72, 48]])(
    "matches independent pinned streaming, replacement, Unicode, expansion, and resize rows at %i/%i columns",
    (width, resizedWidth) => {
      expect(actualFrames(width, resizedWidth)).toEqual(capturePinnedTranscriptFrames(width, resizedWidth));
    },
  );

  it("matches pinned status, error, and retry row styles", async () => {
    const path = resolve("node_modules/@earendil-works/pi-coding-agent/dist/modes/interactive/theme/theme.js");
    const pinned = await import(pathToFileURL(path).href) as {
      initTheme(name: string, watcher: boolean): void;
      theme: { fg(color: string, text: string): string };
    };
    pinned.initTheme("dark", false);
    applyPiTheme("dark");
    const cases = [
      { value: block("system", "system", "System notice", "finalized", 1), expected: pinned.theme.fg("dim", "System notice") },
      { value: block("error", "error", "Failure café", "finalized", 1), expected: pinned.theme.fg("error", "Error: Failure café") },
      { value: block("retry", "retry", "Try again", "finalized", 1), expected: pinned.theme.fg("warning", "Retry: Try again") },
    ];
    for (const width of [17, 40, 72]) {
      for (const item of cases) {
        const actual = createPiShellTranscriptComponent(item.value, "D:/work").render(width);
        expect(actual).toEqual(new Text(item.expected, 1, 0).render(width));
      }
    }
  });

  it("keeps transcript wrapper identity while updating live content and rejects identity replacement", () => {
    const component = createPiShellTranscriptComponent(
      block("stable", "assistant", "one", "live", 1, { stopReason: "pending" }),
      "D:/work",
    );
    component.update(block("stable", "assistant", "two", "finalized", 2, { stopReason: "stop" }));
    expect(component.id).toBe("stable");
    expect(component.revision).toBe(2);
    expect(component.render(30).join("\n")).toContain("two");
    expect(() => component.update(block("replacement", "assistant", "bad", "finalized", 3))).toThrow("identity cannot change");
  });
});
