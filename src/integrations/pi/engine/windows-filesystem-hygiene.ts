import {
  isBashToolResult,
  isEditToolResult,
  isWriteToolResult,
  type ExtensionAPI,
  type InlineExtension,
} from "@earendil-works/pi-coding-agent";
import { lstat, unlink } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";

interface FileMetadata {
  isFile(): boolean;
  isSymbolicLink(): boolean;
}

interface CleanupFileSystem {
  lstat(path: string): Promise<FileMetadata>;
  unlink(path: string): Promise<void>;
}

interface CleanupPaths {
  dirname(path: string): string;
  join(...paths: string[]): string;
  resolve(...paths: string[]): string;
}

export interface WindowsNulCleanupOptions {
  readonly platform?: NodeJS.Platform;
  readonly fileSystem?: CleanupFileSystem;
  readonly paths?: CleanupPaths;
}

const DEFAULT_FILE_SYSTEM: CleanupFileSystem = { lstat, unlink };
const DEFAULT_PATHS: CleanupPaths = { dirname, join, resolve };
const SIMPLE_CD = /(?:^|[;&|\n])\s*cd\s+(?:"([^"\r\n]+)"|'([^'\r\n]+)'|([^\s;&|]+))/;

export function createWindowsNulCleanupExtension(
  options: WindowsNulCleanupOptions = {},
): InlineExtension | null {
  if ((options.platform ?? process.platform) !== "win32") return null;
  const fileSystem = options.fileSystem ?? DEFAULT_FILE_SYSTEM;
  const paths = options.paths ?? DEFAULT_PATHS;
  return {
    name: "windows-nul-file-cleanup",
    factory: pi => registerNulCleanup(pi, fileSystem, paths),
  };
}

function registerNulCleanup(pi: ExtensionAPI, fileSystem: CleanupFileSystem, paths: CleanupPaths): void {
  const cleanDirectory = async (directory: string): Promise<void> => {
    const candidate = paths.join(directory, "nul");
    try {
      const metadata = await fileSystem.lstat(candidate);
      if (metadata.isFile() && !metadata.isSymbolicLink()) await fileSystem.unlink(candidate);
    } catch {
      return;
    }
  };

  pi.on("session_start", async (_event, ctx) => {
    await cleanDirectory(ctx.cwd);
  });

  pi.on("tool_result", async (event, ctx) => {
    const directories = new Set<string>([ctx.cwd]);
    if (isBashToolResult(event)) {
      const command = stringInput(event.input, "command");
      const target = command === null ? null : simpleCdTarget(command);
      if (target !== null) directories.add(paths.resolve(ctx.cwd, target));
    }
    if (isWriteToolResult(event) || isEditToolResult(event)) {
      const target = stringInput(event.input, "path");
      if (target !== null) directories.add(paths.dirname(paths.resolve(ctx.cwd, target)));
    }
    await Promise.all(Array.from(directories, cleanDirectory));
  });
}

function simpleCdTarget(command: string): string | null {
  const match = SIMPLE_CD.exec(command);
  return match?.[1] ?? match?.[2] ?? match?.[3] ?? null;
}

function stringInput(input: Readonly<Record<string, unknown>>, key: string): string | null {
  const value = input[key];
  return typeof value === "string" && value.length > 0 ? value : null;
}
