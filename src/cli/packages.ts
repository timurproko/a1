import { configurationRootForProfile, initializeProductProfile, resolveLaunchProfilePaths } from "../features/launch/index.js";
import type { AgentPackageOutcome, AgentPackagesPort, AgentPackagesPortInput } from "../foundation/agent-engine-contracts/index.js";
import { PRODUCT_TEXT } from "../product-identity.js";

/**
 * Package commands manage A1's own profile and nothing else, so no request carries
 * a profile: `update` with no source means every installed package, and refreshing
 * model catalogs is its own verb rather than a flag the caller has to remember to
 * check.
 */
export type PackageCommandVerb = "install" | "remove" | "list" | "update" | "refresh-models";

export interface PackageCommandRequest {
  readonly verb: PackageCommandVerb;
  readonly source: string | null;
}

export interface PackageCommandEnvironment {
  readonly createPort: (input: AgentPackagesPortInput) => AgentPackagesPort;
  readonly cwd?: string;
  readonly environment?: NodeJS.ProcessEnv;
  readonly stdout?: (message: string) => void;
  readonly stderr?: (message: string) => void;
  readonly initializeProfile?: typeof initializeProductProfile;
}

export async function runPackageCommand(
  request: PackageCommandRequest,
  environment: PackageCommandEnvironment,
): Promise<number> {
  const stdout = environment.stdout ?? (message => process.stdout.write(message));
  const stderr = environment.stderr ?? (message => process.stderr.write(message));
  const cwd = environment.cwd ?? process.cwd();
  const processEnvironment = environment.environment ?? process.env;

  const paths = resolveLaunchProfilePaths({ environment: processEnvironment });
  const profileRoot = configurationRootForProfile("a1", paths);
  if (profileRoot === null) throw new Error(PRODUCT_TEXT.diagnostic("has no profile root for package commands"));

  try {
    await (environment.initializeProfile ?? initializeProductProfile)(profileRoot);
  } catch (error) {
    stderr(`${PRODUCT_TEXT.diagnostic(`could not prepare its profile at ${profileRoot}: ${message(error)}`)}\n`);
    return 1;
  }

  const port = environment.createPort({
    profileRoot,
    cwd,
    onProgress: progress => stdout(`${progress.message}\n`),
  });

  const outcome = await runVerb(port, request);
  const rendered = renderPackageOutcome(outcome, profileRoot);
  (outcome.status === "completed" ? stdout : stderr)(rendered);
  return outcome.status === "completed" ? 0 : 1;
}

async function runVerb(port: AgentPackagesPort, request: PackageCommandRequest): Promise<AgentPackageOutcome> {
  if (request.verb === "list") return await port.list();
  if (request.verb === "refresh-models") return await port.refreshModels();
  if (request.verb === "update") return await port.update(request.source ?? undefined);
  if (request.source === null) throw new Error(PRODUCT_TEXT.diagnostic(`requires a source for ${request.verb}`));
  return request.verb === "install" ? await port.install(request.source) : await port.remove(request.source);
}

export function renderPackageOutcome(outcome: AgentPackageOutcome, profileRoot: string): string {
  const name = PRODUCT_TEXT.displayName;
  if (outcome.status === "failed") {
    return `${PRODUCT_TEXT.diagnostic(`could not ${describeOperation(outcome.operation)}: ${outcome.detail ?? "unknown failure"}`)}\n`;
  }
  if (outcome.status === "not-found") {
    return `${PRODUCT_TEXT.diagnostic(`found no package matching ${outcome.source ?? "that source"} in ${profileRoot}.`)}\n`;
  }
  switch (outcome.operation) {
    case "install":
      return `${name} installed ${outcome.source} into ${profileRoot}.\n`
        + `Restart ${PRODUCT_TEXT.commandName} for a running session to load it.\n`;
    case "remove":
      return `${name} removed ${outcome.source} from ${profileRoot}.\n`;
    case "update":
      return outcome.source === null
        ? `${name} updated the packages in ${profileRoot}.\n`
        : `${name} updated ${outcome.source}.\n`;
    case "refresh-models":
      return `${name} refreshed the model catalogs in ${profileRoot}.\n`;
    case "list":
      return renderPackageList(outcome, profileRoot);
  }
}

function renderPackageList(outcome: AgentPackageOutcome, profileRoot: string): string {
  if (outcome.packages.length === 0) return `${PRODUCT_TEXT.displayName} has no packages installed in ${profileRoot}.\n`;
  const lines = [`Packages installed for ${PRODUCT_TEXT.commandName} in ${profileRoot}:`];
  for (const entry of outcome.packages) {
    lines.push(`  ${entry.source}${entry.filtered ? " (partly enabled)" : ""}`);
    if (entry.installedPath !== null) lines.push(`    ${entry.installedPath}`);
  }
  return `${lines.join("\n")}\n`;
}

function describeOperation(operation: AgentPackageOutcome["operation"]): string {
  if (operation === "refresh-models") return "refresh the model catalogs";
  if (operation === "list") return "list installed packages";
  return `${operation} the package`;
}

function message(error: unknown): string {
  return (error instanceof Error ? error.message : String(error)).replace(/\s+/g, " ").trim();
}
