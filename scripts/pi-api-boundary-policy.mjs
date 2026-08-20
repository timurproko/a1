import { readFile, readdir } from "node:fs/promises";
import { extname, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

export function inspectPiProductionBoundary(files, baseline = null) {
  const approvals = approvedFindings(baseline);
  const findings = collectPiProductionBoundaryFindings(files);
  return findings
    .filter(finding => !approvals.has(findingKey(finding)))
    .map(finding => `${finding.path}:${finding.line}: ${diagnostic(finding)}`);
}

export function collectPiProductionBoundaryFindings(files) {
  const findings = [];
  for (const [rawPath, source] of Object.entries(files)) {
    const path = normalize(rawPath);
    const lines = source.split(/\r?\n/);
    lines.forEach((line, index) => {
      const expression = line.trim();
      if (/\b(?:readFile|readFileSync)\s*\([^\n]*getPackageDir\s*\(\s*\)/.test(line)) {
        findings.push({ category: "dependency-package-file-read", path, line: index + 1, expression });
      }
      if (/getPackageDir\s*\(\s*\)[^\n]*["'](?:dist|src|build)["']/.test(line)) {
        findings.push({ category: "private-package-path-construction", path, line: index + 1, expression });
      }
      const reflected = line.match(/Reflect\.construct\(\s*([A-Za-z_$][\w$]*)/);
      if (reflected) findings.push({ category: "reflected-concrete-constructor", path, line: index + 1, expression, symbol: reflected[1] });
      if (/(?:\bexecutable\b[^\n]*(?:\?\?|=)[^\n]*["']pi["']|\b(?:spawn|resolveExecutable)\s*\(\s*["']pi["'])/.test(line)) {
        findings.push({ category: "ambient-pi-oracle", path, line: index + 1, expression, symbol: "pi" });
      }
    });
    for (const declaration of source.matchAll(/\bconst\s+([A-Za-z_$][\w$]*)\s*=\s*\{/g)) {
      const identifier = declaration[1];
      const after = source.slice(declaration.index ?? 0);
      const consumer = after.match(new RegExp(`Reflect\\.construct\\(\\s*([A-Za-z_$][\\w$]*)\\s*,\\s*\\[\\s*${identifier}\\b`));
      if (!consumer) continue;
      const line = source.slice(0, declaration.index ?? 0).split("\n").length;
      const lineEnd = source.indexOf("\n", declaration.index ?? 0);
      findings.push({
        category: "structural-concrete-session-substitute",
        path,
        line,
        expression: source.slice(declaration.index ?? 0, lineEnd < 0 ? source.length : lineEnd).trim(),
        symbol: `${identifier}->${consumer[1]}`,
      });
    }
  }
  return findings.sort((left, right) => left.path.localeCompare(right.path) || left.line - right.line || left.category.localeCompare(right.category));
}

function approvedFindings(baseline) {
  const approved = new Set();
  for (const record of baseline?.packageLayoutReads ?? []) {
    for (const category of ["dependency-package-file-read", "private-package-path-construction"]) {
      approved.add(findingKey({ category, path: record.path, expression: record.expression }));
    }
  }
  for (const record of baseline?.reflectedConcreteConstructors ?? []) {
    approved.add(findingKey({ category: "reflected-concrete-constructor", path: record.path, expression: record.expression }));
  }
  for (const record of baseline?.structuralConcreteSessionSubstitutes ?? []) {
    approved.add(findingKey({ category: "structural-concrete-session-substitute", path: record.path, expression: record.expression }));
  }
  for (const record of baseline?.exactOracleResolution?.sources ?? []) {
    approved.add(findingKey({ category: "ambient-pi-oracle", path: record.path, expression: record.expression }));
  }
  return approved;
}

function findingKey(finding) {
  return `${finding.category}\0${normalize(finding.path)}\0${finding.expression.trim()}`;
}

function diagnostic(finding) {
  switch (finding.category) {
    case "dependency-package-file-read":
      return "production reads a dependency package file; use a documented public API or an A1-owned resource";
    case "private-package-path-construction":
      return "production constructs a private dependency path; internal dist/src/build layout is not a public API";
    case "reflected-concrete-constructor":
      return `production reflects concrete Pi constructor '${finding.symbol}'; call a checked public constructor or use an A1-owned implementation`;
    case "structural-concrete-session-substitute":
      return `production fabricates concrete Pi session input '${finding.symbol}'; use a real contained session or neutral view data`;
    case "ambient-pi-oracle":
      return "explicit vanilla oracle resolves ambient 'pi'; bind it to the selected dependency public entry";
    default:
      return `unknown Pi production boundary finding '${finding.category}'`;
  }
}

async function sourceFiles(root) {
  const output = {};
  async function walk(directory) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const path = resolve(directory, entry.name);
      if (entry.isDirectory()) await walk(path);
      else if ([".ts", ".tsx", ".js", ".mjs"].includes(extname(entry.name))) {
        output[relative(root, path).split(sep).join("/")] = await readFile(path, "utf8");
      }
    }
  }
  await walk(resolve(root, "src"));
  return output;
}

function normalize(path) {
  return path.replaceAll("\\", "/").replace(/^\.\//, "");
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const rootIndex = process.argv.indexOf("--root");
  const root = resolve(rootIndex >= 0 ? process.argv[rootIndex + 1] : new URL("..", import.meta.url).pathname.replace(/^\/(.:)/, "$1"));
  const baselinePath = resolve(root, "evidence", "pi-api-boundary", "baseline.json");
  const baseline = JSON.parse(await readFile(baselinePath, "utf8"));
  const files = await sourceFiles(root);
  const findings = collectPiProductionBoundaryFindings(files);
  const errors = inspectPiProductionBoundary(files, baseline);
  if (errors.length > 0) {
    process.stderr.write(`Pi production boundary failed (${errors.length}):\n${errors.map(error => `- ${error}`).join("\n")}\n`);
    process.exitCode = 1;
  } else {
    process.stdout.write(`Pi production boundary freeze OK: ${findings.length} exact baseline couplings, 0 unapproved\n`);
  }
}
