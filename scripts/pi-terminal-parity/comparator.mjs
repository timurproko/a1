import { createHash } from "node:crypto";

export const MAX_REPORTED_DIFFERENCES = 200;
export const MAX_EXCERPT_CHARACTERS = 240;

export function compareParityRun(upstream, addone, options = {}) {
  const tolerances = new Set(options.tolerances ?? []);
  const differences = [];
  compareValue(differences, tolerances, "producer.geometry", upstream.geometry, addone.geometry, "component-geometry");
  compareValue(differences, tolerances, "producer.environment", upstream.capabilities, addone.capabilities, "startup-resources");

  const upstreamByName = new Map(upstream.checkpoints.map(checkpoint => [checkpoint.name, checkpoint]));
  const addoneByName = new Map(addone.checkpoints.map(checkpoint => [checkpoint.name, checkpoint]));
  const checkpointNames = [...new Set([...upstreamByName.keys(), ...addoneByName.keys()])];
  for (const name of checkpointNames) {
    const expected = upstreamByName.get(name);
    const actual = addoneByName.get(name);
    if (!expected || !actual) {
      record(differences, tolerances, {
        checkpoint: name,
        domain: "lifecycle",
        path: `checkpoints.${name}`,
        expected: expected ? "present" : "missing",
        actual: actual ? "present" : "missing",
      });
      continue;
    }
    compareCheckpoint(differences, tolerances, expected, actual);
  }

  compareValue(differences, tolerances, "exit.code", upstream.exit.code, addone.exit.code, "shutdown");
  compareValue(differences, tolerances, "exit.signal", upstream.exit.signal, addone.exit.signal, "shutdown");
  compareValue(differences, tolerances, "restoration", upstream.restoration, addone.restoration, "shutdown");

  return Object.freeze({
    schemaVersion: 1,
    passed: differences.length === 0,
    differenceCount: differences.length,
    differences: Object.freeze(differences.slice(0, MAX_REPORTED_DIFFERENCES)),
    truncated: differences.length > MAX_REPORTED_DIFFERENCES,
    comparedCheckpointNames: Object.freeze(checkpointNames),
    tolerances: Object.freeze([...tolerances]),
  });
}

export function applyIntentionalMutation(producer, mutation) {
  const clone = structuredClone(producer);
  if (mutation === "visual") {
    const checkpoint = clone.checkpoints.find(value => value.rows.some(row => row.text.length > 0)) ?? clone.checkpoints[0];
    if (!checkpoint) throw new Error("visual mutation requires a checkpoint");
    const rowIndex = Math.max(0, checkpoint.rows.findIndex(row => row.text.length > 0));
    checkpoint.rows[rowIndex].text = `${checkpoint.rows[rowIndex].text} MUTATED`;
    checkpoint.rows[rowIndex].rawText = `${checkpoint.rows[rowIndex].rawText} MUTATED`;
    checkpoint.frameHash = hashJson(checkpoint.rows);
    return clone;
  }
  if (mutation === "input-scroll") {
    const checkpoint = clone.checkpoints.find(value => value.domains.includes("scroll")) ?? clone.checkpoints[0];
    if (!checkpoint) throw new Error("input/scroll mutation requires a checkpoint");
    checkpoint.scroll = { ...checkpoint.scroll, viewportY: checkpoint.scroll.viewportY + 1 };
    checkpoint.cursor = { ...checkpoint.cursor, x: checkpoint.cursor.x + 1 };
    return clone;
  }
  throw new TypeError(`unknown parity mutation: ${mutation}`);
}

export function renderSideBySideDiff(comparison, upstream, addone) {
  const lines = [
    `Pi terminal parity: ${comparison.passed ? "PASS" : "FAIL"}`,
    `Differences: ${comparison.differenceCount}${comparison.truncated ? ` (first ${comparison.differences.length} shown)` : ""}`,
    "",
  ];
  for (const difference of comparison.differences.slice(0, 80)) {
    lines.push(`[${difference.checkpoint}] ${difference.domain} ${difference.path}`);
    lines.push(`  PI     | ${oneLine(difference.expected)}`);
    lines.push(`  AddOne | ${oneLine(difference.actual)}`);
  }
  if (comparison.differences.length === 0) {
    lines.push(`Matched checkpoints: ${comparison.comparedCheckpointNames.join(", ")}`);
  }
  lines.push("", `PI raw capture: ${upstream.raw.sha256}`, `AddOne raw capture: ${addone.raw.sha256}`);
  return `${lines.join("\n")}\n`;
}

function compareCheckpoint(differences, tolerances, expected, actual) {
  const name = expected.name;
  compareValue(differences, tolerances, `checkpoints.${name}.dimensions`, expected.dimensions, actual.dimensions, "component-geometry", name);
  compareValue(differences, tolerances, `checkpoints.${name}.cursor`, expected.cursor, actual.cursor, "cursor-focus", name);
  compareValue(differences, tolerances, `checkpoints.${name}.scroll`, expected.scroll, actual.scroll, "scroll", name);
  compareValue(differences, tolerances, `checkpoints.${name}.modes`, expected.modes, actual.modes, "focus", name);

  const rowCount = Math.max(expected.rows.length, actual.rows.length);
  for (let index = 0; index < rowCount; index += 1) {
    const expectedRow = expected.rows[index];
    const actualRow = actual.rows[index];
    compareValue(differences, tolerances, `checkpoints.${name}.rows[${index}].text`, expectedRow?.text, actualRow?.text, domainForRow(expected.domains), name);
    compareValue(differences, tolerances, `checkpoints.${name}.rows[${index}].rawText`, expectedRow?.rawText, actualRow?.rawText, "rows-spacing", name);
    compareValue(differences, tolerances, `checkpoints.${name}.rows[${index}].wrapped`, expectedRow?.wrapped, actualRow?.wrapped, "wrapping", name);
    if (!(tolerances.has("transient-scrollbar-thumb-rounding")
      && scrollbarRoundingEquivalent(expectedRow?.styles, actualRow?.styles))) {
      compareValue(differences, tolerances, `checkpoints.${name}.rows[${index}].styles`, expectedRow?.styles, actualRow?.styles, "ansi-style", name);
    }
  }
  if (!tolerances.has("differential-sgr-order")) {
    compareValue(differences, tolerances, `checkpoints.${name}.rawSgr`, expected.rawSgr, actual.rawSgr, "raw-ansi", name);
  }
  compareValue(differences, tolerances, `checkpoints.${name}.geometry`, expected.geometry, actual.geometry, "component-geometry", name);
}

function scrollbarRoundingEquivalent(expected, actual) {
  if (!Array.isArray(expected) || !Array.isArray(actual)) return false;
  const expectedCells = styleCells(expected);
  const actualCells = styleCells(actual);
  if (expectedCells.length !== actualCells.length) return false;
  const differences = [];
  for (let index = 0; index < expectedCells.length; index += 1) {
    if (stableJson(expectedCells[index]) !== stableJson(actualCells[index])) differences.push([expectedCells[index], actualCells[index]]);
  }
  return differences.length === 1 && differences.every(([left, right]) =>
    left.text === " " && right.text === " "
    && (left.background === "rgb:3a3a4a" || right.background === "rgb:3a3a4a"));
}

function styleCells(styles) {
  const cells = [];
  for (const style of styles) {
    for (let index = style.start; index < style.end; index += 1) {
      cells[index] = {
        text: style.text[index - style.start] ?? " ",
        foreground: style.foreground,
        background: style.background,
        flags: style.flags,
      };
    }
  }
  return cells;
}

function compareValue(differences, tolerances, path, expected, actual, domain, checkpoint = "run") {
  if (stableJson(expected) === stableJson(actual)) return;
  record(differences, tolerances, { checkpoint, domain, path, expected, actual });
}

function record(differences, tolerances, difference) {
  if (tolerances.has(difference.domain) || tolerances.has(difference.path)) return;
  differences.push(Object.freeze({
    ...difference,
    expected: excerpt(difference.expected),
    actual: excerpt(difference.actual),
  }));
}

function domainForRow(domains) {
  const priority = ["startup-resources", "selector-dialog", "errors", "settlement", "footer-status", "editor", "transcript", "resize", "shutdown"];
  return priority.find(domain => domains.includes(domain)) ?? "rows-spacing";
}

function excerpt(value) {
  const rendered = typeof value === "string" ? value : stableJson(value);
  if (rendered === undefined) return "<undefined>";
  return rendered.length <= MAX_EXCERPT_CHARACTERS ? rendered : `${rendered.slice(0, MAX_EXCERPT_CHARACTERS)}…`;
}

function oneLine(value) {
  return String(value).replaceAll("\r", "\\r").replaceAll("\n", "\\n");
}

function stableJson(value) {
  if (value === undefined) return undefined;
  return JSON.stringify(value, (_key, nested) => {
    if (!nested || typeof nested !== "object" || Array.isArray(nested)) return nested;
    return Object.fromEntries(Object.entries(nested).sort(([left], [right]) => left.localeCompare(right)));
  });
}

function hashJson(value) {
  return createHash("sha256").update(stableJson(value) ?? "undefined").digest("hex");
}
