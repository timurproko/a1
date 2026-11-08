import { createHash } from "node:crypto";

/** JSON with object keys sorted at every depth, so equal values always serialize to equal text. */
export function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value !== null && typeof value === "object") return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(",")}}`;
  return JSON.stringify(value);
}

/** The SHA-256 hex digest of a value's canonical JSON; recorded digests depend on these exact bytes. */
export function canonicalDigest(value) {
  return createHash("sha256").update(canonicalJson(value)).digest("hex");
}
