import { readFile, readdir } from "node:fs/promises";
import { extname, join } from "node:path";

// Rationale: god objects grew because nothing measured them. The ratchet records every unit above a
// threshold and lets its counts only shrink, so growth needs a reviewed baseline edit. The scan masks
// strings, comments, and regular expressions and then counts braces; it needs no compiler or build,
// and a file whose braces do not balance is reported instead of silently mismeasured.

export const SIZE_RATCHET_SCHEMA = "a1-size-ratchet-v1";
export const SIZE_THRESHOLDS = Object.freeze({ classMethods: 20, classFields: 15, functionLines: 100 });
const TYPESCRIPT_VENDORED = /^src\/integrations\/pi\/components\/upstream\//;
const TS_MODIFIERS = "(?:(?:public|private|protected|static|override|readonly|abstract|async|declare|accessor)\\s+)*";
const TS_METHOD = new RegExp(`^\\s*${TS_MODIFIERS}(?:(?:get|set)\\s+)?\\*?\\s*(#?[\\w$]+)\\s*[?!]?\\s*(?:<[^(]*>)?\\s*\\(`);
const TS_FIELD = new RegExp(`^\\s*${TS_MODIFIERS}(#?[\\w$]+)\\s*[?!]?\\s*[:=;]`);
const TS_CLASS = /^\s*(?:export\s+)?(?:default\s+)?(?:abstract\s+)?class\s+([\w$]+)/;
const TS_FUNCTION = /^\s*(?:export\s+)?(?:default\s+)?(?:async\s+)?function\s*\*?\s*([\w$]+)/;
const RUST_FN = /^\s*(?:pub(?:\s*\([^)]*\))?\s+)?(?:const\s+)?(?:async\s+)?(?:unsafe\s+)?(?:extern\s+"[^"]*"\s+)?fn\s+(\w+)/;
const RUST_SCOPE = /^\s*(?:pub(?:\s*\([^)]*\))?\s+)?(?:unsafe\s+)?(impl|trait|mod)\b(.*)$/;
const REGEX_PRECEDING_WORDS = new Set(["return", "typeof", "case", "do", "else", "in", "of", "new", "delete", "void", "throw", "yield", "await", "instanceof"]);

/** Replaces string, comment, and regular-expression contents with spaces, keeping line breaks and delimiters. */
export function maskTypeScript(source) {
  // Invariant: index by UTF-16 code unit, as `source[i]` does, so astral characters keep positions aligned.
  const out = source.split("");
  const blank = (from, to) => { for (let i = from; i < to; i++) if (out[i] !== "\n") out[i] = " "; };
  const templateDepths = [];
  let braceDepth = 0;
  let lastSignificant = "";
  let lastWord = "";
  let i = 0;
  const readTemplate = start => {
    let j = start;
    while (j < source.length) {
      if (source[j] === "\\") { j += 2; continue; }
      if (source[j] === "`") { blank(start, j); return { end: j + 1, open: false }; }
      if (source[j] === "$" && source[j + 1] === "{") { blank(start, j); return { end: j + 2, open: true }; }
      j++;
    }
    throw new Error("unterminated template literal");
  };
  while (i < source.length) {
    const c = source[i];
    const next = source[i + 1];
    if (c === "/" && next === "/") {
      const end = source.indexOf("\n", i);
      const stop = end < 0 ? source.length : end;
      blank(i, stop);
      i = stop;
      continue;
    }
    if (c === "/" && next === "*") {
      const end = source.indexOf("*/", i + 2);
      if (end < 0) throw new Error("unterminated block comment");
      blank(i, end + 2);
      i = end + 2;
      continue;
    }
    if (c === "'" || c === "\"") {
      let j = i + 1;
      while (j < source.length && source[j] !== c) {
        if (source[j] === "\\") j++;
        else if (source[j] === "\n") throw new Error("unterminated string literal");
        j++;
      }
      blank(i + 1, j);
      i = j + 1;
      lastSignificant = c;
      lastWord = "";
      continue;
    }
    if (c === "`") {
      const part = readTemplate(i + 1);
      if (part.open) { templateDepths.push(braceDepth); braceDepth++; }
      i = part.end;
      lastSignificant = part.open ? "{" : "`";
      lastWord = "";
      continue;
    }
    if (c === "/" && (lastSignificant === "" || /[(,=:[!&|?{};+\-*%<>~^]/.test(lastSignificant) || REGEX_PRECEDING_WORDS.has(lastWord))) {
      let j = i + 1;
      let inClass = false;
      while (j < source.length) {
        const d = source[j];
        if (d === "\\") { j += 2; continue; }
        if (d === "\n") throw new Error("unterminated regular expression");
        if (d === "[") inClass = true;
        else if (d === "]") inClass = false;
        else if (d === "/" && !inClass) break;
        j++;
      }
      blank(i + 1, j);
      i = j + 1;
      lastSignificant = "/";
      lastWord = "";
      continue;
    }
    if (c === "{") braceDepth++;
    if (c === "}") {
      braceDepth--;
      if (templateDepths.length > 0 && templateDepths.at(-1) === braceDepth) {
        templateDepths.pop();
        const part = readTemplate(i + 1);
        if (part.open) { templateDepths.push(braceDepth); braceDepth++; }
        i = part.end;
        lastSignificant = part.open ? "{" : "`";
        lastWord = "";
        continue;
      }
    }
    if (/[\w$]/.test(c)) {
      let j = i;
      while (j < source.length && /[\w$]/.test(source[j])) j++;
      lastWord = source.slice(i, j);
      lastSignificant = "a";
      i = j;
      continue;
    }
    if (!/\s/.test(c)) { lastSignificant = c; lastWord = ""; }
    i++;
  }
  return out.join("");
}

/** Replaces Rust string, character, and comment contents with spaces, keeping line breaks and delimiters. */
export function maskRust(source) {
  const out = source.split("");
  const blank = (from, to) => { for (let i = from; i < to; i++) if (out[i] !== "\n") out[i] = " "; };
  let i = 0;
  while (i < source.length) {
    const c = source[i];
    const next = source[i + 1];
    if (c === "/" && next === "/") {
      const end = source.indexOf("\n", i);
      const stop = end < 0 ? source.length : end;
      blank(i, stop);
      i = stop;
      continue;
    }
    if (c === "/" && next === "*") {
      let depth = 1;
      let j = i + 2;
      while (j < source.length && depth > 0) {
        if (source[j] === "/" && source[j + 1] === "*") { depth++; j += 2; }
        else if (source[j] === "*" && source[j + 1] === "/") { depth--; j += 2; }
        else j++;
      }
      if (depth > 0) throw new Error("unterminated block comment");
      blank(i, j);
      i = j;
      continue;
    }
    const raw = /^b?r(#*)"/.exec(source.slice(i, i + 64));
    if (raw && (i === 0 || !/[\w]/.test(source[i - 1]))) {
      const terminator = `"${raw[1]}`;
      const start = i + raw[0].length;
      const end = source.indexOf(terminator, start);
      if (end < 0) throw new Error("unterminated raw string literal");
      blank(start, end);
      i = end + terminator.length;
      continue;
    }
    if (c === "\"") {
      let j = i + 1;
      while (j < source.length && source[j] !== "\"") j += source[j] === "\\" ? 2 : 1;
      if (j >= source.length) throw new Error("unterminated string literal");
      blank(i + 1, j);
      i = j + 1;
      continue;
    }
    if (c === "'") {
      if (next === "\\") {
        const end = source.indexOf("'", i + 3);
        if (end < 0) throw new Error("unterminated character literal");
        blank(i + 1, end);
        i = end + 1;
        continue;
      }
      const codePoint = source.codePointAt(i + 1);
      const width = codePoint !== undefined && codePoint > 0xffff ? 2 : 1;
      if (codePoint !== undefined && source[i + 1 + width] === "'") {
        blank(i + 1, i + 1 + width);
        i += 2 + width;
        continue;
      }
    }
    i++;
  }
  return out.join("");
}

function rustScopeName(kind, rest) {
  if (kind === "mod" || kind === "trait") return /^\s*(\w+)/.exec(rest)?.[1] ?? null;
  let body = rest.trimStart();
  if (body.startsWith("<")) {
    let depth = 0;
    let j = 0;
    for (; j < body.length; j++) {
      if (body[j] === "<") depth++;
      else if (body[j] === ">" && --depth === 0) break;
    }
    body = body.slice(j + 1);
  }
  const forIndex = body.search(/\sfor\s/);
  if (forIndex >= 0) body = body.slice(forIndex + 5);
  const path = /^\s*(?:dyn\s+)?([\w:]+)/.exec(body)?.[1];
  return path ? path.split("::").at(-1) : null;
}

/**
 * Measures one masked source. Returns the classes (TypeScript only) with method and field counts and
 * every function or method with its inclusive line count, keyed `<path>::<Scope>.<name>` for
 * TypeScript and `<path>::<Type>::<name>` for Rust; a repeated key gains `#2`, `#3`, ...
 */
export function measureSource(path, source) {
  const rust = path.endsWith(".rs");
  const masked = rust ? maskRust(source) : maskTypeScript(source);
  const lines = masked.split("\n");
  const classes = [];
  const functions = [];
  const scopes = [];
  const seen = new Map();
  const uniqueKey = key => {
    const count = (seen.get(key) ?? 0) + 1;
    seen.set(key, count);
    return count === 1 ? key : `${key}#${count}`;
  };
  let depth = 0;
  let parenDepth = 0;
  let pending = null;
  let testAttribute = false;
  const excluded = () => scopes.some(scope => scope.excluded);
  for (let index = 0; index < lines.length; index++) {
    const line = lines[index];
    const enclosing = scopes.at(-1);
    if (!pending && parenDepth === 0) {
      if (rust) {
        if (/^\s*#\[cfg\(test\)\]/.test(line)) testAttribute = true;
        const scopeMatch = RUST_SCOPE.exec(line);
        const fnMatch = RUST_FN.exec(line);
        if (fnMatch) {
          pending = { kind: "function", name: fnMatch[1], start: index, depth, excluded: testAttribute };
          testAttribute = false;
        } else if (scopeMatch) {
          pending = { kind: scopeMatch[1], name: rustScopeName(scopeMatch[1], scopeMatch[2]), start: index, depth, excluded: testAttribute };
          testAttribute = false;
        } else if (/\S/.test(line) && !/^\s*#/.test(line)) testAttribute = false;
      } else if (enclosing?.kind === "class" && depth === enclosing.depth + 1) {
        const method = TS_METHOD.exec(line);
        const field = method ? null : TS_FIELD.exec(line);
        if (method && !/^\s*(?:if|for|while|switch|return|catch)\b/.test(line)) {
          enclosing.methods++;
          pending = { kind: "function", name: method[1], start: index, depth, excluded: false };
        } else if (field) enclosing.fields++;
      } else if (depth === 0) {
        const classMatch = TS_CLASS.exec(line);
        const fnMatch = classMatch ? null : TS_FUNCTION.exec(line);
        if (classMatch) pending = { kind: "class", name: classMatch[1], start: index, depth, excluded: false, methods: 0, fields: 0 };
        else if (fnMatch) pending = { kind: "function", name: fnMatch[1], start: index, depth, excluded: false };
      }
    }
    for (const c of line) {
      if (c === "(") parenDepth++;
      else if (c === ")") parenDepth = Math.max(0, parenDepth - 1);
      else if (c === ";" && pending && depth === pending.depth && parenDepth === 0) pending = null;
      else if (c === "{") {
        if (pending && depth === pending.depth && parenDepth === 0) {
          scopes.push({ ...pending, depth, excluded: pending.excluded || excluded() });
          pending = null;
        }
        depth++;
      } else if (c === "}") {
        depth--;
        if (depth < 0) throw new Error(`${path}:${index + 1}: unbalanced closing brace`);
        if (scopes.length > 0 && scopes.at(-1).depth === depth) {
          const scope = scopes.pop();
          if (scope.excluded) continue;
          const owner = scopes.filter(entry => entry.kind !== "function" && entry.name).map(entry => entry.name).at(-1);
          if (scope.kind === "class") classes.push({ key: uniqueKey(`${path}::${scope.name}`), methods: scope.methods, fields: scope.fields });
          else if (scope.kind === "function") {
            const name = owner ? (rust ? `${owner}::${scope.name}` : `${owner}.${scope.name}`) : scope.name;
            functions.push({ key: uniqueKey(`${path}::${name}`), lines: index - scope.start + 1 });
          }
        }
      }
    }
  }
  if (depth !== 0) throw new Error(`${path}: unbalanced braces at end of file`);
  return { classes, functions };
}

async function sourceFiles(root, directory, accept, skip) {
  let entries;
  try {
    entries = await readdir(join(root, directory), { withFileTypes: true });
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") return [];
    throw error;
  }
  const files = [];
  for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
    const path = `${directory}/${entry.name}`;
    if (skip(path, entry)) continue;
    if (entry.isDirectory()) files.push(...await sourceFiles(root, path, accept, skip));
    else if (accept(path)) files.push(path);
  }
  return files;
}

/** Lists the measured sources: production TypeScript under `src/` and Rust under `native/<crate>/src/`, never vendored code. */
export async function sizeRatchetSources(root) {
  const typescript = await sourceFiles(root, "src", path => /\.(?:ts|tsx|mts)$/.test(path) && !path.endsWith(".d.ts"), path => TYPESCRIPT_VENDORED.test(`${path}/`));
  const crates = (await readdir(join(root, "native"), { withFileTypes: true }).catch(() => [])).filter(entry => entry.isDirectory()).map(entry => entry.name).sort();
  const native = [];
  for (const crate of crates) native.push(...await sourceFiles(root, `native/${crate}/src`, path => extname(path) === ".rs", (_path, entry) => entry.isDirectory() && entry.name === "vendor"));
  return [...typescript, ...native];
}

/** Measures every source and keeps the units above any threshold. */
export async function measureSizeRatchet(root, thresholds = SIZE_THRESHOLDS) {
  const classes = {};
  const functions = {};
  const errors = [];
  for (const path of await sizeRatchetSources(root)) {
    let measured;
    try {
      measured = measureSource(path, await readFile(join(root, ...path.split("/")), "utf8"));
    } catch (error) {
      errors.push(`${path}: size scan failed: ${error instanceof Error ? error.message : String(error)}`);
      continue;
    }
    for (const unit of measured.classes) {
      if (unit.methods > thresholds.classMethods || unit.fields > thresholds.classFields) classes[unit.key] = { methods: unit.methods, fields: unit.fields };
    }
    for (const unit of measured.functions) {
      if (unit.lines > thresholds.functionLines) functions[unit.key] = { lines: unit.lines };
    }
  }
  return { classes, functions, errors };
}

function overThreshold(kind, counts, thresholds) {
  return kind === "classes"
    ? counts.methods > thresholds.classMethods || counts.fields > thresholds.classFields
    : counts.lines > thresholds.functionLines;
}

/** Compares a measurement with the committed baseline; every returned string is one gate failure. */
export function inspectSizeRatchet(measured, baseline) {
  const errors = [...measured.errors];
  if (baseline?.schema !== SIZE_RATCHET_SCHEMA) return [...errors, `size ratchet baseline must use schema ${SIZE_RATCHET_SCHEMA}`];
  const thresholds = SIZE_THRESHOLDS;
  if (JSON.stringify(baseline.thresholds) !== JSON.stringify(SIZE_THRESHOLDS)) errors.push(`size ratchet thresholds must stay ${JSON.stringify(SIZE_THRESHOLDS)}`);
  for (const kind of ["classes", "functions"]) {
    const recorded = baseline[kind] ?? {};
    for (const [key, counts] of Object.entries(measured[kind])) {
      const entry = recorded[key];
      if (!entry) {
        const crossed = Object.entries(counts).map(([name, value]) => `${name} ${value}`).join(", ");
        errors.push(`${key}: new oversized ${kind === "classes" ? "class" : "function"} (${crossed}) exceeds the size thresholds; split it`);
        continue;
      }
      for (const [name, value] of Object.entries(counts)) {
        if (value > entry[name]) errors.push(`${key}: ${name} grew from ${entry[name]} to ${value}; the size ratchet only allows shrinking`);
      }
    }
    for (const [key, counts] of Object.entries(recorded)) {
      if (measured[kind][key]) {
        const lowered = Object.entries(measured[kind][key]).filter(([name, value]) => value < counts[name]);
        if (lowered.length > 0) errors.push(`${key}: ${lowered.map(([name, value]) => `${name} shrank to ${value}`).join(", ")}; lower the entry with node scripts/governance/update-size-ratchet.mjs`);
      } else {
        errors.push(`${key}: unit is gone or below every threshold; remove the entry with node scripts/governance/update-size-ratchet.mjs`);
      }
    }
    for (const [key, counts] of Object.entries(recorded)) {
      if (!overThreshold(kind, counts, thresholds)) errors.push(`${key}: recorded counts are below every threshold; remove the entry`);
    }
  }
  return errors;
}

/**
 * Returns the baseline lowered to the measurement: shrunk counts are lowered, vanished units are
 * removed, and nothing is ever added or raised. `seed` records every measured unit instead; it is
 * only for creating the baseline.
 */
export function ratchetSizeBaseline(measured, baseline, { seed = false } = {}) {
  const next = { schema: SIZE_RATCHET_SCHEMA, thresholds: { ...SIZE_THRESHOLDS }, classes: {}, functions: {} };
  for (const kind of ["classes", "functions"]) {
    const keys = seed ? Object.keys(measured[kind]) : Object.keys(baseline?.[kind] ?? {}).filter(key => measured[kind][key]);
    for (const key of keys.sort()) {
      const recorded = seed ? measured[kind][key] : baseline[kind][key];
      next[kind][key] = Object.fromEntries(Object.entries(recorded).map(([name, value]) => [name, Math.min(value, measured[kind][key][name])]));
    }
  }
  return next;
}
