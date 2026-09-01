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
  readonly stdout: (message: string) => void;
  readonly stderr: (message: string) => void;
}

export function cliUsage(capabilities: CliCapabilities): string {
  return PRODUCT_TEXT.usage([
    "",
    ...(capabilities.developmentComparison ? ["pi"] : []),
    "--help",
    "-h",
    "--version",
    "-v",
    "update",
    "update --develop [preview-or-version]",
    "update --models",
    "pi install <source>",
    "pi remove <source>",
    "pi uninstall <source>",
    "pi list",
    "pi update --extensions",
    "pi update --models",
    "pi update <source>",
  ]);
}

export function cliHelp(capabilities: CliCapabilities): string {
  const command = PRODUCT_TEXT.commandName;
  return [
    "Common:",
    `  ${command}`,
    ...(capabilities.developmentComparison ? [`  ${command} pi`] : []),
    `  ${command} --help`,
    `  ${command} -h`,
    `  ${command} --version`,
    `  ${command} -v`,
    "",
    "Update:",
    `  ${command} update`,
    `  ${command} update --develop [preview-or-version]`,
    `  ${command} update --models`,
    "",
    "Pi-compatible packages:",
    `  ${command} pi install <source>`,
    `  ${command} pi remove <source>`,
    `  ${command} pi uninstall <source>`,
    `  ${command} pi list`,
    `  ${command} pi update --extensions`,
    `  ${command} pi update --models`,
    `  ${command} pi update <source>`,
    "",
  ].join("\n");
}

const PROFILE_WORDS = new Set(["pi"]);

export async function dispatchCli(
  arguments_: readonly string[],
  handlers: CliHandlers,
  output: CliOutput,
  capabilities: CliCapabilities,
): Promise<number> {
  const command = parseCliCommand(arguments_, capabilities);
  if (command.kind === "noop") return 0;
  if (command.kind === "help") {
    output.stdout(cliHelp(capabilities));
    return 0;
  }
  if (command.kind === "error") {
    output.stderr(`${command.message}\n`);
    return 2;
  }
  if (command.kind === "launch") return await handlers.launch(interactiveLaunchIntent(command.profileId));
  if (command.kind === "version") return await handlers.version();
  if (command.kind === "packages") return await handlers.packages(command.request);
  return await handlers.update(command.channel, command.target);
}

export type CliCommand =
  | { readonly kind: "noop" }
  | { readonly kind: "help" }
  | { readonly kind: "launch"; readonly profileId: LaunchProfileId }
  | { readonly kind: "version" }
  | { readonly kind: "update"; readonly channel: UpdateChannel; readonly target?: string }
  | { readonly kind: "packages"; readonly request: PackageCommandRequest }
  | { readonly kind: "error"; readonly message: string };

export function parseCliCommand(arguments_: readonly string[], capabilities: CliCapabilities): CliCommand {
  if (arguments_.length === 0) return { kind: "launch", profileId: "a1" };
  const [command, ...rest] = arguments_;

  if (command === "--help" || command === "-h") return withoutArguments(rest, { kind: "help" });
  if (command === "--version" || command === "-v") return withoutArguments(rest, { kind: "version" });
  if (command === "pi") {
    if (rest.length > 0) return parsePiPackageCommand(rest);
    return capabilities.developmentComparison ? { kind: "launch", profileId: "pi" } : { kind: "noop" };
  }
  if (command === "update") return parseUpdate(rest);
  if (command?.startsWith("update:")) return { kind: "noop" };

  // Rationale: unsupported and reserved command spaces are deliberately quiet. Help is
  // explicit, and a typo must never start an interactive or maintenance path.
  return { kind: "noop" };
}

/**
 * Stable update is the empty form. `--develop` selects the moving development
 * head or one immutable numbered preview, while model refresh remains a separate
 * operation that cannot be combined with either update channel.
 */
function parseUpdate(rest: readonly string[]): CliCommand {
  if (rest.length === 0) return { kind: "update", channel: "stable" };
  const [selector, ...values] = rest;

  // Compatibility: removed notation is unsupported rather than deprecated.
  if (selector === "self") return { kind: "noop" };

  if (selector === "--develop") {
    if (values.length === 0) return { kind: "update", channel: "next" };
    if (values.length > 1) return updateGrammarError("--develop accepts at most one preview number or version.");
    const [target] = values;
    if (target === undefined || !isDevelopmentTarget(target)) {
      return updateGrammarError(`--develop received an unusable preview: ${target ?? ""}`);
    }
    return { kind: "update", channel: "next", target };
  }

  if (selector === "--models") {
    if (values.length > 0) return updateGrammarError("--models cannot be combined with another update selector.");
    return { kind: "packages", request: { verb: "refresh-models", source: null } };
  }

  if (selector === "pi") return pinnedPiUpdateError();
  if (selector !== undefined && selector.startsWith("-")) return unknownOption(selector, "update");

  // Rationale: positional update targets are reserved for a future A1-native plugin model.
  return { kind: "noop" };
}

function isDevelopmentTarget(target: string): boolean {
  return /^[1-9]\d*$/.test(target) || /^\d+\.\d+\.\d+-dev\.[1-9]\d*$/.test(target);
}

function updateGrammarError(detail: string): CliCommand {
  return { kind: "error", message: PRODUCT_TEXT.diagnostic(`could not parse update: ${detail}`) };
}

function parsePiPackageCommand(arguments_: readonly string[]): CliCommand {
  const [verb, ...rest] = arguments_;
  if (verb === "install" || verb === "remove" || verb === "uninstall") {
    return parseSourceCommand(verb === "install" ? "install" : "remove", rest);
  }
  if (verb === "list") return withoutArguments(rest, { kind: "packages", request: { verb: "list", source: null } });
  if (verb === "update") return parsePiPackageUpdate(rest);
  return { kind: "noop" };
}

function parsePiPackageUpdate(rest: readonly string[]): CliCommand {
  if (rest.length === 0) return pinnedPiUpdateError();
  if (rest.length > 1) return { kind: "error", message: PRODUCT_TEXT.diagnostic("pi update accepts one target.") };
  const [target] = rest;
  if (target === "--extensions") return { kind: "packages", request: { verb: "update", source: null } };
  if (target === "--models") return { kind: "packages", request: { verb: "refresh-models", source: null } };
  if (target === "--self" || target === "--all" || target === "self" || target === "pi") return pinnedPiUpdateError();
  if (target === undefined || target.startsWith("-")) return unknownOption(target ?? "", "pi update");
  return { kind: "packages", request: { verb: "update", source: target } };
}

function pinnedPiUpdateError(): CliCommand {
  return {
    kind: "error",
    message: [
      PRODUCT_TEXT.diagnostic("pins its certified Pi runtime and cannot update it independently."),
      "Use:",
      `  ${PRODUCT_TEXT.commandName} update                    Update A1`,
      `  ${PRODUCT_TEXT.commandName} pi update --extensions    Update Pi-compatible packages`,
      `  ${PRODUCT_TEXT.commandName} pi update --models        Refresh model catalogs`,
    ].join("\n"),
  };
}

function parseSourceCommand(verb: "install" | "remove", rest: readonly string[]): CliCommand {
  const flag = rest.find(argument => argument.startsWith("-"));
  if (flag !== undefined) return unknownOption(flag, `pi ${verb}`);
  if (rest.length === 0) return { kind: "error", message: PRODUCT_TEXT.diagnostic(`${verb} requires a package source.`) };
  if (rest.length > 1) return { kind: "error", message: PRODUCT_TEXT.diagnostic(`${verb} accepts one package source.`) };
  const [source] = rest;
  if (source === undefined) return { kind: "error", message: PRODUCT_TEXT.diagnostic(`${verb} requires a package source.`) };
  if (PROFILE_WORDS.has(source)) return profileRejection(verb);
  return { kind: "packages", request: { verb, source } };
}

function withoutArguments(rest: readonly string[], command: CliCommand): CliCommand {
  if (rest.length === 0) return command;
  return { kind: "error", message: PRODUCT_TEXT.diagnostic("commands do not accept additional arguments.") };
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
