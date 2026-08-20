import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  applyIntentionalMutation,
  compareParityRun,
  MAX_REPORTED_DIFFERENCES,
  renderSideBySideDiff,
  type ParityProducerCapture,
} from "../../scripts/pi-terminal-parity/comparator.mjs";

function producer(): ParityProducerCapture {
  return {
    producer: "fixture",
    geometry: { columns: 4, rows: 2 },
    capabilities: { term: "xterm-256color", colorTerm: "truecolor" },
    checkpoints: [{
      name: "settings-navigation",
      domains: ["scroll", "editor", "raw-ansi"],
      dimensions: { columns: 4, rows: 2 },
      cursor: { x: 1, y: 1 },
      scroll: { viewportY: 2, baseY: 2, length: 4 },
      modes: { mouseTrackingMode: "any" },
      rows: [
        { text: "test", rawText: "test", wrapped: false, styles: [{ start: 0, end: 4, text: "test", foreground: "rgb:ffffff", background: "default", flags: ["bold"] }] },
        { text: ">", rawText: ">   ", wrapped: false, styles: [{ start: 0, end: 4, text: ">   ", foreground: "default", background: "default", flags: [] }] },
      ],
      rawSgr: ["\\x1b[38;2;255;255;255m"],
      geometry: [{ start: 0, end: 1 }],
      frameHash: "fixture",
    }],
    exit: { code: 0, signal: null },
    restoration: { cursorShown: true, alternateScreenLeft: true, synchronizedOutputLeft: true },
    raw: { sha256: "fixture", bytes: 10, truncated: false, excerpt: "fixture" },
  };
}

describe("independent Pi terminal parity gate", () => {
  it("compares terminal cells, ANSI styles, spacing, cursor, scroll, geometry, lifecycle, and named checkpoints", () => {
    const upstream = producer();
    const addone = structuredClone(upstream);
    expect(compareParityRun(upstream, addone)).toMatchObject({ passed: true, differenceCount: 0 });
  });

  it.each(["visual", "input-scroll", "structured-content", "presenter-plane", "modal-node", "modal-restoration"] as const)(
    "fails for an intentional %s mutation",
    mutation => {
      const comparison = compareParityRun(producer(), applyIntentionalMutation(producer(), mutation));
      expect(comparison.passed).toBe(false);
      expect(comparison.differences.length).toBeGreaterThan(0);
    },
  );

  it("keeps named terminal-only tolerances narrow and still fails intentional workflow mutations", () => {
    const tolerances = ["differential-sgr-order", "transient-scrollbar-thumb-rounding"];
    for (const mutation of ["visual", "input-scroll", "structured-content", "presenter-plane", "modal-node", "modal-restoration"] as const) {
      expect(compareParityRun(producer(), applyIntentionalMutation(producer(), mutation), { tolerances }).passed).toBe(false);
    }

    const resetOnly = producer();
    resetOnly.checkpoints[0]!.rawSgr.push("\\x1b[m");
    expect(compareParityRun(producer(), resetOnly, { tolerances }).passed).toBe(true);

    const whitespaceForegroundOnly = producer();
    whitespaceForegroundOnly.checkpoints[0]!.rows[1]!.styles = [
      { start: 0, end: 1, text: ">", foreground: "default", background: "default", flags: [] },
      { start: 1, end: 2, text: " ", foreground: "rgb:666666", background: "default", flags: [] },
      { start: 2, end: 4, text: "  ", foreground: "default", background: "default", flags: [] },
    ];
    expect(compareParityRun(producer(), whitespaceForegroundOnly, { tolerances }).passed).toBe(true);

    const whitespaceBackgroundMutation = structuredClone(whitespaceForegroundOnly);
    whitespaceBackgroundMutation.checkpoints[0]!.rows[1]!.styles[1]!.background = "rgb:ff0000";
    expect(compareParityRun(producer(), whitespaceBackgroundMutation, { tolerances }).passed).toBe(false);

    const scrollbarOnly = producer();
    scrollbarOnly.checkpoints[0]!.rows[1]!.styles = [
      { start: 0, end: 3, text: ">  ", foreground: "default", background: "default", flags: [] },
      { start: 3, end: 4, text: " ", foreground: "default", background: "rgb:3a3a4a", flags: [] },
    ];
    expect(compareParityRun(producer(), scrollbarOnly, { tolerances }).passed).toBe(true);

    const wheelMutation = producer();
    wheelMutation.checkpoints[0]!.name = "physical-wheel";
    wheelMutation.checkpoints[0]!.rows[0]!.text = "three rows farther";
    expect(compareParityRun({ ...producer(), checkpoints: [{ ...producer().checkpoints[0]!, name: "physical-wheel" }] }, wheelMutation, { tolerances }).passed).toBe(false);

    const realStyleMutation = producer();
    realStyleMutation.checkpoints[0]!.rows[0]!.styles[0]!.foreground = "rgb:ff0000";
    expect(compareParityRun(producer(), realStyleMutation, { tolerances }).passed).toBe(false);
  });

  it("bounds machine and side-by-side diagnostics", () => {
    const upstream = producer();
    const addone = producer();
    addone.checkpoints[0]!.rows = Array.from({ length: MAX_REPORTED_DIFFERENCES + 50 }, (_, index) => ({
      text: `mutation-${index}`,
      rawText: `mutation-${index}`,
      wrapped: false,
      styles: [],
    }));
    const comparison = compareParityRun(upstream, addone);
    expect(comparison.truncated).toBe(true);
    expect(comparison.differences).toHaveLength(MAX_REPORTED_DIFFERENCES);
    expect(renderSideBySideDiff(comparison, upstream, addone).split("\n").length).toBeLessThan(260);
  });

  it("keeps PTY, process-tree, and cell-grid capture in unpublished test tooling", async () => {
    const manifest = JSON.parse(await readFile(resolve("package.json"), "utf8")) as {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
      files?: string[];
      scripts?: Record<string, string>;
    };
    expect(manifest.scripts?.["test:pi-terminal-parity"]).toBe("npm run build --silent && node scripts/run-pi-terminal-parity.mjs");
    expect(manifest.dependencies).not.toHaveProperty("node-pty");
    expect(manifest.dependencies).not.toHaveProperty("@xterm/headless");
    expect(manifest.devDependencies).toMatchObject({ "node-pty": "1.1.0", "@xterm/headless": "6.0.0" });
    expect(manifest.files).not.toContain("scripts");

    const [runner, session, scenario] = await Promise.all([
      readFile(resolve("scripts/run-pi-terminal-parity.mjs"), "utf8"),
      readFile(resolve("scripts/pi-terminal-parity/terminal-session.mjs"), "utf8"),
      readFile(resolve("scripts/pi-terminal-parity/scenario.mjs"), "utf8"),
    ]);
    expect(runner).toContain("node_modules\", \"@earendil-works\", \"pi-coding-agent");
    expect(runner).toContain("a1-ui.js");
    expect(runner).not.toContain("--tui-mode");
    expect(session).toContain('from "node-pty"');
    expect(session).toContain('from "@xterm/headless"');
    for (const kind of ["text", "key", "wheel", "resize", "checkpoint", "shutdown"]) expect(scenario).toContain(`type: "${kind}"`);
    for (const domain of ["startup-resources", "editor", "transcript", "footer-status", "selector-dialog", "errors", "settlement", "scrollbar", "raw-ansi"]) expect(scenario).toContain(`"${domain}"`);
  });

  it("keeps default regular selection under terminal ownership without repaint patches", async () => {
    const adapter = await readFile(resolve("src/foundation/pi-tui-runtime-adapter/adapter.ts"), "utf8");
    expect(adapter).toContain("new TuiMainScreen");
    expect(adapter).toContain("new TuiAltScreen");
    for (const forbidden of ["OSC52_CLIPBOARD", "UNIFORM_SELECTION_START", "CLEAR_SELECTION_PRESS", "normalizeSelectionHighlight", "selectionHighlightOpen"]) {
      expect(adapter).not.toContain(forbidden);
    }
  });
});
