import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import { dirname, extname, resolve, sep } from "node:path";
import { promisify } from "node:util";
import ts from "typescript";

const execFileAsync = promisify(execFile);

export const CODE_DOCUMENTATION_RULES = Object.freeze({
  publicClassContract: "DOC001",
  multipleJsdoc: "DOC002",
  privateJsdoc: "DOC003",
  summaryTag: "DOC004",
  implementationIntent: "DOC005",
  commentedCode: "DOC006",
  trackedFollowUp: "DOC007",
  suppressionReason: "DOC008",
  sourceClassification: "DOC009",
  synchronizedProvenance: "DOC010",
  classContractQuality: "DOC011",
});

export const IMPLEMENTATION_INTENTS = Object.freeze([
  "Invariant",
  "Rationale",
  "Security",
  "Platform",
  "Compatibility",
  "Protocol",
  "Concurrency",
  "Performance",
  "Provenance",
]);

const SCRIPT_EXTENSIONS = new Set([".ts", ".tsx", ".mts", ".cts", ".js", ".mjs", ".cjs"]);
const NATIVE_EXTENSIONS = new Set([".rs", ".zig", ".c", ".h"]);
const GENERATED_PATHS = new Set([
  "bin/pi-tui.d.ts",
  "bin/pi-tui.js",
  "src/integrations/pi/components/resources/builtin-themes.ts",
]);
const SYNCHRONIZED_PREFIXES = ["src/integrations/pi/components/upstream/"];
const VENDORED_PREFIXES = ["native/terminal-host/vendor/"];
const IGNORED_SEGMENTS = new Set(["node_modules", "dist", "target", ".artifacts", ".builds", ".worktrees", ".zig-cache", "zig-out"]);
const TRACKED_REFERENCE = /(?:#\d+|https?:\/\/\S+|\b[A-Z][A-Z0-9]+-\d+\b)/u;
const INTENT_PREFIX = new RegExp(`^(?:${IMPLEMENTATION_INTENTS.join("|")}):\\s+`, "u");
const COMMENTED_CODE = /^(?:(?:const|let|var|class|function|import|export)\s+[A-Za-z_$]|(?:if|for|while|switch|catch)\s*\(|return\s+[^.?!]+;?$|[A-Za-z_$][\w$.[\]]*\s*=\s*[^=])/u;
const SUPPRESSION = /(?:@ts-(?:ignore|expect-error)|eslint-(?:disable|disable-next-line)|(?:c8|istanbul)\s+ignore)/iu;
const EXPLAINED_SUPPRESSION = /(?:--|—|–|:)\s*\S/u;

export function normalizeCodeDocumentationPath(path) {
  return path.split(sep).join("/").replaceAll("\\", "/").replace(/^\.\//u, "");
}

export function classifyCodeDocumentationSource(rawPath) {
  const path = normalizeCodeDocumentationPath(rawPath);
  const segments = path.split("/");
  if (segments.some(segment => IGNORED_SEGMENTS.has(segment))) return "ignored";
  if (VENDORED_PREFIXES.some(prefix => path.startsWith(prefix))) return "vendored";
  if (SYNCHRONIZED_PREFIXES.some(prefix => path.startsWith(prefix))) return "synchronized";
  if (GENERATED_PATHS.has(path)) return "generated";
  const extension = extname(path);
  if (path.startsWith("native/") && NATIVE_EXTENSIONS.has(extension)) return "first-party-native";
  if (path.startsWith("src/") && SCRIPT_EXTENSIONS.has(extension)) return "first-party-production";
  if ((path.startsWith("test/") || path.startsWith("scripts/") || path.startsWith("bin/")) && SCRIPT_EXTENSIONS.has(extension)) {
    return "first-party-tooling";
  }
  if (!path.includes("/") && SCRIPT_EXTENSIONS.has(extension)) return "first-party-tooling";
  return "unmatched";
}

export async function loadTrackedCodeDocumentationSources(repository) {
  const root = resolve(repository);
  const { stdout } = await execFileAsync("git", ["ls-files", "-z"], { cwd: root, encoding: "buffer", maxBuffer: 32 * 1024 * 1024 });
  const paths = stdout.toString("utf8").split("\0").filter(Boolean).map(normalizeCodeDocumentationPath);
  const sources = [];
  for (const path of paths) {
    const role = classifyCodeDocumentationSource(path);
    if (role === "unmatched" && !isCodePath(path)) continue;
    if (role === "ignored") {
      sources.push({ path, role, source: null });
      continue;
    }
    if (role === "vendored") {
      sources.push({ path, role, source: null });
      continue;
    }
    sources.push({ path, role, source: await readFile(resolve(root, path), "utf8") });
  }
  return sources;
}

export function sourceRecordsFromFiles(files) {
  return Object.entries(files).map(([path, source]) => {
    const normalized = normalizeCodeDocumentationPath(path);
    return { path: normalized, role: classifyCodeDocumentationSource(normalized), source };
  });
}

export function inspectCodeDocumentation({ sources, owners = {}, synchronizedDestinations = new Set() }) {
  const diagnostics = [];
  const records = sources.map(record => ({
    path: normalizeCodeDocumentationPath(record.path),
    role: record.role ?? classifyCodeDocumentationSource(record.path),
    source: record.source,
  }));

  for (const record of records) {
    if (record.role === "unmatched" && isCodePath(record.path)) {
      diagnostics.push(diagnostic(CODE_DOCUMENTATION_RULES.sourceClassification, record.path, 1, 1, null, "tracked code has no documentation source role"));
      continue;
    }
    if (record.role === "synchronized" && !synchronizedDestinations.has(record.path) && !/Source-synchronized from/u.test(record.source ?? "")) {
      diagnostics.push(diagnostic(CODE_DOCUMENTATION_RULES.synchronizedProvenance, record.path, 1, 1, null, "synchronized source has no declared provenance authority"));
    }
  }

  const scriptRecords = records.filter(record => SCRIPT_EXTENSIONS.has(extname(record.path)) && typeof record.source === "string");
  const programContext = createVirtualProgram(scriptRecords);
  inspectOwnerPublicClasses(programContext, records, owners, diagnostics);

  for (const record of records) {
    if (!isFirstParty(record.role) || typeof record.source !== "string") continue;
    if (SCRIPT_EXTENSIONS.has(extname(record.path))) {
      const sourceFile = programContext.sourceFileByPath.get(record.path)
        ?? ts.createSourceFile(record.path, record.source, ts.ScriptTarget.Latest, true, scriptKind(record.path));
      inspectScriptSource(record, sourceFile, diagnostics);
    } else if (record.role === "first-party-native") {
      inspectNativeSource(record, diagnostics);
    }
  }

  return [...new Map(diagnostics.map(value => [diagnosticKey(value), value])).values()].sort(compareDiagnostics);
}

export function formatCodeDocumentationDiagnostics(diagnostics) {
  if (diagnostics.length === 0) return "Code documentation governance OK: no violations.\n";
  return `${diagnostics.map(value => {
    const symbol = value.symbol ? ` ${value.symbol}` : "";
    return `${value.rule} ${value.path}:${value.line}:${value.column}${symbol}: ${value.message}`;
  }).join("\n")}\nCode documentation governance failed: ${diagnostics.length} violation${diagnostics.length === 1 ? "" : "s"}.\n`;
}

function createVirtualProgram(records) {
  const virtualRoot = resolve(process.cwd(), ".code-documentation-virtual");
  const byAbsolute = new Map();
  const pathByAbsolute = new Map();
  for (const record of records) {
    const absolute = normalizeAbsolute(resolve(virtualRoot, record.path));
    byAbsolute.set(absolute, record.source);
    pathByAbsolute.set(absolute, record.path);
  }
  const options = {
    allowJs: true,
    checkJs: false,
    module: ts.ModuleKind.NodeNext,
    moduleResolution: ts.ModuleResolutionKind.NodeNext,
    skipLibCheck: true,
    target: ts.ScriptTarget.ESNext,
  };
  const host = ts.createCompilerHost(options, true);
  const defaultFileExists = host.fileExists.bind(host);
  const defaultReadFile = host.readFile.bind(host);
  const defaultGetSourceFile = host.getSourceFile.bind(host);
  host.fileExists = file => byAbsolute.has(normalizeAbsolute(file)) || defaultFileExists(file);
  host.readFile = file => byAbsolute.get(normalizeAbsolute(file)) ?? defaultReadFile(file);
  host.getSourceFile = (file, languageVersion, onError, shouldCreateNewSourceFile) => {
    const source = byAbsolute.get(normalizeAbsolute(file));
    if (source !== undefined) return ts.createSourceFile(file, source, languageVersion, true, scriptKind(file));
    return defaultGetSourceFile(file, languageVersion, onError, shouldCreateNewSourceFile);
  };
  host.resolveModuleNames = (moduleNames, containingFile) => moduleNames.map(moduleName => {
    const virtual = resolveVirtualModule(moduleName, containingFile, byAbsolute);
    if (virtual) return virtual;
    return ts.resolveModuleName(moduleName, containingFile, options, host).resolvedModule;
  });
  const program = ts.createProgram({ rootNames: [...byAbsolute.keys()], options, host });
  const sourceFileByPath = new Map();
  for (const sourceFile of program.getSourceFiles()) {
    const path = pathByAbsolute.get(normalizeAbsolute(sourceFile.fileName));
    if (path) sourceFileByPath.set(path, sourceFile);
  }
  return { program, checker: program.getTypeChecker(), virtualRoot, sourceFileByPath, pathByAbsolute };
}

function inspectOwnerPublicClasses(context, records, owners, diagnostics) {
  const roleByPath = new Map(records.map(record => [record.path, record.role]));
  const seen = new Set();
  for (const owner of Object.values(owners)) {
    const entryPath = normalizeCodeDocumentationPath(owner.publicEntry);
    const sourceFile = context.sourceFileByPath.get(entryPath);
    if (!sourceFile) continue;
    const moduleSymbol = context.checker.getSymbolAtLocation(sourceFile);
    if (!moduleSymbol) continue;
    for (let symbol of context.checker.getExportsOfModule(moduleSymbol)) {
      if ((symbol.flags & ts.SymbolFlags.Alias) !== 0) symbol = context.checker.getAliasedSymbol(symbol);
      for (const declaration of symbol.declarations ?? []) {
        if (!ts.isClassDeclaration(declaration)) continue;
        const path = context.pathByAbsolute.get(normalizeAbsolute(declaration.getSourceFile().fileName));
        if (!path || roleByPath.get(path) !== "first-party-production") continue;
        const key = `${path}:${declaration.pos}`;
        if (seen.has(key)) continue;
        seen.add(key);
        inspectPublicClassContract(path, declaration, symbol.name, diagnostics);
      }
    }
  }
}

function inspectPublicClassContract(path, declaration, symbol, diagnostics) {
  const docs = declaration.jsDoc ?? [];
  const location = locationOf(declaration.getSourceFile(), declaration.getStart());
  if (docs.length === 0) {
    diagnostics.push(diagnostic(CODE_DOCUMENTATION_RULES.publicClassContract, path, location.line, location.column, symbol, "owner-public class requires one JSDoc responsibility contract"));
    return;
  }
  if (docs.length !== 1) return;
  const description = jsdocDescription(docs[0]);
  const normalizedSymbol = splitIdentifier(symbol).toLocaleLowerCase();
  const normalizedDescription = description.replace(/[`*_]/gu, "").trim().toLocaleLowerCase();
  const boilerplate = description.length < 20
    || !/[.!?]$/u.test(description)
    || /^(?:class for|represents an?|the class)\b/iu.test(description)
    || normalizedDescription === normalizedSymbol
    || normalizedDescription === `${normalizedSymbol}.`
    || normalizedDescription === `the ${normalizedSymbol} class.`
    || /\b(?:provides?|contains?) (?:the following )?methods?\b/iu.test(description);
  if (boilerplate) {
    diagnostics.push(diagnostic(CODE_DOCUMENTATION_RULES.classContractQuality, path, location.line, location.column, symbol, "class JSDoc must concisely describe responsibility rather than repeat structure"));
  }
}

function inspectScriptSource(record, sourceFile, diagnostics) {
  visit(sourceFile);
  const comments = groupLineComments(scanScriptComments(record.source, sourceFile), record.source);
  for (const comment of comments) inspectComment(record, sourceFile, comment, diagnostics);

  function visit(node) {
    const docs = node.jsDoc ?? [];
    if (docs.length > 1) {
      const location = locationOf(sourceFile, docs[1].pos);
      diagnostics.push(diagnostic(CODE_DOCUMENTATION_RULES.multipleJsdoc, record.path, location.line, location.column, declarationName(node), "declaration has multiple consecutive JSDoc blocks"));
    }
    for (const doc of docs) {
      const raw = record.source.slice(doc.pos, doc.end);
      if (/(?:<\/?summary>|@summary\b)/iu.test(raw)) {
        const location = locationOf(sourceFile, doc.pos);
        diagnostics.push(diagnostic(CODE_DOCUMENTATION_RULES.summaryTag, record.path, location.line, location.column, declarationName(node), "summary tags are forbidden; use a direct JSDoc description"));
      }
    }
    if (isPrivateOrProtectedMember(node) && docs.length > 0) {
      const location = locationOf(sourceFile, docs[0].pos);
      diagnostics.push(diagnostic(CODE_DOCUMENTATION_RULES.privateJsdoc, record.path, location.line, location.column, declarationName(node), "private or protected member must not use JSDoc"));
    }
    ts.forEachChild(node, visit);
  }
}

function inspectNativeSource(record, diagnostics) {
  const sourceFile = ts.createSourceFile(record.path, record.source, ts.ScriptTarget.Latest, true, ts.ScriptKind.Unknown);
  for (const comment of groupLineComments(scanNativeComments(record.source), record.source)) {
    inspectComment(record, sourceFile, comment, diagnostics);
  }
}

function inspectComment(record, sourceFile, comment, diagnostics) {
  const body = commentBody(comment.text);
  const location = locationOf(sourceFile, comment.start);
  if (comment.text.startsWith("/**")) {
    if (/(?:<\/?summary>|@summary\b)/iu.test(comment.text)) {
      diagnostics.push(diagnostic(CODE_DOCUMENTATION_RULES.summaryTag, record.path, location.line, location.column, null, "summary tags are forbidden; use a direct JSDoc description"));
    }
    return;
  }
  if (record.role === "first-party-native" && /^\/\/[\//!]/u.test(comment.text)) return;
  if (!body) return;
  if (/\b(?:TODO|FIXME)\b/iu.test(body)) {
    if (!TRACKED_REFERENCE.test(body)) {
      diagnostics.push(diagnostic(CODE_DOCUMENTATION_RULES.trackedFollowUp, record.path, location.line, location.column, null, "TODO or FIXME must reference a tracked issue"));
    }
    return;
  }
  if (SUPPRESSION.test(body)) {
    if (/@ts-ignore\b/iu.test(body) || !EXPLAINED_SUPPRESSION.test(body)) {
      diagnostics.push(diagnostic(CODE_DOCUMENTATION_RULES.suppressionReason, record.path, location.line, location.column, null, "suppression is forbidden or has no safety reason"));
    }
    return;
  }
  const intent = body.match(INTENT_PREFIX);
  const subject = intent ? body.slice(intent[0].length).trim() : body;
  if (COMMENTED_CODE.test(subject)) {
    diagnostics.push(diagnostic(CODE_DOCUMENTATION_RULES.commentedCode, record.path, location.line, location.column, null, "comment appears to contain disabled code or control-flow narration"));
  }
  if (!intent) {
    diagnostics.push(diagnostic(CODE_DOCUMENTATION_RULES.implementationIntent, record.path, location.line, location.column, null, `implementation comment must start with one of: ${IMPLEMENTATION_INTENTS.join(", ")}`));
  }
}

function scanScriptComments(source, sourceFile) {
  const byStart = new Map();
  visit(sourceFile);
  return [...byStart.values()].sort((left, right) => left.start - right.start);

  function visit(node) {
    add(ts.getLeadingCommentRanges(source, node.pos));
    add(ts.getTrailingCommentRanges(source, node.end));
    for (const child of node.getChildren(sourceFile)) visit(child);
  }

  function add(ranges) {
    for (const range of ranges ?? []) {
      if (byStart.has(range.pos)) continue;
      byStart.set(range.pos, {
        start: range.pos,
        end: range.end,
        text: source.slice(range.pos, range.end),
        line: range.kind === ts.SyntaxKind.SingleLineCommentTrivia,
      });
    }
  }
}

function scanNativeComments(source) {
  const comments = [];
  let index = 0;
  while (index < source.length) {
    const raw = rawStringAt(source, index);
    if (raw) { index = raw; continue; }
    const character = source[index];
    if (character === '"') { index = quotedEnd(source, index, '"'); continue; }
    if (character === "'" && isCharacterLiteral(source, index)) { index = quotedEnd(source, index, "'"); continue; }
    if (source.startsWith("//", index)) {
      const end = source.indexOf("\n", index);
      const actualEnd = end < 0 ? source.length : end;
      comments.push({ start: index, end: actualEnd, text: source.slice(index, actualEnd), line: true });
      index = actualEnd;
      continue;
    }
    if (source.startsWith("/*", index)) {
      let depth = 1;
      let end = index + 2;
      while (end < source.length && depth > 0) {
        if (source.startsWith("/*", end)) { depth += 1; end += 2; }
        else if (source.startsWith("*/", end)) { depth -= 1; end += 2; }
        else end += 1;
      }
      comments.push({ start: index, end, text: source.slice(index, end), line: false });
      index = end;
      continue;
    }
    index += 1;
  }
  return comments;
}

function groupLineComments(comments, source) {
  const grouped = [];
  for (const comment of comments) {
    const previous = grouped.at(-1);
    const gap = previous ? source.slice(previous.end, comment.start) : "";
    if (previous?.line && comment.line && /^\r?\n[\t ]*$/u.test(gap) && !startsPolicyComment(comment.text)) {
      previous.end = comment.end;
      previous.text += `\n${comment.text}`;
    } else grouped.push({ ...comment });
  }
  return grouped;
}

function startsPolicyComment(text) {
  const body = commentBody(text);
  return INTENT_PREFIX.test(body) || /\b(?:TODO|FIXME)\b/iu.test(body) || SUPPRESSION.test(body);
}

function commentBody(text) {
  return text
    .replace(/^\/\/+\s?/gmu, "")
    .replace(/^\/\*+\s?/u, "")
    .replace(/\*\/$/u, "")
    .replace(/^\s*\*\s?/gmu, "")
    .replace(/\s+/gu, " ")
    .trim();
}

function rawStringAt(source, index) {
  const match = /^(?:br|rb|r)(#+)?"/u.exec(source.slice(index));
  if (!match) return 0;
  const hashes = match[1] ?? "";
  const close = `"${hashes}`;
  const end = source.indexOf(close, index + match[0].length);
  return end < 0 ? source.length : end + close.length;
}

function quotedEnd(source, index, quote) {
  let at = index + 1;
  while (at < source.length) {
    if (source[at] === "\\") at += 2;
    else if (source[at] === quote) return at + 1;
    else at += 1;
  }
  return source.length;
}

function isCharacterLiteral(source, index) {
  const next = source[index + 1];
  if (next === "\\") return source[index + 3] === "'" || source[index + 4] === "'";
  return next !== undefined && source[index + 2] === "'";
}

function isPrivateOrProtectedMember(node) {
  if (!node.parent || !ts.isClassDeclaration(node.parent) && !ts.isClassExpression(node.parent)) return false;
  if (node.name && ts.isPrivateIdentifier(node.name)) return true;
  return node.modifiers?.some(modifier => modifier.kind === ts.SyntaxKind.PrivateKeyword || modifier.kind === ts.SyntaxKind.ProtectedKeyword) ?? false;
}

function jsdocDescription(doc) {
  if (typeof doc.comment === "string") return doc.comment.trim();
  if (Array.isArray(doc.comment)) return doc.comment.map(part => part.text ?? "").join("").trim();
  return "";
}

function declarationName(node) {
  return node.name?.getText?.() ?? null;
}

function splitIdentifier(value) {
  return value.replace(/([a-z\d])([A-Z])/gu, "$1 $2").replace(/[_-]+/gu, " ");
}

function resolveVirtualModule(moduleName, containingFile, byAbsolute) {
  if (!moduleName.startsWith(".")) return null;
  const unresolved = resolve(dirname(containingFile), moduleName);
  const candidates = [unresolved];
  if (/\.js$/iu.test(unresolved)) candidates.unshift(unresolved.slice(0, -3) + ".ts", unresolved.slice(0, -3) + ".tsx");
  if (/\.mjs$/iu.test(unresolved)) candidates.unshift(unresolved.slice(0, -4) + ".mts");
  if (/\.cjs$/iu.test(unresolved)) candidates.unshift(unresolved.slice(0, -4) + ".cts");
  for (const candidate of candidates) {
    if (!byAbsolute.has(normalizeAbsolute(candidate))) continue;
    const extension = extname(candidate).toLowerCase();
    return {
      resolvedFileName: candidate,
      extension: extension === ".tsx" ? ts.Extension.Tsx
        : extension === ".js" || extension === ".mjs" || extension === ".cjs" ? ts.Extension.Js
          : ts.Extension.Ts,
      isExternalLibraryImport: false,
    };
  }
  return null;
}

function scriptKind(path) {
  const extension = extname(path).toLowerCase();
  if (extension === ".js" || extension === ".mjs" || extension === ".cjs") return ts.ScriptKind.JS;
  if (extension === ".tsx") return ts.ScriptKind.TSX;
  return ts.ScriptKind.TS;
}

function isFirstParty(role) {
  return role === "first-party-production" || role === "first-party-tooling" || role === "first-party-native";
}

function isCodePath(path) {
  const extension = extname(path);
  return SCRIPT_EXTENSIONS.has(extension) || NATIVE_EXTENSIONS.has(extension);
}

function normalizeAbsolute(path) {
  return normalizeCodeDocumentationPath(resolve(path)).toLocaleLowerCase();
}

function locationOf(sourceFile, position) {
  const location = sourceFile.getLineAndCharacterOfPosition(Math.max(0, position));
  return { line: location.line + 1, column: location.character + 1 };
}

function diagnostic(rule, path, line, column, symbol, message) {
  return { rule, path, line, column, symbol, message };
}

function diagnosticKey(value) {
  return `${value.rule}\0${value.path}\0${value.line}\0${value.column}\0${value.symbol ?? ""}`;
}

function compareDiagnostics(left, right) {
  return left.path.localeCompare(right.path)
    || left.line - right.line
    || left.column - right.column
    || left.rule.localeCompare(right.rule)
    || (left.symbol ?? "").localeCompare(right.symbol ?? "");
}
