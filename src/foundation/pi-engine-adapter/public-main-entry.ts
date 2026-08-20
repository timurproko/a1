import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { main as runPublicMain } from "@earendil-works/pi-coding-agent";

export interface PublicMainEntryDependencies {
  readonly main?: (arguments_: string[]) => Promise<void>;
  readonly stderr?: (message: string) => void;
}

export async function runPublicMainEntry(
  arguments_: readonly string[],
  dependencies: PublicMainEntryDependencies = {},
): Promise<number> {
  try {
    await (dependencies.main ?? runPublicMain)([...arguments_]);
    return 0;
  } catch (error) {
    const detail = (error instanceof Error ? error.message : String(error)).replace(/[\r\n\t]+/g, " ").trim();
    const bounded = detail.length > 400 ? `${detail.slice(0, 397)}...` : detail;
    (dependencies.stderr ?? (message => process.stderr.write(message)))(`Selected Pi startup failed: ${bounded || "unknown error"}\n`);
    return 1;
  }
}

const isMain = process.argv[1] !== undefined && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) process.exitCode = await runPublicMainEntry(process.argv.slice(2));
