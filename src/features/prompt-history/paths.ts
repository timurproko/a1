import { createHash } from "node:crypto";
import { posix, win32 } from "node:path";
import { PRODUCT_IDENTITY } from "../../product-identity.js";

export type PromptHistoryScope = "unique" | "shared";

export function resolvePromptHistoryPath(dataDir: string, profileRoot: string, platform: NodeJS.Platform = process.platform, scope: PromptHistoryScope = "shared", sessionId?: string): { path: string; profileId: string; imagesDir: string } {
  const paths = platform === "win32" ? win32 : posix;
  if (!paths.isAbsolute(dataDir) || !paths.isAbsolute(profileRoot) || dataDir.includes("\0") || profileRoot.includes("\0")) throw new TypeError("History requires absolute roots");
  let normalized = paths.normalize(profileRoot);
  if (normalized.length > paths.parse(normalized).root.length) normalized = normalized.replace(/[\\/]+$/, "");
  if (platform === "win32") normalized = normalized.replaceAll("\\", "/").toLowerCase();
  const digest = createHash("sha256").update(JSON.stringify([1, PRODUCT_IDENTITY.commandName, normalized])).digest("hex");
  if (scope !== "unique" && scope !== "shared") throw new TypeError("Invalid history scope");
  if (scope === "unique" && (typeof sessionId !== "string" || sessionId.length === 0 || sessionId.length > 256 || sessionId.includes("\0"))) {
    throw new TypeError("Unique history requires a valid session ID");
  }
  // Compatibility: preserve the former Shared identity; a separate domain prevents
  // collisions with per-session databases and image sidecars.
  const profileId = scope === "shared" ? `${PRODUCT_IDENTITY.filesystem.temporaryPrefix}${digest}`
    : `${PRODUCT_IDENTITY.filesystem.temporaryPrefix}${createHash("sha256").update(JSON.stringify([2, PRODUCT_IDENTITY.commandName, normalized, sessionId])).digest("hex")}`;
  const historyDir = paths.join(dataDir, "history");
  return { path: paths.join(historyDir, `${profileId}.sqlite3`), profileId, imagesDir: paths.join(historyDir, `${profileId}-images`) };
}
