import { readFile, readdir, stat } from "node:fs/promises";
import { extname, relative, resolve, sep } from "node:path";

const rootIndex = process.argv.indexOf("--root");
const root = resolve(rootIndex >= 0 ? process.argv[rootIndex + 1] : new URL("../..", import.meta.url).pathname.replace(/^\/(.:)/, "$1"));
const errors = [];
const production = {};

async function walk(directory) {
  let entries;
  try {
    entries = await readdir(directory, { withFileTypes: true });
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") return [];
    throw error;
  }
  const files = [];
  for (const entry of entries) {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) files.push(...await walk(path));
    else if ([".ts", ".tsx", ".js", ".mjs"].includes(extname(entry.name))) files.push(path);
  }
  return files;
}

for (const file of await walk(resolve(root, "src"))) {
  const path = relative(root, file).split(sep).join("/");
  const source = await readFile(file, "utf8");
  production[path] = source;
  const debtScope = /^(?:src\/features\/owned-ui|src\/integrations\/pi\/(?:engine|components|tui-runtime|owned-ui))\//.test(path);
  if (!debtScope) continue;
  const checks = [
    [/(?:InteractiveMode|TuiAltScreen|TuiMainScreen).*\.prototype|prototype\s*\.(?:render|start|stop|handle\w+)\s*=|node_modules\/.+\.(?:js|ts).*writeFile/i, "prohibited runtime or package patch"],
    [/from\s+["'][^"']*(?:\/dist\/|\/src\/)[^"']*pi[^"']*["']/i, "prohibited private Pi import"],
    [/\b(?:workflowSelector|showWorkflowSelector)\s*\(/, "generic visible workflow fallback"],
    [/\b(?:replaceWorkingMessageInRows|replaceRenderedStatus|substituteRenderedStatus)\b|\.replace\([^\n]*(?:working|status)[^\n]*\)/i, "rendered-string status substitution"],
    [/\b(?:normalizeRenderedRows|fitRowsToWidth|truncateRenderedRows|rewriteRowsToWidth)\b/, "silent rendered-width rewriting"],
    [/\b(?:dynamicCall|requiredDynamicCall|dynamicCallAsync|requiredDynamicCallAsync)\s*\(|\btarget\s*\[\s*method\s*\]/, "string-named engine reflection"],
    [/\bas\s+(?:unknown\s+as\s+|never\b|any\b)/, "production adapter type escape"],
    [/(?:selectionCoordinates|selectionRectangle|rewriteSelectedCells|OSC\s*52|mouseTrackingInterceptor)/i, "prohibited terminal selection patch"],
  ];
  for (const [pattern, label] of checks) if (pattern.test(source)) errors.push(`${path}: ${label}`);
}

const ledgerPath = resolve(root, "config", "baselines", "pinned-pi-source-port-ledger.json");
try {
  const ledger = JSON.parse(await readFile(ledgerPath, "utf8"));
  const records = Array.isArray(ledger.records) ? ledger.records : [];
  if (records.length === 0) errors.push("source ledger: no pinned source records");
  for (const record of records) {
    if (["not-ported", "upgrade-review-required", "planned"].includes(record.implementationStatus)) {
      errors.push(`source ledger: stale or absent destination status for ${record.id ?? "unknown"}`);
    }
    const destinations = Array.isArray(record.localDestinations) ? record.localDestinations : record.localDestination ? [record.localDestination] : [];
    for (const destination of destinations) {
      if (typeof destination !== "string" || destination.startsWith("@")) continue;
      try { await stat(resolve(root, destination)); }
      catch { errors.push(`source ledger: absent local destination ${destination}`); }
    }
  }
} catch (error) {
  errors.push(`source ledger: unavailable or malformed (${error instanceof Error ? error.message : String(error)})`);
}

const prefix = "src/integrations/pi/components/";
const barrelPath = `${prefix}shell-components.ts`;
const modules = [
  "shell-shared-facade.ts",
  "shell-editor-autocomplete.ts",
  "shell-selectors-dialogs.ts",
  "shell-presenters-transcript.ts",
  "shell-footer-status.ts",
  "shell-extension-ui.ts",
];
const barrel = production[barrelPath];
if (barrel === undefined || barrel.trim().split(/\r?\n/).some(line => !/^export \* from "\.\/shell-[a-z-]+\.js";$/.test(line))) {
  errors.push(`${barrelPath}: monolithic shell recomposition or missing bounded barrel`);
}
for (const module of modules) {
  const path = `${prefix}${module}`;
  const source = production[path];
  if (source === undefined) {
    errors.push(`${path}: missing bounded shell responsibility module`);
    continue;
  }
  const lines = source.split(/\r?\n/).length;
  if (lines > 550) errors.push(`${path}: monolithic shell responsibility module (${lines} lines)`);
  if (/(?:from\s+|import\s+)["']\.\/(shell-(?!shared-facade)[a-z-]+)\.js["']/.test(source)) {
    errors.push(`${path}: cross-responsibility shell import`);
  }
}

if (errors.length > 0) {
  console.error(`Owned UI customization prerequisite failed (${errors.length}):\n${errors.map(error => `- ${error}`).join("\n")}`);
  process.exitCode = 1;
} else {
  console.log("Owned UI customization prerequisite OK: zero architecture debt");
}
