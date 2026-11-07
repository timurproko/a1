import { spawn } from "node:child_process";
import { rm } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, parse, resolve, sep } from "node:path";
import { resolveLaunchProfilePaths } from "../features/launch/index.js";
import { resolveProductPaths } from "../foundation/lifecycle/index.js";
import { npmPrefixForGlobalRoot, resolveNpmCli } from "../foundation/release/index.js";
import { PRODUCT_IDENTITY, PRODUCT_TEXT } from "../product-identity.js";

interface UninstallRequest {
  /** Skips the program-removal question; user data is still kept unless `purge` is set. */
  readonly yes: boolean;
  /** Also removes sessions, settings, sign-ins, and prompt history. */
  readonly purge: boolean;
}

interface UninstallOutput {
  readonly stdout: (message: string) => void;
  readonly stderr: (message: string) => void;
}

export interface UninstallDependencies {
  readonly packageRoot: string;
  readonly output: UninstallOutput;
  readonly environment?: NodeJS.ProcessEnv;
  readonly platform?: NodeJS.Platform;
  readonly home?: string;
  /** Asks one yes/no question; absent when no terminal can answer. */
  readonly confirm?: (question: string) => Promise<boolean>;
  readonly removePackage?: (packageRoot: string, environment: NodeJS.ProcessEnv) => Promise<void>;
  readonly remove?: (path: string) => Promise<void>;
}

/**
 * Removes A1 from this machine: the global package goes first, then every A1-owned state root.
 * Sessions and settings live in the profile home and leave only with explicit consent.
 */
export async function runUninstall(request: UninstallRequest, dependencies: UninstallDependencies): Promise<number> {
  const { output } = dependencies;
  const environment = dependencies.environment ?? process.env;
  const command = PRODUCT_TEXT.commandName;
  const globalRoot = managedGlobalRoot(dependencies.packageRoot);
  if (globalRoot === null) {
    output.stderr(`${PRODUCT_TEXT.diagnostic(`${command} uninstall removes only an installed ${command}; this one runs from ${dependencies.packageRoot}.`)}\n`);
    return 1;
  }
  const platform = dependencies.platform ?? process.platform;
  const paths = resolveProductPaths(environment, platform);
  const profileHome = resolveLaunchProfilePaths({ environment, platform, ...(dependencies.home === undefined ? {} : { home: dependencies.home }) }).managedStateRoot;

  let purge = request.purge;
  if (!request.yes) {
    if (dependencies.confirm === undefined) {
      output.stderr(`${PRODUCT_TEXT.diagnostic(`${command} uninstall needs a terminal to confirm. Run ${command} uninstall --yes to remove it.`)}\n`);
      return 2;
    }
    if (!await dependencies.confirm(`Remove ${command} from this machine? [y/N] `)) {
      output.stdout(`${command} was not removed\n`);
      return 1;
    }
    purge ||= await dependencies.confirm(`Also delete your sessions, settings, and sign-ins in ${profileHome}? [y/N] `);
  }

  try {
    await (dependencies.removePackage ?? removeGlobalPackage)(dependencies.packageRoot, environment);
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    output.stderr(`${PRODUCT_TEXT.diagnostic(`${command} uninstall could not remove the package: ${reason}. Run npm uninstall --global ${PRODUCT_IDENTITY.packageName}, then ${command} uninstall again.`)}\n`);
    return 1;
  }

  const remove = dependencies.remove ?? (async (path: string) => await rm(path, { recursive: true, force: true }));
  const home = dependencies.home ?? environment.HOME ?? environment.USERPROFILE ?? homedir();
  const owned = [paths.dataDir, paths.configDir, paths.runtimeDir, ...(purge ? [profileHome] : [])];
  for (const path of new Set(owned)) {
    if (removable(path, home)) await remove(path);
  }
  output.stdout(purge ? `${command} uninstalled\n` : `${command} uninstalled; your sessions and settings remain in ${profileHome}\n`);
  return 0;
}

/** The npm global `node_modules` that holds this package, or null outside a managed install. */
function managedGlobalRoot(packageRoot: string): string | null {
  const root = resolve(packageRoot);
  const scope = dirname(root);
  const modules = dirname(scope);
  const [scopeName, packageName] = PRODUCT_IDENTITY.packageName.split("/");
  return root.endsWith(`${sep}${packageName}`) && scope.endsWith(`${sep}${scopeName}`) && modules.endsWith(`${sep}node_modules`)
    ? modules
    : null;
}

/** Invariant: a state-root override never turns removal into deleting a home or volume root. */
function removable(path: string, home: string): boolean {
  const target = resolve(path);
  return target !== parse(target).root && target !== resolve(home) && !resolve(home).startsWith(`${target}${sep}`);
}

async function removeGlobalPackage(packageRoot: string, environment: NodeJS.ProcessEnv): Promise<void> {
  const globalRoot = managedGlobalRoot(packageRoot);
  if (globalRoot === null) throw new Error("A1 is not a managed global installation");
  const prefix = npmPrefixForGlobalRoot(globalRoot);
  const npmCli = await resolveNpmCli(globalRoot, environment);
  const code = await new Promise<number>((resolvePromise, rejectPromise) => {
    const child = spawn(process.execPath, [npmCli, "uninstall", "--global", "--prefix", prefix,
      "--loglevel=error", "--no-fund", "--no-audit", PRODUCT_IDENTITY.packageName], {
      env: { ...environment, NO_UPDATE_NOTIFIER: "1", npm_config_update_notifier: "false" },
      stdio: ["ignore", "ignore", "inherit"],
      windowsHide: true,
    });
    child.once("error", rejectPromise);
    child.once("close", value => resolvePromise(value ?? 1));
  });
  if (code !== 0) throw new Error(`npm could not remove ${PRODUCT_IDENTITY.packageName} (exit ${code})`);
}
