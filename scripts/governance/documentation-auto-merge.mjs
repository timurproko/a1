const ALLOWED_ROOT_FILE = "README.md";
const ALLOWED_PREFIX = "openspec/";

/**
 * Classify the complete changed-file response from GitHub's pull-request files API.
 * Renames inspect both names so moving code into openspec cannot become eligible.
 */
export function classifyDocumentationAutoMerge(files) {
  if (!Array.isArray(files) || files.length === 0) {
    return { eligible: false, examinedPaths: [], disallowedPaths: [], reason: "the pull request has no classifiable changed files" };
  }

  const examined = [];
  for (const file of files) {
    if (!file || typeof file !== "object" || !validPath(file.filename)) {
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
  const disallowedPaths = examinedPaths.filter(path => path !== ALLOWED_ROOT_FILE && !path.startsWith(ALLOWED_PREFIX));
  return {
    eligible: disallowedPaths.length === 0,
    examinedPaths,
    disallowedPaths,
    reason: disallowedPaths.length === 0
      ? "every changed path is under openspec/ or is the root README.md"
      : `paths outside the auto-merge allowlist: ${disallowedPaths.join(", ")}`,
  };
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
