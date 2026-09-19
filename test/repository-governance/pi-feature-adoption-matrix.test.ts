import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  changelogNewFeatures,
  DISPOSITIONS,
  MATRIX_SCHEMA,
  matrixReviewItems,
  refreshMatrix,
  upstreamFeatureRows,
  validateMatrix,
} from "../../scripts/pi/pi-feature-adoption-matrix.mjs";
import { extractPiSettingsMetadata } from "../../scripts/pi/pi-settings-metadata.mjs";

type Row = { id: string; kind: string; feature: string; disposition: string; behavior?: string; test?: string; deviation?: string; reason?: string; since?: string };
type Matrix = { schema: string; pinned: { version: string }; changelogSince: string; rows: Row[] };

const matrixPath = resolve("config/baselines/pi-feature-adoption-matrix.json");

async function matrix(): Promise<Matrix> {
  return JSON.parse(await readFile(matrixPath, "utf8")) as Matrix;
}

/** The upstream rows the current tree presents, read from the same sources the refresher uses. */
async function currentUpstreamRows(changelogSince: string) {
  const baseline = JSON.parse(await readFile("config/baselines/pinned-pi-interactive-baseline.json", "utf8")) as { manifests: Record<string, string[]> };
  const changelog = JSON.parse(await readFile("src/integrations/pi/engine/resources/changelog.json", "utf8")) as { data: string };
  return upstreamFeatureRows({
    manifests: baseline.manifests,
    presentedSettings: extractPiSettingsMetadata().presented,
    changelog: changelog.data,
    changelogSince,
  });
}

async function evidence() {
  const baseline = JSON.parse(await readFile("config/baselines/pinned-pi-interactive-baseline.json", "utf8")) as { behaviorInventory: { id: string }[] };
  const ledger = JSON.parse(await readFile("config/baselines/pinned-pi-source-port-ledger.json", "utf8")) as { records: { approvedDeviations: { id: string }[] }[] };
  return {
    behaviorIds: new Set(baseline.behaviorInventory.map(behavior => behavior.id)),
    deviationIds: new Set(ledger.records.flatMap(record => record.approvedDeviations.map(deviation => deviation.id))),
    testExists: (path: string) => existsSync(resolve(path)),
  };
}

describe("Pi feature adoption matrix governance", () => {
  it("records a disposition with evidence for every feature the pinned Pi presents", async () => {
    const value = await matrix();
    const upstreamRows = await currentUpstreamRows(value.changelogSince);
    expect(value.schema).toBe(MATRIX_SCHEMA);
    expect(validateMatrix(value, { upstreamRows, ...(await evidence()) })).toEqual([]);
    expect(value.rows.some(row => row.disposition === "pending")).toBe(false);
    expect(value.rows.filter(row => row.kind === "changelog").length).toBeGreaterThan(0);
  });

  it("is current for the installed packages (`--check`)", () => {
    const result = spawnSync(process.execPath, ["scripts/pi/update-pi-feature-adoption-matrix.mjs", "--check"], { cwd: process.cwd(), encoding: "utf8" });
    expect(result.status, result.stderr).toBe(0);
    expect(result.stdout).toContain("Pi feature adoption matrix is current");
  }, 30_000);

  it("names a row for every manifest entry, presented setting, and changelog feature", async () => {
    const value = await matrix();
    const ids = new Set(value.rows.map(row => row.id));
    for (const row of await currentUpstreamRows(value.changelogSince)) expect(ids.has(row.id), row.id).toBe(true);
    expect(ids.has("command:thinking")).toBe(true);
    expect(ids.has("setting:modelThinkingLevels")).toBe(true);
    expect(ids.has("setting:fullscreenCopyOnSelect")).toBe(true);
  });

  it("fails on a pending row, missing evidence, and a stale upstream side", async () => {
    const value = await matrix();
    const context = { upstreamRows: await currentUpstreamRows(value.changelogSince), ...(await evidence()) };
    const pending = structuredClone(value);
    pending.rows[0]!.disposition = "pending";
    expect(validateMatrix(pending, context)).toEqual([`${pending.rows[0]!.id}: pending; record pinned, owned, diverged, or declined with its evidence`]);

    const owned = structuredClone(value);
    const ownedRow = owned.rows.find(row => row.disposition === "owned")!;
    ownedRow.behavior = "nothing.here";
    ownedRow.test = "test/does-not-exist.test.ts";
    expect(validateMatrix(owned, context)).toEqual([`${ownedRow.id}: owned row names no known behavior id`, `${ownedRow.id}: owned row names no existing test`]);

    const diverged = structuredClone(value);
    diverged.rows[1] = { ...diverged.rows[1]!, disposition: "diverged", deviation: "unapproved" };
    expect(validateMatrix(diverged, context)).toEqual([`${diverged.rows[1]!.id}: diverged row names no approved deviation`]);

    const declined = structuredClone(value);
    declined.rows[2] = { ...declined.rows[2]!, disposition: "declined", reason: " " };
    expect(validateMatrix(declined, context)).toEqual([`${declined.rows[2]!.id}: declined row gives no reason`]);

    const gone = structuredClone(value);
    gone.rows.push({ id: "command:vanished", kind: "command", feature: "/vanished", disposition: "pinned" });
    expect(validateMatrix(gone, context)).toEqual(["command:vanished: upstream no longer presents this feature; mark it retired or remove the row"]);

    const missing = structuredClone(value);
    const removed = missing.rows.splice(0, 1)[0]!;
    expect(validateMatrix(missing, context)).toEqual([`${removed.id}: upstream feature has no matrix row`]);

    const retired = structuredClone(value);
    retired.rows[3]!.disposition = "retired";
    expect(validateMatrix(retired, context)).toEqual([`${retired.rows[3]!.id}: upstream presents this feature; the row cannot stay retired`]);
  });
});

describe("Pi feature adoption matrix refresh", () => {
  const manifests = {
    advertisedBuiltInCommands: ["settings", "thinking"],
    nonAdvertisedCommandRoutes: ["debug"],
    tuiKeybindings: ["tui.editor.undo"],
    appKeybindings: ["app.interrupt", "tui.editor.undo"],
    sessionEvents: ["agent_start"],
    settingsCallbacks: ["onThemeChange"],
    statefulComponents: ["CustomEditor"],
  };
  const changelog = [
    "# Changelog",
    "",
    "## [0.85.1] - 2026-09-05",
    "",
    "### New Features",
    "",
    "- **GPT-6 Astra** — Available through OpenAI API keys. See [API Keys](docs/providers.md#api-keys).",
    "",
    "### Added",
    "",
    "- Added a thing.",
    "",
    "## [0.84.2] - 2026-08-14",
    "",
    "### New Features",
    "",
    "- **Fullscreen transcript search** — Search and navigate matches in fullscreen mode.",
    "",
  ].join("\n");

  it("derives one row per manifest entry, setting, and changelog feature newer than the floor with stable ids", () => {
    const rows = upstreamFeatureRows({ manifests, presentedSettings: ["theme"], changelog, changelogSince: "0.84.2" });
    expect(rows.map(row => row.id)).toEqual([
      "command:settings", "command:thinking", "hidden-command:debug", "tui-keybinding:tui.editor.undo", "app-keybinding:app.interrupt", "app-keybinding:tui.editor.undo",
      "event:agent_start", "settings-callback:onThemeChange", "setting:theme", "component:CustomEditor", "changelog:0.85.1:gpt-6-astra",
    ]);
    expect(rows.at(-1)).toMatchObject({ kind: "changelog", feature: "GPT-6 Astra", version: "0.85.1", summary: "Available through OpenAI API keys." });
    expect(changelogNewFeatures(changelog).map(entry => entry.slug)).toEqual(["gpt-6-astra", "fullscreen-transcript-search"]);
    expect(changelogNewFeatures(changelog, "0.85.1")).toEqual([]);
  });

  it("creates new rows as pending, retires rows upstream dropped, and never changes a disposition", () => {
    const upstreamRows = upstreamFeatureRows({ manifests, presentedSettings: ["theme"], changelog, changelogSince: "0.84.2" });
    const previous = {
      schema: MATRIX_SCHEMA,
      pinned: { version: "0.84.2" },
      changelogSince: "0.84.2",
      rows: [
        { id: "command:settings", kind: "command", feature: "/settings", since: "0.84.2", disposition: "owned", behavior: "commands.complete-manifest", test: "test/integrations/pi/engine/workflows.test.ts" },
        { id: "command:gone", kind: "command", feature: "/gone", since: "0.84.2", disposition: "declined", reason: "Never shipped in A1." },
        { id: "setting:theme", kind: "setting", feature: "theme", since: "0.84.2", disposition: "retired" },
      ],
    };
    const { matrix: next, report } = refreshMatrix(previous, upstreamRows, { version: "0.85.1", changelogSince: "0.84.2" });
    expect(report).toEqual({
      created: upstreamRows.map(row => row.id).filter(id => !["command:settings", "setting:theme"].includes(id)),
      retired: ["command:gone"],
      restored: ["setting:theme"],
    });
    const byId = new Map(next.rows.map(row => [row.id, row]));
    expect(byId.get("command:settings")).toMatchObject({ disposition: "owned", behavior: "commands.complete-manifest", since: "0.84.2" });
    expect(byId.get("command:gone")).toMatchObject({ disposition: "retired", reason: "Never shipped in A1." });
    expect(byId.get("setting:theme")).toMatchObject({ disposition: "pending", since: "0.84.2" });
    expect(byId.get("command:thinking")).toMatchObject({ disposition: "pending", since: "0.85.1" });
    expect(next.pinned).toEqual({ version: "0.85.1" });
    expect(next.rows.map(row => row.kind).indexOf("changelog")).toBe(next.rows.length - 1);
    expect(matrixReviewItems(report)).toEqual(["feature matrix row command:gone: upstream no longer presents it (retired); remove the row or record why A1 keeps the behavior"]);
    const again = refreshMatrix(next, upstreamRows, { version: "0.85.1", changelogSince: "0.84.2" });
    expect(again.report).toEqual({ created: [], retired: [], restored: [] });
    expect(again.matrix).toEqual(next);
  });

  it("knows every disposition the governance rule accepts", () => {
    expect([...DISPOSITIONS]).toEqual(["pinned", "owned", "diverged", "declined", "pending", "retired"]);
  });
});
