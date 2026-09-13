import { execFileSync } from "node:child_process";
import { readFileSync, rmSync } from "node:fs";
import { dirname } from "node:path";
import { describe, expect, it } from "vitest";
import { hyperlinkTargetAtColumn } from "../../../../src/ui/components/spans.js";
import { displayWidth } from "../../../../src/ui/components/text.js";
import { ghostLinkDocument, ghostLinkPlainRows, ghostLinkScreen, ghostLinkWrite } from "../../../support/rendering/ghost-link-fixture.js";
import { replayTerminalPaint } from "../../../support/rendering/terminal-paint-evidence.js";

const FILE_TARGET = "file:///C:/work/package.json";
const CLOSE_LINK = "\u001b]8;;\u001b\\";

describe("ghost link baseline fixture", () => {
  it.each([40, 80, 192])("keeps explicit links, padding and wrapped rows bounded at width %i", width => {
    const document = ghostLinkDocument(width, "explicit", FILE_TARGET);
    const rows = ghostLinkScreen(document, width, 54, 0, false, "fixture");
    expect(rows).toHaveLength(54);
    expect(rows.every(row => displayWidth(row) <= width)).toBe(true);
    expect(rows.every(row => row.endsWith(`${CLOSE_LINK}\u001b[0m`))).toBe(true);
    expect(document.join("\n")).toContain(FILE_TARGET);
    const duplicated = document[4]!;
    expect(hyperlinkTargetAtColumn(duplicated, 2)).toBeDefined();
    expect(hyperlinkTargetAtColumn(duplicated, 12)).toBeUndefined();
    expect(hyperlinkTargetAtColumn(duplicated, 22)).toBeDefined();
  });

  it("keeps auto-detected labels identical without emitting explicit targets", () => {
    const explicit = ghostLinkDocument(80, "explicit", FILE_TARGET);
    const automatic = ghostLinkDocument(80, "auto-detected", FILE_TARGET);
    expect(ghostLinkPlainRows(explicit)).toEqual(automatic);
    expect(automatic.join("\n")).not.toContain("\u001b]8;");
    expect(automatic.join("\n")).toContain("import('file:///C:/work/");
  });

  it("replaces every link row with blank non-linked cells in one complete forced write", () => {
    const rows = ghostLinkScreen(ghostLinkDocument(80, "explicit", FILE_TARGET), 80, 24, 0, true, "blank");
    expect(ghostLinkPlainRows(rows).slice(0, 22).every(row => row.trim() === "")).toBe(true);
    for (const row of rows) {
      for (let column = 0; column < 80; column += 1) {
        expect(hyperlinkTargetAtColumn(row, column)).toBeUndefined();
      }
    }
    const write = ghostLinkWrite(rows, true);
    expect(write.startsWith("\u001b[?2026h\u001b[2J")).toBe(true);
    expect(write.endsWith("\u001b[24;1H\u001b[?25l\u001b[?2026l")).toBe(true);
    expect([...write.matchAll(/\u001b\[2K/gu)]).toHaveLength(24);
  });

  it.each([40, 80, 192])("groups wrapped occurrences without changing targets, labels or colors at width %i", width => {
    const original = ghostLinkDocument(width, "explicit", FILE_TARGET);
    const grouped = ghostLinkDocument(width, "explicit", FILE_TARGET, false, true);
    expect(grouped.map(row => row.replace(/\u001b\]8;id=[^;]+;/gu, "\u001b]8;;"))).toEqual(original);
    const ids = new Map<string, Set<string>>();
    for (const match of grouped.join("\n").matchAll(/\u001b\]8;id=([^;]+);([^\u001b]+)\u001b\\/gu)) {
      const targetIds = ids.get(match[2]!) ?? new Set<string>();
      targetIds.add(match[1]!); ids.set(match[2]!, targetIds);
    }
    expect(ids.size).toBe(2);
    expect([...ids.values()].every(values => values.size === 1)).toBe(true);
    expect(new Set([...ids.values()].flatMap(values => [...values])).size).toBe(2);
  });

  it.each(["honor", "ignore"] as const)("replays row-local ECH with the same final cells and cursor (%s sync)", async synchronizedUpdates => {
    const document = ghostLinkDocument(40, "explicit", FILE_TARGET, false, true);
    const frames = [0, 3, 6].map((scrollTop, index) => ghostLinkScreen(document, 40, 24, scrollTop, index === 2, "probe"));
    const original = frames.map((rows, index) => ({ atMs: index * 33, data: ghostLinkWrite(rows, true) }));
    const candidate = frames.map((rows, index) => ({ atMs: index * 33, data: ghostLinkWrite(rows, false, "ech", 40) }));
    expect(candidate.every(write => !/\u001b\[(?:[0123])?J/u.test(write.data))).toBe(true);
    const [expected, actual] = await Promise.all([
      replayTerminalPaint(original, { columns: 40, rows: 24, synchronizedUpdates }),
      replayTerminalPaint(candidate, { columns: 40, rows: 24, synchronizedUpdates }),
    ]);
    expect(actual.final).toEqual(expected.final);
    // Native hover decoration is NOT represented by this cell comparison. The timeout
    // allows the ignored-sync oracle's asynchronous per-token writes on Windows, not slower production paint.
  }, 15_000);

  it("does not smuggle a screen clear into the ECH host experiment's forwarded writes", () => {
    const output = execFileSync(process.execPath, ["--import", "tsx", "scripts/pi/reproduce-ghost-link-underlines.ts", "--capture",
      "--group-wrapped", "--row-erase", "ech"], { encoding: "utf8", timeout: 15_000 });
    const path = /Trace saved: ([^\r\n]+)/u.exec(output)?.[1];
    expect(path).toBeDefined();
    try {
      const entries = readFileSync(path!, "utf8").trim().split("\n").map(line => JSON.parse(line) as Record<string, unknown>);
      expect(entries[0]).toMatchObject({ groupWrappedLinks: true, rowErase: "ech" });
      for (const frame of entries.filter(entry => entry.type === "frame-request")) {
        const forwarded = entries[entries.indexOf(frame) + 1];
        expect(forwarded?.type).toBe("terminal-write");
        expect(String(forwarded?.data)).toContain("\u001b[192X");
        expect(/\u001b\[(?:[0123])?J/u.test(String(forwarded?.data))).toBe(frame.bypass);
      }
      expect(entries.some(entry => entry.type === "human-observation")).toBe(false);
    } finally {
      if (path !== undefined) rmSync(dirname(path), { recursive: true, force: true });
    }
  });

  it.each([false, true])("captures persistent-clear comparisons (initially preserved: %s) without a physical verdict", initiallyPreserved => {
    const output = execFileSync(process.execPath, [
      "--import", "tsx", "scripts/pi/reproduce-ghost-link-underlines.ts", "--capture",
      ...(initiallyPreserved ? ["--auto", "--preserve-clears"] : []),
    ], { encoding: "utf8", timeout: 15_000 });
    const path = /Trace saved: ([^\r\n]+)/u.exec(output)?.[1];
    expect(path).toBeDefined();
    try {
      const entries = readFileSync(path!, "utf8").trim().split("\n")
        .map(line => JSON.parse(line) as Record<string, unknown>);
      expect(entries[0]).toMatchObject({
        type: "metadata", formatVersion: 2, interactive: false, columns: 192, rows: 54,
        mode: initiallyPreserved ? "auto-detected" : "explicit", preserveClears: initiallyPreserved,
      });
      const frames = entries.filter(entry => entry.type === "frame-request");
      expect(frames).toHaveLength(13);
      expect(frames.some(frame => frame.mode === "auto-detected")).toBe(true);
      for (const frame of frames) {
        expect(frame.bypass).toBe(frame.preserveClears === true || frame.action === "f");
        if (frame.bypass) {
          const forwarded = entries[entries.indexOf(frame) + 1];
          expect(forwarded).toMatchObject({ type: "terminal-write", data: frame.data });
          expect(String(forwarded?.data).startsWith("\u001b[?2026h\u001b[2J")).toBe(true);
        }
      }
      const toggled = frames.filter(frame => frame.action === "p");
      expect(toggled.map(frame => frame.preserveClears)).toEqual([!initiallyPreserved, initiallyPreserved]);
      const wheelDown = frames[9]!;
      const wheelUp = frames[10]!;
      expect(wheelDown).toMatchObject({ action: "j", scrollTop: 3, preserveClears: !initiallyPreserved });
      expect(wheelUp).toMatchObject({ action: "k", scrollTop: 0, preserveClears: !initiallyPreserved });
      expect(entries.filter(entry => entry.type === "terminal-write")).toHaveLength(13);
      expect(entries.at(-1)).toMatchObject({ type: "physical-result", result: "not-observed" });
      expect(entries.some(entry => entry.type === "human-observation")).toBe(false);
    } finally {
      // Security: only this child process's uniquely created diagnostic run is removed.
      if (path !== undefined) rmSync(dirname(path), { recursive: true, force: true });
    }
  });
});
