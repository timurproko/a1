import { interactiveLaunchIntent, type InteractiveLaunchIntent, type LaunchProfileId } from "../features/launch/index.js";
import type { CliCapabilities } from "./capabilities.js";
import type { PackageCommandRequest } from "./packages.js";
import { PRODUCT_TEXT } from "../product-identity.js";

export type UpdateChannel = "stable" | "next";

export interface CliHandlers {
  readonly launch: (intent: InteractiveLaunchIntent) => Promise<number>;
  readonly version: () => Promise<number>;
  readonly update: (channel: UpdateChannel, target?: string) => Promise<number>;
  readonly packages: (request: PackageCommandRequest) => Promise<number>;
}

export interface CliOutput {
  readonly stderr: (message: string) => void;
}

export function cliUsage(capabilities: CliCapabilities): string {
  return PRODUCT_TEXT.usage([
    "",
    ...(capabilities.developmentProfiles ? ["pi", "sandbox"] : []),
    "version",
    "update [self|--models]",
    "update:next",
    "update:<commit>",
    "pi install <source>",
    "pi remove <source>",
    "pi list",
    "pi update [--extensions|<source>]",
  ]);
}

const PROFILE_WORDS = new Set(["pi", "sandbox"]);

export async function dispatchCli(
  arguments_: readonly string[],
  handlers: CliHandlers,
  output: CliOutput,
  capabilities: CliCapabilities,
): Promise<number> {
  const command = parseCliCommand(arguments_, capabilities);
  if (command.kind === "error") {
    output.stderr(`${command.message}\n${cliUsage(capabilities)}\n`);
    return 2;
  }
  if (command.kind === "launch") return await handlers.launch(interactiveLaunchIntent(command.profileId));
  if (command.kind === "version") return await handlers.version();
  if (command.kind === "packages") return await handlers.packages(command.request);
  return await handlers.update(command.channel, command.target);
}

export type CliCommand =
  | { readonly kind: "launch"; readonly profileId: LaunchProfileId }
  | { readonly kind: "version" }
  | { readonly kind: "update"; readonly channel: UpdateChannel; readonly target?: string }
  | { readonly kind: "packages"; readonly request: PackageCommandRequest }
  | { readonly kind: "error"; readonly message: string };

export function parseCliCommand(arguments_: readonly string[], capabilities: CliCapabilities): CliCommand {
  if (arguments_.length === 0) return { kind: "launch", profileId: "a1" };
  const [command, ...rest] = arguments_;

  if (command === "pi") {
    if (rest.length > 0) return parsePiPackageCommand(rest);
    if (capabilities.developmentProfiles) return { kind: "launch", profileId: "pi" };
  }
  if (capabilities.developmentProfiles && command === "sandbox") {
    return withoutArguments(rest, { kind: "launch", profileId: command });
  }
  if (command === "version") return withoutArguments(rest, { kind: "version" });
  if (command !== undefined && command.startsWith("update:")) return parseColonUpdate(command.slice("update:".length), rest);
  if (command === "update") return parseUpdate(rest);
  if (command === "install" || command === "remove" || command === "uninstall" || command === "list") {
    return packageNamespaceRejection(command, rest.join(" ") || undefined);
  }

  if (command === "ui") return { kind: "error", message: `The ui subcommand was removed; run bare ${PRODUCT_TEXT.commandName} for the owned UI.` };
  if (command === "agent") return { kind: "error", message: `Bare ${PRODUCT_TEXT.commandName} is the ${PRODUCT_TEXT.displayName} agent experience; there is no agent subcommand.` };
  return { kind: "error", message: PRODUCT_TEXT.diagnostic(`received an unknown command: ${command ?? ""}`) };
}

/**
 * What follows the colon says which build to move to. `next` is the newest
 * preview; anything else names one outright, by the commit it was built from or by
 * its full version — a preview is published as `<version>-dev.<commit>`, so the
 * commit alone is enough to find it.
 */
function parseColonUpdate(suffix: string, rest: readonly string[]): CliCommand {
  if (rest.length > 0) return { kind: "error", message: PRODUCT_TEXT.diagnostic("update takes what to move to after the colon, and nothing else.") };
  if (suffix === "next") return { kind: "update", channel: "next" };
  if (suffix.length === 0) return { kind: "error", message: PRODUCT_TEXT.diagnostic(`update: needs a preview after the colon, as in ${PRODUCT_TEXT.commandName} update:next.`) };
  if (!/^[0-9a-z][0-9a-z.+-]*$/i.test(suffix)) {
    return { kind: "error", message: PRODUCT_TEXT.diagnostic(`received an unusable preview: ${suffix}`) };
  }
  return { kind: "update", channel: "next", target: suffix };
}
/**
 * Top-level `update` owns A1 itself and A1's model catalogs. Extension package
 * maintenance lives under the `pi` compatibility namespace, while updating the
 * pinned Pi runtime remains impossible.
 */
function parseUpdate(rest: readonly string[]): CliCommand {
  if (rest.length === 0) return { kind: "update", channel: "stable" };
  if (rest.length > 1) return { kind: "error", message: PRODUCT_TEXT.diagnostic("update accepts one target.") };
  const [target] = rest;
  if (target === "self") return { kind: "update", channel: "stable" };
  if (target === "pi") {
    return {
      kind: "error",
      message: PRODUCT_TEXT.diagnostic(`pins the Pi version it was certified against; run ${PRODUCT_TEXT.commandName} update to move ${PRODUCT_TEXT.displayName} itself.`),
    };
  }
  if (target === "next" || target === "stable") {
    const form = target === "next" ? `${PRODUCT_TEXT.commandName} update:next` : `${PRODUCT_TEXT.commandName} update`;
    return { kind: "error", message: PRODUCT_TEXT.diagnostic(`selects a release channel with a colon; run ${form}.`) };
  }
  if (target === "--models") return { kind: "packages", request: { verb: "refresh-models", source: null } };
  if (target === "--extensions" || (target !== undefined && !target.startsWith("-"))) {
    return packageNamespaceRejection("update", target === "--extensions" ? "--extensions" : target);
  }
  return unknownOption(target ?? "", "update");
}

function parsePiPackageCommand(arguments_: readonly string[]): CliCommand {
  const [verb, ...rest] = arguments_;
  if (verb === "install" || verb === "remove" || verb === "uninstall") {
    return parseSourceCommand(verb === "install" ? "install" : "remove", rest);
  }
  if (verb === "list") return withoutArguments(rest, { kind: "packages", request: { verb: "list", source: null } });
  if (verb === "update") return parsePiPackageUpdate(rest);
  return { kind: "error", message: PRODUCT_TEXT.diagnostic(`received an unknown pi package command: ${verb ?? ""}`) };
}

function parsePiPackageUpdate(rest: readonly string[]): CliCommand {
  if (rest.length === 0) {
    return { kind: "error", message: PRODUCT_TEXT.diagnostic(`pi update needs --extensions or a package source.`) };
  }
  if (rest.length > 1) return { kind: "error", message: PRODUCT_TEXT.diagnostic("pi update accepts one target.") };
  const [target] = rest;
  if (target === "--extensions") return { kind: "packages", request: { verb: "update", source: null } };
  if (target === "--models") {
    return { kind: "error", message: PRODUCT_TEXT.diagnostic(`refreshes its model catalogs at the top level; run ${PRODUCT_TEXT.commandName} update --models.`) };
  }
  if (target === undefined || target.startsWith("-")) return unknownOption(target ?? "", "pi update");
  if (PROFILE_WORDS.has(target)) return profileRejection("update");
  return { kind: "packages", request: { verb: "update", source: target } };
}

function parseSourceCommand(verb: "install" | "remove", rest: readonly string[]): CliCommand {
  const flag = rest.find(argument => argument.startsWith("-"));
  if (flag !== undefined) return unknownOption(flag, verb);
  if (rest.length === 0) return { kind: "error", message: PRODUCT_TEXT.diagnostic(`${verb} requires a package source.`) };
  if (rest.length > 1) return { kind: "error", message: PRODUCT_TEXT.diagnostic(`${verb} accepts one package source.`) };
  const [source] = rest;
  if (source === undefined) return { kind: "error", message: PRODUCT_TEXT.diagnostic(`${verb} requires a package source.`) };
  if (PROFILE_WORDS.has(source)) return profileRejection(verb);
  return { kind: "packages", request: { verb, source } };
}

function withoutArguments(rest: readonly string[], command: CliCommand): CliCommand {
  if (rest.length === 0) return command;
  const [argument] = rest;
  if (argument !== undefined && (PROFILE_WORDS.has(argument) || argument.startsWith("--profile"))) return profileRejection("list");
  return { kind: "error", message: PRODUCT_TEXT.diagnostic("commands do not accept additional arguments.") };
}

function packageNamespaceRejection(verb: string, target?: string): CliCommand {
  const suffix = target === undefined ? "" : ` ${target}`;
  return {
    kind: "error",
    message: PRODUCT_TEXT.diagnostic(`manages extension packages under its pi namespace; run ${PRODUCT_TEXT.commandName} pi ${verb}${suffix}.`),
  };
}

function profileRejection(verb: string): CliCommand {
  return {
    kind: "error",
    message: PRODUCT_TEXT.diagnostic(`manages packages in its own profile, so ${verb} takes no profile; Pi manages Pi's own profile.`),
  };
}

function unknownOption(option: string, verb: string): CliCommand {
  if (option.startsWith("--profile")) return profileRejection(verb);
  return { kind: "error", message: PRODUCT_TEXT.diagnostic(`received an unknown option for ${verb}: ${option}`) };
}
