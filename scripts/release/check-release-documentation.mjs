import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

const RELEASE_DOCUMENTS = new Set(["README.md", "docs/ci-release-runbook.md"]);
const BUMP_EXAMPLE = /^npm run release -- (patch|minor|major) +# (\S+) -> ([^\s;]+)/gmu;
const EXACT_EXAMPLE = /^npm run release -- ((?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)) +#/gmu;
const DOCUMENTED_VERSION = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(-dev)?$/u;

function resolveDocumentedBump(current, target) {
  const match = DOCUMENTED_VERSION.exec(current);
  if (!match) return null;
  let major = Number(match[1]);
  let minor = Number(match[2]);
  let patch = Number(match[3]);
  if (target === "patch") patch += match[4] ? 0 : 1;
  if (target === "minor") { minor += 1; patch = 0; }
  if (target === "major") { major += 1; minor = 0; patch = 0; }
  return `${major}.${minor}.${patch}`;
}

/** Whether the complete diff can change the release-documentation contract. */
export function releaseDocumentationChanged(changes) {
  return changes.some(change => RELEASE_DOCUMENTS.has(change.path) || RELEASE_DOCUMENTS.has(change.oldPath));
}

/** Validate concise README commands separately from detailed operator guidance. */
export function releaseDocumentationFindings(readme, runbook) {
  const findings = [];
  for (const [path, text] of [["README.md", readme], ["docs/ci-release-runbook.md", runbook]]) {
    const examples = [...text.matchAll(BUMP_EXAMPLE)];
    if (examples.length !== 3) findings.push(`${path}: expected patch, minor, and major release examples`);
    for (const match of examples) {
      if (resolveDocumentedBump(match[2], match[1]) !== match[3]) findings.push(`${path}: inaccurate ${match[1]} release example`);
    }
    const exact = [...text.matchAll(EXACT_EXAMPLE)].filter(match => !["patch", "minor", "major"].includes(match[1]));
    if (exact.length !== 1) findings.push(`${path}: expected one exact-version release example`);
    if (/^npm run release\s*(?:#.*)?$/mu.test(text)) findings.push(`${path}: bare release command is not supported`);
  }

  if (!/[Aa] target is required/u.test(runbook)) findings.push("docs/ci-release-runbook.md: missing target-required guidance");
  if (!runbook.includes("0.1.9-dev")) findings.push("docs/ci-release-runbook.md: missing next-development reopening example");
  if (!runbook.includes("release.published") || !runbook.includes("chore/release-0.1.9-dev")) findings.push("docs/ci-release-runbook.md: missing publication-before-reopening guidance");
  if (!/merge (?:it )?manually/u.test(runbook)) findings.push("docs/ci-release-runbook.md: missing manual reopening merge guidance");
  if (/self-merging|merge themselves/u.test(runbook)) findings.push("docs/ci-release-runbook.md: version pull requests cannot self-merge");
  if (readme.includes("--approve") || runbook.includes("npm run release -- patch --approve")) findings.push("release documentation: retired local --approve command remains");
  if (!runbook.includes("never opens Actions or re-enters the version") || !runbook.includes("native **Publish release**")
    || !runbook.includes("release-candidate.yml") || !/Release returns to draft|returns the Release to draft/u.test(runbook)) {
    findings.push("docs/ci-release-runbook.md: missing native-publication release guidance");
  }
  if (/reports npm ready|wait for `?npm ready`?/iu.test(`${readme}\n${runbook}`)) {
    findings.push("release documentation: retired Save-draft staging handoff remains");
  }
  if (!readme.includes("## [version] - YYYY-MM-DD") || !runbook.includes("## [version] - YYYY-MM-DD")) {
    findings.push("release documentation: missing Pi-style generated changelog format");
  }
  if (!/draft GitHub Release/u.test(runbook) || !/native\s+\*\*Publish release\*\*(?:\s+button)?/u.test(runbook)) {
    findings.push("docs/ci-release-runbook.md: missing draft Release safety guidance");
  }
  if (!/never republish immutable bytes/ui.test(runbook) || !/never rerun publication for the published version|do not repeat stable publication|never repeat stable publication/ui.test(runbook)) {
    findings.push("docs/ci-release-runbook.md: missing immutable publication recovery guidance");
  }
  return findings;
}

export async function checkReleaseDocumentation() {
  const [readme, runbook] = await Promise.all([
    readFile("README.md", "utf8"),
    readFile("docs/ci-release-runbook.md", "utf8"),
  ]);
  return releaseDocumentationFindings(readme, runbook);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const selectionFlag = process.argv.indexOf("--selection");
  const selectionPath = selectionFlag >= 0 ? process.argv[selectionFlag + 1] : null;
  const selection = selectionPath ? JSON.parse(await readFile(selectionPath, "utf8")) : null;
  if (selection && !releaseDocumentationChanged(selection.changes ?? [])) {
    process.stdout.write("Release documentation governance not applicable.\n");
  } else {
    const findings = await checkReleaseDocumentation();
    if (findings.length > 0) {
      for (const finding of findings) process.stderr.write(`Release documentation governance: ${finding}\n`);
      process.exitCode = 1;
    } else {
      process.stdout.write("Release documentation governance OK.\n");
    }
  }
}
