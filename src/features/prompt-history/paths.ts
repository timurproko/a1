import { createHash } from "node:crypto";
import { posix, win32 } from "node:path";
import { PRODUCT_IDENTITY } from "../../product-identity.js";

export function resolvePromptHistoryPath(dataDir: string, profileRoot: string, platform: NodeJS.Platform = process.platform): { path: string; profileId: string; imagesDir: string } {
  const paths = platform === "win32" ? win32 : posix;
  if (!paths.isAbsolute(dataDir) || !paths.isAbsolute(profileRoot) || dataDir.includes("\0") || profileRoot.includes("\0")) throw new TypeError("History requires absolute roots");
  let normalized = paths.normalize(profileRoot);
  if (normalized.length > paths.parse(normalized).root.length) normalized = normalized.replace(/[\\/]+$/, "");
  if (platform === "win32") normalized = normalized.replaceAll("\\", "/").toLowerCase();
  const digest = createHash("sha256").update(JSON.stringify([1, PRODUCT_IDENTITY.commandName, normalized])).digest("hex");
  const profileId = `${PRODUCT_IDENTITY.filesystem.temporaryPrefix}${digest}`;
  const historyDir = paths.join(dataDir, "history");
  return { path: paths.join(historyDir, `${profileId}.sqlite3`), profileId, imagesDir: paths.join(historyDir, `${profileId}-images`) };
}
