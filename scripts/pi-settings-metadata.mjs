import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

/**
 * Reads the pinned engine's own settings presentation — label, description, and
 * the order it shows them in — instead of transcribing them by hand. A hand-kept
 * copy silently rots the first time the engine rewords or reorders anything;
 * this is regenerated and verified, so a drift fails a check rather than a user.
 *
 * The engine ids are kebab-case UI ids while the exposed settings are the
 * camelCase keys A1 reads and writes, so the pairing between them is the one
 * thing declared here. Everything else is extracted.
 */

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

/** The package blocks deep imports through exports, so the file is read by path. */
export const SETTINGS_SELECTOR_PATH =
  "node_modules/@earendil-works/pi-coding-agent/dist/modes/interactive/components/settings-selector.js";

export function settingsSelectorSource() {
  return readFileSync(fileURLToPath(new URL(`../${SETTINGS_SELECTOR_PATH}`, import.meta.url)), "utf8");
}

/** Every `{ id, label, description }` the file declares, in source order. */
function declaredItems(source) {
  const items = [];
  const pattern = /id:\s*"([a-z0-9-]+)",\s*\n?\s*label:\s*"([^"]+)",\s*\n?\s*description:\s*"([^"]*)"/g;
  for (const match of source.matchAll(pattern)) {
    items.push({ id: match[1], label: match[2], description: match[3] });
  }
  return items;
}

/**
 * The engine builds one array then splices later entries in after named ones,
 * so the presented order is neither declaration order nor alphabetical. This
 * replays those splices rather than guessing at the result.
 */
function presentedOrder(source) {
  const literal = [...source.matchAll(/id:\s*"([a-z0-9-]+)",\s*\n?\s*label:/g)].map(match => match[1]);
  const spliced = new Map();
  const anchors = [...source.matchAll(/const (\w+) = items\.findIndex\(\(item\) => item\.id === "([a-z0-9-]+)"\)/g)];
  const inserts = [...source.matchAll(/items\.splice\((\w+) \+ 1, 0, \{\s*\n?\s*id: "([a-z0-9-]+)"/g)];
  for (const [, variable, anchorId] of anchors) spliced.set(variable, anchorId);

  const order = literal.filter(id => !inserts.some(([, , insertedId]) => insertedId === id));
  for (const [, variable, insertedId] of inserts) {
    const anchorId = spliced.get(variable);
    const at = anchorId === undefined ? -1 : order.indexOf(anchorId);
    if (at < 0) order.push(insertedId);
    else order.splice(at + 1, 0, insertedId);
  }
  return order;
}

/** The flags a structured setting offers, taken from the submenu that edits them. */
function structuredFlags(source, className) {
  const start = source.indexOf(`class ${className}`);
  if (start < 0) return [];
  const end = source.indexOf("\nclass ", start + 1);
  const body = source.slice(start, end < 0 ? undefined : end);
  const flags = [];
  const pattern = /id:\s*"([a-z0-9-]+)",\s*\n?\s*label:\s*"([^"]+)",\s*\n?\s*description:\s*"([^"]*)",\s*\n?\s*currentValue:\s*\(this\.state\.(\w+) \?\? (true|false)\)/g;
  for (const match of body.matchAll(pattern)) {
    flags.push({ id: match[1], label: match[2], description: match[3], key: match[4], fallback: match[5] === "true" });
  }
  return flags;
}

/** The metadata A1 ships: wording, order, and structured flags, all extracted. */
export function extractPiSettingsMetadata() {
  const source = settingsSelectorSource();
  const items = declaredItems(source);
  const order = presentedOrder(source);

  const wording = {};
  for (const item of items) {
    const key = ID_TO_KEY[item.id];
    if (key === undefined) continue;
    wording[key] = { label: item.label, description: item.description };
  }

  return {
    order: order.map(id => ID_TO_KEY[id]).filter(key => key !== undefined),
    wording,
    structured: { warnings: structuredFlags(source, "WarningSettingsSubmenu") },
  };
}
