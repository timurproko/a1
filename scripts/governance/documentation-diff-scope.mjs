/** Stable document/operational scope for association and historical readers, never an automation-authority decision. */
export function inspectDocumentationScope(files) {
  const examined = [];
  const invalid = () => ({ valid: false, documentationOnly: false, examinedPaths: [...new Set(examined)] });
  const validPath = path => typeof path === "string" && path.length > 0 && !path.startsWith("/")
    && !path.includes("\\") && !path.split("/").includes("..") && !path.includes("\0");
  if (!Array.isArray(files) || files.length === 0) return invalid();
  for (const file of files) {
    if (!file || !validPath(file.filename) || !["added", "modified", "removed", "renamed", "copied", "changed", "unchanged"].includes(file.status)) return invalid();
    examined.push(file.filename);
    if (file.status === "renamed") {
      if (!validPath(file.previous_filename)) return invalid();
      examined.push(file.previous_filename);
    }
  }
  const examinedPaths = [...new Set(examined)];
  // Compatibility: preserve the historical scope; manual-only authority docs do not become operational implementation.
  const document = path => path === "README.md" || path.startsWith("openspec/") || path.startsWith("docs/") && !path.startsWith("docs/releases/");
  return { valid: true, documentationOnly: examinedPaths.every(document), examinedPaths };
}
