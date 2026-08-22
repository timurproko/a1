import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

/**
 * Reads the pinned engine's own settings presentation — wording, order, offered
 * values, and which entries open a dialog — instead of transcribing it by hand.
 * A hand-kept copy rots the first time the engine rewords or reorders anything;
 * this is regenerated and verified, so drift fails a check rather than a user.
 *
 * The engine's ids are kebab-case UI ids while the exposed settings are the
 * camelCase keys A1 reads and writes, so that pairing is the one thing declared
 * here. Everything else is extracted.
 */

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
  thinking: "thinkingLevel",
  "tui-mode": "tuiMode",
  "fullscreen-exit-output": "fullscreenExitOutput",
  "fullscreen-scrollbar": "fullscreenScrollbar",
  theme: "theme",
});

export function settingsSelectorSource() {
  return readFileSync(fileURLToPath(new URL(`../${SETTINGS_SELECTOR_PATH}`, import.meta.url)), "utf8");
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

function describedItems(source) {
  return itemChunks(source).map(chunk => {
    const description = /description:\s*"([^"]*)"/.exec(chunk.body)?.[1] ?? "";
    // An entry either offers a value list or opens its own dialog. That is the
    // engine's own distinction rather than a guess from the value's type.
    const opensDialog = /\bsubmenu:/.test(chunk.body);
    const values = [...(/values:\s*\[([^\]]*)\]/.exec(chunk.body)?.[1] ?? "").matchAll(/"([^"]*)"/g)]
      .map(match => match[1]);
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
  // Submenu classes declare items of their own earlier in the file, so the main
  // list has to be isolated first: a fixed-index splice counts from its start.
  const region = source.slice(source.lastIndexOf("const items = ["));
  const firstSplice = region.indexOf("items.splice(");
  const literalRegion = firstSplice < 0 ? region : region.slice(0, firstSplice);
  const declared = itemChunks(literalRegion).map(chunk => chunk.id);
  const inserts = [...region.matchAll(/items\.splice\(([^,]+),\s*0,\s*\{\s*\n?\s*id:\s*"([a-z0-9-]+)"/g)]
    .map(match => {
      const expression = (match[1] ?? "").trim();
      // A position is a number, a named index plus one, or a ternary choosing
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

export function settingsManagerSource() {
  return readFileSync(fileURLToPath(new URL(`../${SETTINGS_MANAGER_PATH}`, import.meta.url)), "utf8");
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

export function extractPiSettingsMetadata() {
  const source = settingsSelectorSource();
  const byId = new Map(describedItems(source).map(item => [item.id, item]));

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

  return {
    order: presentedOrder(source).map(id => ID_TO_KEY[id]).filter(key => key !== undefined),
    settings,
    dialogs: { warnings: dialogFlags(source, "WarningSettingsSubmenu") },
    bounds: numericBounds(settingsManagerSource()),
  };
}
