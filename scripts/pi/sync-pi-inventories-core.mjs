/**
 * Re-resolves the three pinned-Pi inventories against upstream source text, in memory. The CLI in
 * `sync-pi-inventories.mjs` supplies the installed packages; tests supply synthetic sources.
 * `modal-surface-inventory.json` and `presenter-ownership-inventory.json` anchor nodes, edges,
 * presenters, and commands to source snippets; `pinned-pi-interactive-baseline.json` anchors
 * behaviors to line ranges of pinned TypeScript sources and records source hashes and manifests.
 * An anchor that no longer matches exactly is re-resolved to the first line that matches it ignoring whitespace;
 * an anchor that matches nowhere marks its entry `orphaned`; a component the modal inventory has
 * never recorded is reported as unmapped. A behavior's line range moves only when it no longer
 * contains every anchor, and then to the span of its named symbols widened to the anchors.
 */
import { createHash } from "node:crypto";

/**
 * @param {object} input
 * @param {{ modal: any; presenters: any; behaviors: any }} input.inventories parsed inventory files; mutated in place
 * @param {Record<string, string>} input.modalSources source text by the modal inventory's source id
 * @param {string} input.presenterSource the presenter inventory's upstream artifact text
 * @param {Map<string, string>} input.behaviorSources pinned TypeScript source by provenance record id
 * @param {readonly string[]} input.componentFiles JavaScript file names under `modes/interactive/components`
 * @param {string} input.version the installed coding-agent version
 * @param {string} input.commit the upstream commit to record
 * @param {Record<string, { version: string; integrity: string }>} input.lockPackages lockfile identity by package name
 */
export function syncInventories({ inventories, modalSources, presenterSource, behaviorSources, componentFiles, version, commit, lockPackages }) {
  const before = JSON.stringify(inventories);
  const report = {
    version,
    commit,
    modal: { reanchored: [], orphaned: [], unmappedComponents: [] },
    presenters: { reanchored: [], orphaned: [] },
    behaviors: { reanchored: [], moved: [], orphaned: [], manifests: [] },
  };
  syncModal(inventories.modal, modalSources, componentFiles, version, commit, report.modal);
  syncPresenters(inventories.presenters, presenterSource, version, commit, report.presenters);
  syncBehaviors(inventories.behaviors, behaviorSources, commit, lockPackages, report.behaviors);
  const blocking = [
    ...report.modal.orphaned.map(id => `modal ${id}: orphaned`),
    ...report.modal.unmappedComponents.map(name => `modal component ${name}: unmapped`),
    ...report.presenters.orphaned.map(id => `presenter ${id}: orphaned`),
    ...report.behaviors.orphaned.map(id => `behavior ${id}: orphaned`),
  ];
  return { inventories, report, blocking, changed: JSON.stringify(inventories) !== before };
}

function syncModal(inventory, sources, componentFiles, version, commit, section) {
  inventory.pinned = { ...inventory.pinned, version, commit };
  for (const collection of ["nodes", "edges"]) {
    for (const entry of inventory[collection]) {
      const source = sources[entry.source];
      if (source === undefined) { orphan(entry, section, entry.id); continue; }
      reanchor(entry, source, section, entry.id);
    }
  }
  const present = [...componentFiles].sort();
  const recorded = inventory.components ?? present;
  inventory.components = recorded;
  section.unmappedComponents = present.filter(name => !recorded.includes(name));
}

function syncPresenters(inventory, upstream, version, commit, section) {
  inventory.pinned = { ...inventory.pinned, version, commit };
  for (const collection of ["presenters", "commands", "hiddenCommands"]) {
    for (const entry of inventory[collection]) reanchor(entry, upstream, section, entry.id ?? entry.name);
  }
}

function syncBehaviors(inventory, sources, commit, lockPackages, section) {
  inventory.upstream = {
    ...inventory.upstream,
    commit,
    packages: inventory.upstream.packages.map(pkg => {
      const locked = lockPackages[pkg.name];
      if (!locked?.version || !locked?.integrity) throw new Error(`missing lockfile identity: ${pkg.name}`);
      return { ...pkg, version: locked.version, integrity: locked.integrity };
    }),
  };
  inventory.sourceProvenance = inventory.sourceProvenance.map(record => {
    const source = sources.get(record.id);
    if (source === undefined) throw new Error(`missing pinned source: ${record.id}`);
    return { ...record, lines: source.split("\n").length, sha256: createHash("sha256").update(source).digest("hex") };
  });
  for (const item of inventory.behaviorInventory) {
    const source = sources.get(item.provenance.source);
    if (source === undefined) { orphan(item, section, item.id); continue; }
    const lines = source.split("\n");
    if (item.provenance.anchors.some(anchor => resolveAnchorLines(lines, anchor).length === 0)) {
      const rewritten = item.provenance.anchors.map(anchor => resolveAnchor(source, anchor)?.anchor ?? anchor);
      if (rewritten.some(anchor => resolveAnchorLines(lines, anchor).length === 0)) { orphan(item, section, item.id); continue; }
      item.provenance = { ...item.provenance, anchors: rewritten };
      section.reanchored.push(item.id);
    }
    delete item.status;
    const [start, end] = item.provenance.lines;
    const current = item.provenance.anchors.map(anchor => resolveAnchorLines(lines, anchor));
    if (current.every(found => found.some(line => line >= start && line <= end))) continue;
    const anchored = current.map(found => nearest(found, [start, end]));
    const region = symbolRegion(lines, item.provenance.symbol) ?? [Math.min(...anchored), Math.max(...anchored)];
    const chosen = current.map(found => nearest(found, region));
    const next = [Math.min(region[0], ...chosen), Math.max(region[1], ...chosen)];
    item.provenance = { ...item.provenance, lines: next };
    section.moved.push(`${item.id}: [${start}, ${end}] -> [${next[0]}, ${next[1]}]`);
  }
  syncManifests(inventory, sources, section);
}

function syncManifests(inventory, sources, section) {
  const commands = sources.get("commands") ?? "";
  const interactive = sources.get("interactive") ?? "";
  const keybindings = sources.get("keybindings") ?? "";
  const tuiKeybindings = sources.get("tui-keybindings") ?? "";
  const settingsRegion = interactive.slice(interactive.indexOf("private showSettingsSelector"), interactive.indexOf("private async handleModelCommand"));
  const next = {
    ...inventory.manifests,
    advertisedBuiltInCommands: [...commands.matchAll(/\{ name: "([^"]+)"/g)].map(match => match[1]),
    tuiKeybindings: objectKeys(tuiKeybindings, "export const TUI_KEYBINDINGS", "export interface KeybindingConflict"),
    appKeybindings: objectKeys(keybindings, "export const KEYBINDINGS", "const KEYBINDING_NAME_MIGRATIONS"),
    sessionEvents: switchCases(interactive, "private async handleEvent", "/** Extract text content"),
    settingsCallbacks: [...settingsRegion.matchAll(/^\s*(on[A-Z][A-Za-z]+):/gm)].map(match => match[1]),
  };
  for (const key of Object.keys(next)) {
    if (JSON.stringify(next[key]) !== JSON.stringify(inventory.manifests[key])) section.manifests.push(key);
  }
  inventory.manifests = next;
}

/** Keep an exact anchor; rewrite one that only matches ignoring whitespace; orphan the entry otherwise. */
function reanchor(entry, source, section, id) {
  const anchors = [];
  let rewritten = false;
  for (const anchor of entry.sourceAnchors) {
    const resolved = resolveAnchor(source, anchor);
    if (resolved === null) { orphan(entry, section, id); return; }
    if (resolved.anchor !== anchor) rewritten = true;
    anchors.push(resolved.anchor);
  }
  entry.sourceAnchors = anchors;
  if (entry.status === "orphaned") delete entry.status;
  if (rewritten) section.reanchored.push(id);
}

function orphan(entry, section, id) {
  entry.status = "orphaned";
  section.orphaned.push(id);
}

function resolveAnchor(source, anchor) {
  if (source.includes(anchor)) return { anchor };
  const wanted = normalize(anchor);
  if (wanted.length === 0) return null;
  for (const line of source.split("\n")) {
    if (normalize(line).includes(wanted)) return { anchor: line.trim() };
  }
  return null;
}

function resolveAnchorLines(lines, anchor) {
  const found = [];
  for (const [index, line] of lines.entries()) if (line.includes(anchor)) found.push(index + 1);
  return found;
}

/** The line span from the first named symbol's definition to the end of the last one's body. */
function symbolRegion(lines, symbol) {
  const names = symbol.split(/,|\band\b/).map(name => name.trim()).filter(name => /^[A-Za-z_$][\w$]*$/.test(name));
  const definitions = names.flatMap(name => {
    const pattern = new RegExp(`^\\s*(?:(?:private|protected|public|readonly|static|async|override|get|set)\\s+)*${name}\\s*[(<=]`);
    const index = lines.findIndex(line => pattern.test(line));
    return index === -1 ? [] : [index + 1];
  });
  if (definitions.length === 0) return null;
  const last = Math.max(...definitions);
  let depth = 0;
  let opened = false;
  for (let index = last - 1; index < lines.length; index += 1) {
    for (const character of lines[index]) {
      if (character === "{") { depth += 1; opened = true; }
      else if (character === "}") depth -= 1;
    }
    if (opened && depth <= 0) return [Math.min(...definitions), index + 1];
  }
  return [Math.min(...definitions), lines.length];
}

function nearest(candidates, [start, end]) {
  const distance = line => line < start ? start - line : line > end ? line - end : 0;
  return candidates.reduce((best, line) => distance(line) < distance(best) ? line : best);
}

function objectKeys(source, start, end) {
  const region = source.slice(source.indexOf(start), source.indexOf(end));
  return [...region.matchAll(/^\s*"([^"]+)"\s*:/gm)].map(match => match[1]);
}

function switchCases(source, start, end) {
  const region = source.slice(source.indexOf(start), source.indexOf(end));
  return [...region.matchAll(/case "([^"]+)"/g)].map(match => match[1]);
}

function normalize(text) {
  return text.replace(/\s+/g, "");
}
