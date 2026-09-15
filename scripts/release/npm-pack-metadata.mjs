/** Normalize the documented npm 11 array and npm 12 package-keyed JSON shapes. */
export function normalizeNpmPackMetadata(parsed) {
  const candidates = Array.isArray(parsed) ? parsed : parsed?.filename ? [parsed]
    : parsed && typeof parsed === "object" ? Object.values(parsed) : [];
  if (candidates.length !== 1) throw new Error("npm pack returned ambiguous validation metadata");
  const [value] = candidates;
  if (!value || typeof value !== "object" || typeof value.filename !== "string" || !value.filename.endsWith(".tgz")
    || typeof value.integrity !== "string" || !value.integrity.startsWith("sha512-") || !/^[0-9a-f]{40}$/u.test(value.shasum ?? "")) {
    throw new Error("npm pack returned incomplete validation metadata");
  }
  return value;
}
