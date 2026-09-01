import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

const WORK_STATE_ENTRY = /#enterWorkState\("(?:working|retry|compaction)",\s*"([^"]+)"\)/gu;

function assertSemanticWorkStateProducers(source: string): void {
  const messages = [...source.matchAll(WORK_STATE_ENTRY)].map(match => match[1] ?? "");
  if (messages.length < 3) throw new Error("expected built-in working, retry, and compaction producers");
  const punctuated = messages.filter(message => /(?:…|\.+)$/u.test(message));
  if (punctuated.length > 0) throw new Error(`work-state producers own progress punctuation: ${punctuated.join(", ")}`);
}

function assertNoUiComponentImport(source: string): void {
  if (/from\s+["'][^"']*ui\/components(?:\/index)?\.js["']/u.test(source)) {
    throw new Error("Pi component adapter imports neutral UI components");
  }
}

describe("progress-status presentation boundary", () => {
  it("keeps punctuation at the shared bare-A1 spinner boundary", async () => {
    const [engine, shell, root, synchronized, dispatch, runtimeSelection] = await Promise.all([
      readFile("src/integrations/pi/engine/adapter.ts", "utf8"),
      readFile("src/integrations/pi/components/shell-footer-status.ts", "utf8"),
      readFile("src/integrations/pi/session-ui/session-shell-root.ts", "utf8"),
      readFile("src/integrations/pi/components/upstream/components/status-indicator.ts", "utf8"),
      readFile("src/cli/dispatch.ts", "utf8"),
      readFile("src/features/launch/runtime-selection.ts", "utf8"),
    ]);

    expect(() => assertSemanticWorkStateProducers(engine)).not.toThrow();
    expect(() => assertNoUiComponentImport(shell)).not.toThrow();
    expect(shell.match(/\bformatProgressStatus\(/gu)).toHaveLength(1);
    expect(root).toContain("createPiShellStatus(view, progressStatusText, handlers)");
    expect(synchronized).toContain("Source-synchronized from Pi 0.84.2");
    expect(synchronized).not.toContain("progressStatusText");
    expect(dispatch).not.toContain("progressStatusText");
    expect(runtimeSelection).not.toContain("progressStatusText");
  });

  it("rejects either a producer marker or a forbidden adapter import", async () => {
    const [engine, shell] = await Promise.all([
      readFile("src/integrations/pi/engine/adapter.ts", "utf8"),
      readFile("src/integrations/pi/components/shell-footer-status.ts", "utf8"),
    ]);
    expect(() => assertSemanticWorkStateProducers(engine.replace('"Compacting"', '"Compacting…"')))
      .toThrow(/own progress punctuation/u);
    expect(() => assertSemanticWorkStateProducers(engine.replace('"Retrying"', '"Retrying..."')))
      .toThrow(/own progress punctuation/u);
    expect(() => assertNoUiComponentImport(`import { progressStatusText } from "../../../ui/components/index.js";\n${shell}`))
      .toThrow(/imports neutral UI components/u);
  });
});
