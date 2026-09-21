import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

// Provenance: metadata is extracted from the pinned engine's settings presentation.
// Only its kebab-case UI ids to A1 camelCase keys are declared locally.

/** The package blocks deep imports through its exports map, so this is read by path. */
export const SETTINGS_SELECTOR_PATH =
  "node_modules/@earendil-works/pi-coding-agent/dist/modes/interactive/components/settings-selector.js";

const ID_TO_KEY = Object.freeze({
  autocompact: "autoCompact",
  "show-images": "showImages",
  "image-width-cells": "imageWidthCells",
  "auto-resize-images": "autoResizeImages",
  "block-images": "blockImages",
  "skill-commands": "enableSkillCommands",
  "show-hardware-cursor": "showHardwareCursor",
  "editor-padding": "editorPaddingX",
  "output-padding": "outputPad",
  "autocomplete-max-visible": "autocompleteMaxVisible",
  "clear-on-shrink": "clearOnShrink",
  "terminal-progress": "showTerminalProgress",
  "steering-mode": "steeringMode",
  "follow-up-mode": "followUpMode",
  transport: "transport",
  "http-idle-timeout": "httpIdleTimeoutMs",
  "cache-warming-mode": "cacheWarmingMode",
  "hide-thinking": "hideThinkingBlock",
  "mermaid-rendering": "mermaidRenderingMode",
  "cache-miss-notices": "showCacheMissNotices",
  "collapse-changelog": "collapseChangelog",
  "quiet-startup": "quietStartup",
  "install-telemetry": "enableInstallTelemetry",
  "default-project-trust": "defaultProjectTrust",
  "double-escape-action": "doubleEscapeAction",
  "tree-filter-mode": "treeFilterMode",
  warnings: "warnings",
  "model-thinking": "modelThinkingLevels",
  "tui-mode": "tuiMode",
  "fullscreen-exit-output": "fullscreenExitOutput",
  "fullscreen-scrollbar": "fullscreenScrollbar",
  "fullscreen-copy-on-select": "fullscreenCopyOnSelect",
  theme: "theme",
});

/** `packagesRoot` reads another installation's `node_modules`; the default is this repository's. */
export function settingsSelectorSource(packagesRoot) {
  return readFileSync(installedPath(SETTINGS_SELECTOR_PATH, packagesRoot), "utf8");
}

function installedPath(path, packagesRoot) {
  if (packagesRoot === undefined) return fileURLToPath(new URL(`../../${path}`, import.meta.url));
  return join(packagesRoot, path.slice("node_modules/".length));
}

const ITEM_START = /\bid:\s*"([a-z0-9-]+)",\s*\n?\s*label:\s*"([^"]+)"/g;

/** Splits the source into one chunk per declared item, keeping source order. */
function itemChunks(source) {
  const starts = [...source.matchAll(ITEM_START)];
  return starts.map((match, index) => {
    const from = match.index ?? 0;
    const next = index + 1 < starts.length ? starts[index + 1].index : undefined;
    return { id: match[1], label: match[2], body: source.slice(from, next ?? from + 900) };
  });
}

/**
 * The keys of a declared map, in the order it declares them. The engine words
 * some settings through such a map, offering the wording while storing the key.
 */
function mapKeys(source, name) {
  const start = source.indexOf(`const ${name} = {`);
  if (start < 0) return [];
  const end = source.indexOf("};", start);
  const body = source.slice(start, end < 0 ? undefined : end);
  return [...body.matchAll(/^\s*(\w+):/gm)].map(match => match[1]);
}

/** The string members of a declared constant array, in the order the engine declares them. */
function constArray(sources, name) {
  for (const source of sources) {
    const match = new RegExp(`const ${name}\\s*=\\s*\\[([^\\]]*)\\]`).exec(source);
    if (!match) continue;
    const members = [...match[1].matchAll(/"([^"]*)"/g)].map(entry => entry[1]);
    if (members.length > 0) return members;
  }
  return [];
}

/**
 * The item's own description, which the engine writes as a plain string or as a template whose
 * interpolations name keybinding hints. A sentence that needs a hint is dropped rather than shown
 * with a hole in it; the nested steps of a stepped submenu describe themselves later in the chunk.
 */
function itemDescription(body) {
  const match = /description:\s*(?:"([^"]*)"|`([^`]*)`)/.exec(body);
  if (!match) return "";
  if (match[1] !== undefined) return match[1];
  return (match[2] ?? "").split(/(?<=\.)\s+/).filter(sentence => !sentence.includes("${")).join(" ").trim();
}

function describedItems(source, imported = "") {
  return itemChunks(source).map(chunk => {
    const description = itemDescription(chunk.body);
    // Invariant: an entry either offers a value list or opens its own dialog. That is the
    // engine's own distinction rather than a guess from the value's type.
    const opensDialog = /\bsubmenu:/.test(chunk.body);
    const listed = [...(/values:\s*\[([^\]]*)\]/.exec(chunk.body)?.[1] ?? "").matchAll(/"([^"]*)"/g)]
      .map(match => match[1]);
    // Protocol: a map's keys are what the engine stores; its values are only how it words them.
    const fromMap = /values:\s*Object\.values\((\w+)\)/.exec(chunk.body)?.[1];
    // Protocol: the engine also spreads a named constant array, which it may declare in the
    // settings file rather than the selector; an unresolved name offers nothing rather than guessing.
    const fromSpread = /values:\s*\[\s*\.\.\.(\w+)\s*,?\s*\]/.exec(chunk.body)?.[1];
    const values = listed.length > 0
      ? listed
      : fromMap !== undefined
        ? mapKeys(source, fromMap)
        : fromSpread === undefined ? [] : constArray([source, imported], fromSpread);
    const literalValue = /currentValue:\s*"([^"]+)"/.exec(chunk.body)?.[1];
    return { id: chunk.id, label: chunk.label, description, opensDialog, values, literalValue };
  });
}

/**
 * The engine builds one array and then splices further entries in, some at a
 * fixed index and some after a named entry, all conditionally. Replaying those
 * splices in the order it performs them is the only way to get what it presents.
 */
function presentedOrder(source) {
  // Invariant: submenu classes declare items of their own earlier in the file, so the main
  // list has to be isolated first: a fixed-index splice counts from its start.
  const region = source.slice(source.lastIndexOf("const items = ["));
  const firstSplice = region.indexOf("items.splice(");
  const literalRegion = firstSplice < 0 ? region : region.slice(0, firstSplice);
  const declared = itemChunks(literalRegion).map(chunk => chunk.id);
  const inserts = [...region.matchAll(/items\.splice\(([^,]+),\s*0,\s*\{\s*\n?\s*id:\s*"([a-z0-9-]+)"/g)]
    .map(match => {
      const expression = (match[1] ?? "").trim();
      // Protocol: a position is a number, a named index plus one, or a ternary choosing
      // between two positions. A1 exposes the image settings unconditionally, so
      // a conditional position takes the branch where they are present.
      const chosen = expression.includes("?")
        ? (expression.split("?")[1] ?? "").split(":")[0] ?? ""
        : expression;
      const [target, plus] = chosen.trim().split(/\s*\+\s*/);
      return {
        at: match.index ?? 0,
        target: (target ?? "").trim(),
        offset: plus === undefined ? 0 : (Number.parseInt(plus, 10) || 0),
        id: match[2],
      };
    })
    .sort((left, right) => left.at - right.at);
  const anchors = new Map(
    [...source.matchAll(/const (\w+) = items\.findIndex\(\(item\) => item\.id === "([a-z0-9-]+)"\)/g)]
      .map(match => [match[1], match[2]]),
  );

  const inserted = new Set(inserts.map(insert => insert.id));
  const order = declared.filter(id => !inserted.has(id));
  for (const insert of inserts) {
    const numeric = Number.parseInt(insert.target, 10);
    if (Number.isInteger(numeric)) {
      order.splice(numeric + insert.offset, 0, insert.id);
      continue;
    }
    const anchorId = anchors.get(insert.target);
    const at = anchorId === undefined ? -1 : order.indexOf(anchorId);
    if (at < 0) order.push(insert.id);
    else order.splice(at + insert.offset, 0, insert.id);
  }
  return order;
}

/**
 * The flags a dialog-backed setting offers. Taken from the submenu that edits
 * them, because the engine declares the full set and defaults an unset flag —
 * deriving the list from whatever happens to be stored would show nothing at all
 * until the user had already changed something.
 */
function dialogFlags(source, className) {
  const start = source.indexOf(`class ${className}`);
  if (start < 0) return [];
  const end = source.indexOf("\nclass ", start + 1);
  const body = source.slice(start, end < 0 ? undefined : end);
  return itemChunks(body).map(chunk => ({
    id: chunk.id,
    label: chunk.label,
    description: /description:\s*"([^"]*)"/.exec(chunk.body)?.[1] ?? "",
    key: /currentValue:\s*\(this\.state\.(\w+)/.exec(chunk.body)?.[1] ?? chunk.id,
    fallback: /\?\?\s*true\)/.test(chunk.body),
  }));
}

/** The engine's own settings file, where it clamps what a number may be. */
export const SETTINGS_MANAGER_PATH = "node_modules/@earendil-works/pi-coding-agent/dist/core/settings-manager.js";

export function settingsManagerSource(packagesRoot) {
  return readFileSync(installedPath(SETTINGS_MANAGER_PATH, packagesRoot), "utf8");
}

/**
 * What each numeric setting may hold. The engine writes its own limits as a
 * clamp on the way in, so a surface that offers a value outside them is offering
 * something that will be quietly changed underneath the reader.
 */
export function numericBounds(source) {
  const bounds = {};
  const pattern = /this\.globalSettings(?:\.\w+)*\.(\w+)\s*=\s*Math\.max\((-?\d+),\s*(?:Math\.min\((-?\d+),)?/g;
  for (const match of source.matchAll(pattern)) {
    const entry = { minimum: Number.parseInt(match[2], 10) };
    if (match[3] !== undefined) entry.maximum = Number.parseInt(match[3], 10);
    bounds[match[1]] = entry;
  }
  return bounds;
}

export function extractPiSettingsMetadata(packagesRoot) {
  const source = settingsSelectorSource(packagesRoot);
  const manager = settingsManagerSource(packagesRoot);
  const byId = new Map(describedItems(source, manager).map(item => [item.id, item]));

  const settings = {};
  for (const [id, key] of Object.entries(ID_TO_KEY)) {
    const item = byId.get(id);
    if (item === undefined) continue;
    settings[key] = {
      label: item.label,
      description: item.description,
      opensDialog: item.opensDialog,
      ...(item.values.length > 0 ? { values: item.values } : {}),
      ...(item.literalValue === undefined ? {} : { literalValue: item.literalValue }),
    };
  }

  const presented = presentedOrder(source).map(id => ID_TO_KEY[id]).filter(key => key !== undefined);
  return {
    // Provenance: what the engine presents, in its order. A1's exposed set is checked
    // against this, so a setting it adds or renames fails a test by name.
    presented,
    order: presented,
    settings,
    dialogs: { warnings: dialogFlags(source, "WarningSettingsSubmenu") },
    bounds: numericBounds(settingsManagerSource(packagesRoot)),
  };
}
