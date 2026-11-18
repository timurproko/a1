import { DELIVERY_ADAPTER } from "./delivery-control.mjs";

const ALLOWED_ROOT_FILE = "README.md";
const ALLOWED_PREFIXES = Object.freeze(["openspec/", "docs/"]);
const MANUAL_PREFIXES = Object.freeze(["docs/releases/", "docs/governance/"]);
const AUTHORITY_FILES = new Set(["docs/architecture/project-structure.md", "docs/architecture/code-documentation.md", "docs/architecture/toolchain.md", "docs/features/session-exports.md"]);
const authorityPath = path => AUTHORITY_FILES.has(path)
  || /(?:^|\/)(?:AGENTS|CLAUDE|SKILL|INSTRUCTIONS)\.md$/i.test(path)
  || /^(?:docs|openspec\/specs)\/.*(?:delivery|governance|cleanup|worktree|acceptance-review|runbook|validation|permissions|protection|security-policy)/i.test(path)
  || path.startsWith("openspec/changes/") && !path.startsWith("openspec/changes/archive/");

export function documentationControllerActive(repository, liveWorkflow, liveRepository, adapter = DELIVERY_ADAPTER) {
  return repository === adapter.repository && adapter.documentationAutoMerge === "active"
    && liveWorkflow?.path === ".github/workflows/documentation-auto-merge.yml" && liveWorkflow.state === "active"
    && liveRepository?.full_name === repository && liveRepository.allow_auto_merge === true;
}

/**
 * Classify the complete changed-file response from GitHub's pull-request files API.
 * Renames inspect both names so moving code into documentation cannot become eligible.
 */
export function classifyDocumentationAutoMerge(files) {
  if (!Array.isArray(files) || files.length === 0) {
    return { eligible: false, examinedPaths: [], disallowedPaths: [], reason: "the pull request has no classifiable changed files" };
  }

  const examined = [];
  for (const file of files) {
    if (!file || typeof file !== "object" || !validPath(file.filename) || !["added", "removed", "modified", "renamed", "copied", "changed", "unchanged"].includes(file.status)) {
      return { eligible: false, examinedPaths: [], disallowedPaths: [], reason: "GitHub returned malformed changed-file metadata" };
    }
    examined.push(file.filename);
    if (file.status === "renamed") {
      if (!validPath(file.previous_filename)) {
        return { eligible: false, examinedPaths: unique(examined), disallowedPaths: [], reason: "GitHub omitted a renamed file's previous path" };
      }
      examined.push(file.previous_filename);
    }
  }

  const examinedPaths = unique(examined);
  const disallowedPaths = examinedPaths.filter(path =>
    authorityPath(path) || /\.(?:[cm]?[jt]sx?|sh|ps1|exe|cmd|bat)$/i.test(path) || MANUAL_PREFIXES.some(prefix => path.startsWith(prefix))
      || (path !== ALLOWED_ROOT_FILE && !ALLOWED_PREFIXES.some(prefix => path.startsWith(prefix)))
  );
  const authorityPatch = files.some(file => typeof file.patch === "string" && file.patch.split("\n").some(line => /^[+-](?![+-])/.test(line)
    && /(?:\b(?:agents?|controllers?|bots?)\b.*\b(?:MUST|SHALL|permission|authoriz|bypass)|(?:required checks|branch protection|cleanup authority|delivery rules)|(?:ignore|override|replace).*\b(?:OpenSpec|opsx)\b)/i.test(line)));
  return {
    eligible: disallowedPaths.length === 0 && !authorityPatch,
    examinedPaths,
    disallowedPaths,
    reason: authorityPatch ? "the diff changes agent, governance or privileged-policy instructions" : disallowedPaths.length === 0
      ? "every changed path is under openspec/, under eligible docs/, or is the root README.md"
      : `paths outside the auto-merge allowlist: ${disallowedPaths.join(", ")}`,
  };
}

/** Missing/truncated textual patches are inspected from both immutable file versions, never assumed routine. */
export async function inspectDocumentationDiff(pull, files, read) {
  const classified = classifyDocumentationAutoMerge(files);
  if (!classified.eligible) return classified;
  const audited = [];
  for (const file of files) {
    if (!/\.(?:md|mdx|txt|json|ya?ml)$/i.test(file.filename)) { audited.push(file); continue; }
    const changed = typeof file.patch === "string" ? file.patch.split("\n").filter(line => /^[+-](?![+-])/.test(line)).length : -1;
    if (Number.isSafeInteger(file.additions) && Number.isSafeInteger(file.deletions) && changed === file.additions + file.deletions) {
      audited.push(file); continue;
    }
    if (!/^[a-f0-9]{40}$/.test(pull.head?.sha ?? "") || !/^[a-f0-9]{40}$/.test(pull.base?.sha ?? "")) throw new Error("documentation diff identity unavailable");
    const before = file.status === "added" ? "" : await read(file.previous_filename ?? file.filename, pull.base.sha);
    const after = file.status === "removed" ? "" : await read(file.filename, pull.head.sha);
    audited.push({ ...file, patch: before.split("\n").map(line => `-${line}`).concat(after.split("\n").map(line => `+${line}`)).join("\n") });
  }
  return classifyDocumentationAutoMerge(audited);
}

export function planDocumentationAutoMerge({ validation, autoMergeArmed, mergeableState, mergeable }) {
  if (validation === "failure" || mergeable !== true) return "wait";
  if (mergeableState === "clean" || mergeableState === "unstable") {
    // Invariant: a non-required check does not replace current-head validation or branch protection.
    if (validation === "success") return "merge";
    return autoMergeArmed ? "unchanged" : "wait";
  }
  if (mergeableState === "blocked" || mergeableState === "behind") {
    return autoMergeArmed ? "unchanged" : "arm";
  }
  return "wait";
}

function validPath(value) {
  return typeof value === "string"
    && value.length > 0
    && !value.startsWith("/")
    && !value.includes("\\")
    && !value.split("/").includes("..")
    && !value.includes("\0");
}

function unique(values) {
  return [...new Set(values)];
}
