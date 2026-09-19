/**
 * The Pi feature adoption matrix: one row per upstream feature the pinned interactive UI presents
 * (the interactive baseline's manifests, the presented settings, and the changelog's "New
 * Features" entries) carrying A1's disposition. Upstream decides which rows exist; A1 decides what
 * each row says. `refreshMatrix` rewrites the upstream side and never changes a disposition, so a
 * regenerated matrix keeps every reviewed decision; `validateMatrix` is the governance rule that
 * no row may stay pending and every disposition names its evidence. Nothing here touches the
 * filesystem.
 */

export const MATRIX_SCHEMA = "a1-pi-feature-adoption-matrix-v1";

/** Invariant: a refresher creates rows as `pending`; every other value is a reviewer's decision. */
export const DISPOSITIONS = Object.freeze(["pinned", "owned", "diverged", "declined", "pending", "retired"]);

const KIND_ORDER = ["command", "hidden-command", "tui-keybinding", "app-keybinding", "event", "settings-callback", "setting", "component", "changelog"];

/**
 * The rows upstream presents, from the baseline manifests, the presented settings, and the
 * changelog's "New Features" entries for versions newer than `changelogSince`.
 */
export function upstreamFeatureRows({ manifests, presentedSettings, changelog, changelogSince }) {
  const rows = [];
  for (const name of manifests.advertisedBuiltInCommands ?? []) rows.push({ id: `command:${name}`, kind: "command", feature: `/${name}` });
  for (const name of manifests.nonAdvertisedCommandRoutes ?? []) rows.push({ id: `hidden-command:${name}`, kind: "hidden-command", feature: `/${name}` });
  for (const name of manifests.tuiKeybindings ?? []) rows.push({ id: `tui-keybinding:${name}`, kind: "tui-keybinding", feature: name });
  for (const name of manifests.appKeybindings ?? []) rows.push({ id: `app-keybinding:${name}`, kind: "app-keybinding", feature: name });
  for (const name of manifests.sessionEvents ?? []) rows.push({ id: `event:${name}`, kind: "event", feature: name });
  for (const name of manifests.settingsCallbacks ?? []) rows.push({ id: `settings-callback:${name}`, kind: "settings-callback", feature: name });
  for (const name of presentedSettings ?? []) rows.push({ id: `setting:${name}`, kind: "setting", feature: name });
  for (const name of manifests.statefulComponents ?? []) rows.push({ id: `component:${name}`, kind: "component", feature: name });
  for (const entry of changelogNewFeatures(changelog ?? "", changelogSince)) {
    rows.push({ id: `changelog:${entry.version}:${entry.slug}`, kind: "changelog", feature: entry.title, version: entry.version, summary: entry.summary });
  }
  const ids = new Set();
  for (const row of rows) {
    if (ids.has(row.id)) throw new Error(`duplicate upstream feature row: ${row.id}`);
    ids.add(row.id);
  }
  return rows;
}

/** The `### New Features` bullets of every changelog release newer than `since` (all releases when `since` is undefined). */
export function changelogNewFeatures(markdown, since) {
  const entries = [];
  for (const section of markdown.split(/(?=^## )/m)) {
    const version = /^## \[?(\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?)\]?/.exec(section)?.[1];
    if (version === undefined || (since !== undefined && compareVersions(version, since) <= 0)) continue;
    const block = /^### New Features\s*\n([\s\S]*?)(?=^### |^## |(?![\s\S]))/m.exec(section)?.[1] ?? "";
    for (const line of block.split("\n")) {
      const match = /^- \*\*(.+?)\*\*\s*(?:—|-|:)?\s*(.*)$/.exec(line.trim());
      if (match === null) continue;
      entries.push({ version, title: match[1].trim(), slug: slug(match[1]), summary: match[2].replace(/\s*See \[.*$/, "").trim() });
    }
  }
  return entries;
}

/**
 * Rewrite the upstream side of the matrix from `upstreamRows`: rows upstream has and the matrix
 * lacks are created as `pending`; rows the matrix has and upstream lacks become `retired`; every
 * other row keeps its disposition and evidence. Returns the next matrix and what changed.
 */
export function refreshMatrix(previous, upstreamRows, { version, changelogSince }) {
  const before = new Map((previous?.rows ?? []).map(row => [row.id, row]));
  const rows = [];
  const report = { created: [], retired: [], restored: [] };
  for (const upstream of upstreamRows) {
    const existing = before.get(upstream.id);
    before.delete(upstream.id);
    if (existing === undefined) {
      rows.push({ ...upstream, since: version, disposition: "pending" });
      report.created.push(upstream.id);
      continue;
    }
    const { id: _id, kind: _kind, feature: _feature, version: _version, summary: _summary, since, disposition, ...reviewed } = existing;
    const restored = disposition === "retired";
    if (restored) report.restored.push(upstream.id);
    rows.push({ ...upstream, since: since ?? version, disposition: restored ? "pending" : disposition, ...reviewed });
  }
  for (const gone of before.values()) {
    if (gone.disposition !== "retired") report.retired.push(gone.id);
    rows.push({ ...gone, disposition: "retired" });
  }
  rows.sort(compareRows);
  return {
    matrix: { schema: MATRIX_SCHEMA, pinned: { version }, changelogSince, rows },
    report,
  };
}

/**
 * The governance rule: every upstream row is present, no row is pending, `owned` names an
 * existing behavior and test, `diverged` names an approved deviation, `declined` gives a reason,
 * and a row upstream no longer presents is `retired`.
 */
export function validateMatrix(matrix, { upstreamRows, behaviorIds, deviationIds, testExists }) {
  const errors = [];
  if (matrix?.schema !== MATRIX_SCHEMA) return [`matrix schema is not ${MATRIX_SCHEMA}`];
  if (!Array.isArray(matrix.rows)) return ["matrix rows must be an array"];
  const upstream = new Map(upstreamRows.map(row => [row.id, row]));
  const seen = new Set();
  for (const row of matrix.rows) {
    if (seen.has(row.id)) errors.push(`${row.id}: duplicate row`);
    seen.add(row.id);
    if (!DISPOSITIONS.includes(row.disposition)) { errors.push(`${row.id}: unknown disposition ${String(row.disposition)}`); continue; }
    const present = upstream.has(row.id);
    if (!present && row.disposition !== "retired") errors.push(`${row.id}: upstream no longer presents this feature; mark it retired or remove the row`);
    if (present && row.disposition === "retired") errors.push(`${row.id}: upstream presents this feature; the row cannot stay retired`);
    if (present && row.feature !== upstream.get(row.id).feature) errors.push(`${row.id}: upstream side is stale (feature ${JSON.stringify(row.feature)} versus ${JSON.stringify(upstream.get(row.id).feature)})`);
    switch (row.disposition) {
      case "pending":
        errors.push(`${row.id}: pending; record pinned, owned, diverged, or declined with its evidence`);
        break;
      case "owned":
        if (typeof row.behavior !== "string" || !behaviorIds.has(row.behavior)) errors.push(`${row.id}: owned row names no known behavior id`);
        if (typeof row.test !== "string" || !row.test.startsWith("test/") || !testExists(row.test)) errors.push(`${row.id}: owned row names no existing test`);
        break;
      case "diverged":
        if (typeof row.deviation !== "string" || !deviationIds.has(row.deviation)) errors.push(`${row.id}: diverged row names no approved deviation`);
        break;
      case "declined":
        if (typeof row.reason !== "string" || row.reason.trim() === "") errors.push(`${row.id}: declined row gives no reason`);
        break;
      default:
        break;
    }
  }
  for (const row of upstreamRows) if (!seen.has(row.id)) errors.push(`${row.id}: upstream feature has no matrix row`);
  return errors;
}

/** The body lines a proposal lists: created rows under "new upstream features", retired ones as review items. */
export function matrixReviewItems(report) {
  return report.retired.map(id => `feature matrix row ${id}: upstream no longer presents it (retired); remove the row or record why A1 keeps the behavior`);
}

export function compareVersions(left, right) {
  const parse = value => String(value).split("-")[0].split(".").map(part => Number.parseInt(part, 10) || 0);
  const [a, b] = [parse(left), parse(right)];
  for (let index = 0; index < Math.max(a.length, b.length); index += 1) {
    const difference = (a[index] ?? 0) - (b[index] ?? 0);
    if (difference !== 0) return difference;
  }
  return 0;
}

function compareRows(left, right) {
  const kinds = KIND_ORDER.indexOf(left.kind) - KIND_ORDER.indexOf(right.kind);
  if (kinds !== 0) return kinds;
  if (left.kind === "changelog" && left.version !== right.version) return compareVersions(left.version, right.version);
  return left.id.localeCompare(right.id);
}

function slug(title) {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}
