import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

interface PackageMetadata { readonly name?: unknown; readonly version?: unknown }

export function readInstalledVersion(moduleUrl = import.meta.url): string {
  let directory = dirname(fileURLToPath(moduleUrl));
  for (let depth = 0; depth < 4; depth++) {
    const path = join(directory, "package.json");
    try {
      const metadata = JSON.parse(readFileSync(path, "utf8")) as PackageMetadata;
      if (metadata.name === "@timurproko/addone" && typeof metadata.version === "string") return metadata.version;
    } catch (error) {
      const code = error instanceof Error && "code" in error ? String(error.code) : "";
      if (code !== "ENOENT" && !(error instanceof SyntaxError)) throw error;
    }
    directory = dirname(directory);
  }
  throw new Error("could not locate installed AddOne package metadata");
}

export const ADDONE_VERSION = readInstalledVersion();
