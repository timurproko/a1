import { existsSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { prepareTextPaste } from "./text-paste.js";
import { preparePathPresentation } from "./path-chip-presentation.js";

export interface ClipboardPath { readonly fullPath: string; readonly kind: "folder" | "file" }
export type PreparedPasteText =
  | { readonly kind: "text"; readonly text: string; readonly label?: string }
  | { readonly kind: "url"; readonly url: string; readonly label: string }
  | { readonly kind: "paths"; readonly paths: readonly ClipboardPath[] };
const URL_PATTERN = /^https?:\/\/[^\s\u0000-\u001f\u007f]+$/iu;

/** Small non-path text has a fixed CPU bound and cannot enter filesystem probing. */
export function canPreparePasteInline(text: string): boolean {
  return text.length <= 1000 && !/^(?:[A-Za-z]:\\|\/|file:\/\/|["'&])/iu.test(text.trimStart());
}

/** The shared chip classifier; interactive callers run path/filesystem probing in an isolated executor. */
export function preparePasteText(text: string, skipPaths = false, compactPaths = false): PreparedPasteText {
  const url = text.trim();
  if (URL_PATTERN.test(url)) return { kind: "url", url, label: url.length <= 40 ? url : `${url.slice(0, 40)}…` };
  const paths = skipPaths ? [] : pathsFromClipboard(text);
  if (paths.length > 0) return compactPaths ? preparePathPresentation(paths) : { kind: "paths", paths };
  return { kind: "text", ...prepareTextPaste(text) };
}

function pathsFromClipboard(text: string): ClipboardPath[] {
  const normalized = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").trim();
  if (normalized.length === 0) return [];
  const paths: ClipboardPath[] = [];
  for (const line of normalized.split("\n").filter(value => value.trim().length > 0)) {
    const wholeLine = existingClipboardPath(line);
    if (wholeLine !== null) { paths.push(wholeLine); continue; }
    const tokens = tokenizePathLine(line)?.filter(token => token.quoted || token.text !== "&");
    if (tokens === undefined || tokens.length === 0) return [];
    for (let index = 0; index < tokens.length;) {
      const token = tokens[index];
      if (token === undefined) return [];
      if (token.quoted) {
        const quoted = existingClipboardPath(token.text);
        if (quoted === null) return [];
        paths.push(quoted); index++; continue;
      }
      if (normalizePath(token.text) === null) return [];
      let runEnd = index;
      while (runEnd < tokens.length && tokens[runEnd]?.quoted !== true) runEnd++;
      let matched: ClipboardPath | null = null;
      let matchedEnd = index;
      for (let end = runEnd; end > index; end--) {
        matched = existingClipboardPath(tokens.slice(index, end).map(candidate => candidate.text).join(" "));
        if (matched !== null) { matchedEnd = end; break; }
      }
      if (matched === null) return [];
      paths.push(matched); index = matchedEnd;
    }
  }
  return paths;
}

function existingClipboardPath(value: string): ClipboardPath | null {
  const fullPath = normalizePath(unquote(value.trim()));
  if (fullPath === null || !existsSync(fullPath)) return null;
  try {
    const stat = statSync(fullPath);
    if (stat.isDirectory()) return { fullPath, kind: "folder" };
    if (stat.isFile()) return { fullPath, kind: "file" };
  } catch { /* Compatibility: unavailable paths remain ordinary text. */ }
  return null;
}
interface PathToken { readonly text: string; readonly quoted: boolean }
function tokenizePathLine(line: string): PathToken[] | undefined {
  const tokens: PathToken[] = [];
  let index = 0;
  while (index < line.length) {
    while (index < line.length && /\s/u.test(line[index] ?? "")) index++;
    if (index >= line.length) break;
    const quote = line[index] === '"' || line[index] === "'" ? line[index] : undefined;
    if (quote !== undefined) {
      index++;
      const start = index;
      while (index < line.length && line[index] !== quote) index++;
      if (index >= line.length) return undefined;
      tokens.push({ text: line.slice(start, index), quoted: true }); index++;
      if (index < line.length && !/\s/u.test(line[index] ?? "")) return undefined;
      continue;
    }
    const start = index;
    while (index < line.length && !/\s/u.test(line[index] ?? "")) index++;
    tokens.push({ text: line.slice(start, index), quoted: false });
  }
  return tokens;
}
function normalizePath(value: string): string | null {
  let candidate = value;
  if (/^file:\/\//iu.test(candidate)) {
    try { candidate = fileURLToPath(candidate); } catch { return null; }
  }
  if (process.platform === "win32") {
    const msys = /^\/([A-Za-z])\/(.*)$/u.exec(candidate);
    if (msys !== null) candidate = `${msys[1]}:\\${msys[2]?.replaceAll("/", "\\") ?? ""}`;
  }
  return /^(?:[A-Za-z]:\\|\/)/u.test(candidate) ? path.normalize(candidate) : null;
}
function unquote(value: string): string {
  let result = value.startsWith("& ") ? value.slice(2).trim() : value;
  if ((result.startsWith('"') && result.endsWith('"')) || (result.startsWith("'") && result.endsWith("'"))) result = result.slice(1, -1).trim();
  return result;
}
