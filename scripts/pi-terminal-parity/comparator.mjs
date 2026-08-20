import { createHash } from "node:crypto";

export const MAX_REPORTED_DIFFERENCES = 200;
export const MAX_EXCERPT_CHARACTERS = 240;

export function compareParityRun(upstream, candidate, options = {}) {
  const tolerances = new Set(options.tolerances ?? []);
  const differences = [];
  compareValue(differences, tolerances, "producer.geometry", upstream.geometry, candidate.geometry, "component-geometry");
  compareValue(differences, tolerances, "producer.environment", upstream.capabilities, candidate.capabilities, "startup-resources");

  const upstreamByName = new Map(upstream.checkpoints.map(checkpoint => [checkpoint.name, checkpoint]));
  const candidateByName = new Map(candidate.checkpoints.map(checkpoint => [checkpoint.name, checkpoint]));
  const checkpointNames = [...new Set([...upstreamByName.keys(), ...candidateByName.keys()])];
  for (const name of checkpointNames) {
    const expected = upstreamByName.get(name);
    const actual = candidateByName.get(name);
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

  compareValue(differences, tolerances, "exit.code", upstream.exit.code, candidate.exit.code, "shutdown");
  compareValue(differences, tolerances, "exit.signal", upstream.exit.signal, candidate.exit.signal, "shutdown");
  compareValue(differences, tolerances, "restoration", upstream.restoration, candidate.restoration, "shutdown");

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
  if (mutation === "structured-content") {
    const checkpoint = clone.checkpoints.find(value => value.name === "session-info") ?? clone.checkpoints[0];
    if (!checkpoint?.rows[0]) throw new Error("structured-content mutation requires a checkpoint row");
    checkpoint.rows[0].text = '{"sessionId":"flattened"}';
    checkpoint.rows[0].rawText = checkpoint.rows[0].text.padEnd(checkpoint.dimensions.columns);
    return clone;
  }
  if (mutation === "presenter-plane") {
    const checkpoint = clone.checkpoints.find(value => value.name === "command-info-placement") ?? clone.checkpoints[0];
    if (!checkpoint || checkpoint.rows.length < 2) throw new Error("presenter-plane mutation requires checkpoint rows");
    checkpoint.rows = [...checkpoint.rows.slice(1), checkpoint.rows[0]];
    return clone;
  }
  if (mutation === "modal-node") {
    if (clone.checkpoints.length === 0) throw new Error("modal-node mutation requires a checkpoint");
    clone.checkpoints.splice(0, 1);
    return clone;
  }
  if (mutation === "modal-restoration") {
    const checkpoint = clone.checkpoints.find(value => value.name.includes("restored")) ?? clone.checkpoints[0];
    if (!checkpoint) throw new Error("modal-restoration mutation requires a checkpoint");
    checkpoint.cursor = { ...checkpoint.cursor, x: checkpoint.cursor.x + 1 };
    return clone;
  }
  throw new TypeError(`unknown parity mutation: ${mutation}`);
}

export function renderSideBySideDiff(comparison, upstream, candidate) {
  const lines = [
    `Pi terminal parity: ${comparison.passed ? "PASS" : "FAIL"}`,
    `Differences: ${comparison.differenceCount}${comparison.truncated ? ` (first ${comparison.differences.length} shown)` : ""}`,
    "",
  ];
  for (const difference of comparison.differences.slice(0, 80)) {
    lines.push(`[${difference.checkpoint}] ${difference.domain} ${difference.path}`);
    lines.push(`  PI     | ${oneLine(difference.expected)}`);
    lines.push(`  A1 | ${oneLine(difference.actual)}`);
  }
  if (comparison.differences.length === 0) {
    lines.push(`Matched checkpoints: ${comparison.comparedCheckpointNames.join(", ")}`);
  }
  lines.push("", `PI raw capture: ${upstream.raw.sha256}`, `A1 raw capture: ${candidate.raw.sha256}`);
  return `${lines.join("\n")}\n`;
}

function compareCheckpoint(differences, tolerances, expected, actual) {
  const name = expected.name;
  if (tolerances.has("owned-optional-changelog") && (name === "changelog" || name === "export-error")) return;
  compareValue(differences, tolerances, `checkpoints.${name}.dimensions`, expected.dimensions, actual.dimensions, "component-geometry", name);
  compareValue(differences, tolerances, `checkpoints.${name}.cursor`, expected.cursor, actual.cursor, "cursor-focus", name);
  compareValue(differences, tolerances, `checkpoints.${name}.scroll`, expected.scroll, actual.scroll, "scroll", name);
  compareValue(differences, tolerances, `checkpoints.${name}.modes`, expected.modes, actual.modes, "focus", name);

  const rowCount = Math.max(expected.rows.length, actual.rows.length);
  for (let index = 0; index < rowCount; index += 1) {
    const expectedRow = tolerances.has("session-identity-values") ? normalizeSessionIdentityRow(expected.rows[index]) : expected.rows[index];
    const actualRow = tolerances.has("session-identity-values") ? normalizeSessionIdentityRow(actual.rows[index]) : actual.rows[index];
    if (tolerances.has("session-identity-values") && sessionPathFragment(expectedRow, actualRow, name)) continue;
    compareValue(differences, tolerances, `checkpoints.${name}.rows[${index}].text`, expectedRow?.text, actualRow?.text, domainForRow(expected.domains), name);
    compareValue(differences, tolerances, `checkpoints.${name}.rows[${index}].rawText`, expectedRow?.rawText, actualRow?.rawText, "rows-spacing", name);
    compareValue(differences, tolerances, `checkpoints.${name}.rows[${index}].wrapped`, expectedRow?.wrapped, actualRow?.wrapped, "wrapping", name);
    const toleratedScrollbar = tolerances.has("transient-scrollbar-thumb-rounding")
      && scrollbarRoundingEquivalent(expectedRow?.styles, actualRow?.styles);
    const toleratedSgrWhitespace = tolerances.has("differential-sgr-order")
      && whitespaceForegroundEquivalent(expectedRow?.styles, actualRow?.styles);
    if (!toleratedScrollbar && !toleratedSgrWhitespace) {
      compareValue(differences, tolerances, `checkpoints.${name}.rows[${index}].styles`, expectedRow?.styles, actualRow?.styles, "ansi-style", name);
    }
  }
  if (!tolerances.has("differential-sgr-order")) {
    compareValue(differences, tolerances, `checkpoints.${name}.rawSgr`, expected.rawSgr, actual.rawSgr, "raw-ansi", name);
  }
  compareValue(differences, tolerances, `checkpoints.${name}.geometry`, expected.geometry, actual.geometry, "component-geometry", name);
}

function sessionPathFragment(expected, actual, checkpoint) {
  if (!["session-info", "command-info-placement", "command-error-placement"].includes(checkpoint)) return false;
  const values = [expected?.text ?? "", actual?.text ?? ""];
  return values.some(value => /sessions[\\/]20\d{2}|\.jsonl|^\s*(?:-\d{2}-\d{2}T|\d{2}T\d{2}-)/u.test(value));
}

function normalizeSessionIdentityRow(row) {
  if (!row) return row;
  const idRow = /^\s*ID:\s/u.test(row.text);
  const normalize = value => value
    .replaceAll("upstream-oracle", "parity-producer")
    .replaceAll("a1-owned-ui", "parity-producer")
    .replace(/\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z_[0-9a-f-]{36}\.jsonl/giu, match => match.replace(/[0-9a-f]/giu, "x"))
    .replace(/(?<=\bID:\s)[0-9a-f-]{36}/giu, match => match.replace(/[0-9a-f]/giu, "x"));
  return {
    ...row,
    text: normalize(row.text),
    rawText: normalize(row.rawText),
    styles: row.styles.map(style => ({
      ...style,
      text: idRow
        ? normalize(style.text).replace(/[0-9a-f-]{36}/giu, match => match.replace(/[0-9a-f]/giu, "x"))
        : normalize(style.text),
    })),
  };
}

function whitespaceForegroundEquivalent(expected, actual) {
  if (!Array.isArray(expected) || !Array.isArray(actual)) return false;
  const expectedCells = styleCells(expected);
  const actualCells = styleCells(actual);
  if (expectedCells.length !== actualCells.length) return false;
  let foregroundDifference = false;
  for (let index = 0; index < expectedCells.length; index += 1) {
    const left = expectedCells[index];
    const right = actualCells[index];
    if (stableJson(left) === stableJson(right)) continue;
    if (left?.text !== right?.text || !/^\s$/u.test(left?.text ?? "")
      || left?.background !== right?.background
      || stableJson(left?.flags) !== stableJson(right?.flags)) return false;
    foregroundDifference ||= left?.foreground !== right?.foreground;
  }
  return foregroundDifference;
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
