export interface ClipboardImageData {
  readonly data: string;
  readonly mimeType: string;
}

const STANDARD_BASE64 = /^[A-Za-z0-9+/]*={0,2}$/u;

/**
 * Converts valid padded or unpadded standard base64 into its unique padded form.
 * Clipboard adapters are untrusted at this boundary, so reject representations
 * that Node's permissive base64 decoder would otherwise partially accept.
 */
export function canonicalizeClipboardImage(image: ClipboardImageData): ClipboardImageData | null {
  const data = canonicalizeStandardBase64(image.data);
  return data === null ? null : { data, mimeType: image.mimeType };
}

export function canonicalizeStandardBase64(value: string): string | null {
  if (value.length === 0 || !STANDARD_BASE64.test(value)) return null;

  const paddingStart = value.indexOf("=");
  const core = paddingStart < 0 ? value : value.slice(0, paddingStart);
  const suppliedPadding = value.length - core.length;
  const remainder = core.length % 4;
  if (remainder === 1) return null;

  const requiredPadding = remainder === 0 ? 0 : 4 - remainder;
  if (suppliedPadding !== 0 && suppliedPadding !== requiredPadding) return null;

  const padded = `${core}${"=".repeat(requiredPadding)}`;
  const decoded = Buffer.from(padded, "base64");
  if (decoded.length === 0) return null;

  const canonical = decoded.toString("base64");
  return canonical === padded ? canonical : null;
}
