import { access, readFile } from "node:fs/promises";
import { extname, isAbsolute, resolve } from "node:path";

export interface ResolvedTransparentCommand {
  readonly executable: string;
  readonly arguments: readonly string[];
  readonly source: "exact" | "path" | "npm-windows-shim";
}

export interface TransparentCommandResolutionOptions {
  readonly platform?: NodeJS.Platform;
  readonly cwd: string;
  readonly environment: Readonly<Record<string, string>>;
  readonly nodeExecutable?: string;
}

/** Resolve a command without invoking a command interpreter. */
export async function resolveTransparentCommand(
  executable: string,
  arguments_: readonly string[],
  options: TransparentCommandResolutionOptions,
): Promise<ResolvedTransparentCommand> {
  const platform = options.platform ?? process.platform;
  return platform === "win32"
    ? await resolveWindowsCommand(executable, arguments_, options)
    : { executable, arguments: [...arguments_], source: "exact" };
}

async function resolveWindowsCommand(
  command: string,
  commandArguments: readonly string[],
  options: TransparentCommandResolutionOptions,
): Promise<ResolvedTransparentCommand> {
  const resolved = await resolveWindowsPathCommand(command, options.cwd, options.environment);
  const selected = resolved ?? throwCommandNotFound(command);
  if (extname(selected).toLowerCase() !== ".cmd") {
    return { executable: selected, arguments: [...commandArguments], source: "path" };
  }
  return await unwrapNpmWindowsShim(selected, commandArguments, options.nodeExecutable ?? process.execPath);
}

async function resolveWindowsPathCommand(
  executable: string,
  cwd: string,
  environment: Readonly<Record<string, string>>,
): Promise<string | null> {
  const hasPath = isAbsolute(executable) || executable.includes("/") || executable.includes("\\");
  const roots = hasPath ? [cwd] : windowsPath(environment).split(";").filter(Boolean);
  const extension = extname(executable);
  const extensions = extension ? [""] : windowsExecutableExtensions(environment);
  for (const root of roots) {
    const base = hasPath ? resolve(cwd, executable) : resolve(root.replace(/^"|"$/g, ""), executable);
    for (const suffix of extensions) {
      const candidate = `${base}${suffix}`;
      if (await isFile(candidate)) return candidate;
    }
  }
  return null;
}

async function unwrapNpmWindowsShim(
  shimPath: string,
  arguments_: readonly string[],
  fallbackNodeExecutable: string,
): Promise<ResolvedTransparentCommand> {
  const source = (await readFile(shimPath, "utf8")).replace(/^\uFEFF/, "");
  const targetMatch = source.match(/"%_prog%"\s+"%dp0%\\([^"\r\n]+)"\s+%\*/i);
  if (!targetMatch?.[1]) {
    throw Object.assign(new Error(
      `transparent launch refuses arbitrary Windows command script ${shimPath}; configure an executable binary instead`,
    ), { code: "UNSUPPORTED_WINDOWS_COMMAND_SHIM" });
  }
  const shimRoot = resolve(shimPath, "..");
  const target = resolve(shimRoot, targetMatch[1].replaceAll("\\", "/"));
  if (!await isFile(target)) throw Object.assign(new Error(`npm command shim target is missing: ${target}`), { code: "ENOENT" });
  const localNode = resolve(shimRoot, "node.exe");
  const nodeExecutable = await isFile(localNode) ? localNode : fallbackNodeExecutable;
  return {
    executable: nodeExecutable,
    arguments: [target, ...arguments_],
    source: "npm-windows-shim",
  };
}

function throwCommandNotFound(command: string): never {
  throw Object.assign(new Error(`spawn ${command} ENOENT`), { code: "ENOENT" });
}

function windowsPath(environment: Readonly<Record<string, string>>): string {
  return environment.Path ?? environment.PATH ?? "";
}

function windowsExecutableExtensions(environment: Readonly<Record<string, string>>): readonly string[] {
  const source = environment.PATHEXT ?? ".COM;.EXE;.BAT;.CMD";
  return [...new Set(source.split(";").filter(Boolean).flatMap(value => {
    const extension = value.startsWith(".") ? value : `.${value}`;
    return [extension, extension.toLowerCase()];
  }))];
}

async function isFile(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}
