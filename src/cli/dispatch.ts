import { interactiveLaunchIntent, type InteractiveLaunchIntent, type LaunchProfileId } from "../features/launch/index.js";
import type { PackageCommandRequest } from "./packages.js";
import { PRODUCT_TEXT } from "../product-identity.js";

export type UpdateChannel = "stable" | "next";

export interface CliHandlers {
  readonly launch: (intent: InteractiveLaunchIntent) => Promise<number>;
  readonly version: () => Promise<number>;
  readonly update: (channel: UpdateChannel) => Promise<number>;
  readonly packages: (request: PackageCommandRequest) => Promise<number>;
}

export interface CliOutput {
  readonly stderr: (message: string) => void;
}

export const CLI_USAGE = PRODUCT_TEXT.usage([
  "",
  "pi",
  "sandbox",
  "version",
  "update [self|<source>|--extensions|--models]",
  "update:next",
  "install <source>",
  "remove <source>",
  "list",
]);

const PROFILE_WORDS = new Set(["pi", "sandbox"]);

export async function dispatchCli(
  arguments_: readonly string[],
  handlers: CliHandlers,
  output: CliOutput,
): Promise<number> {
  const command = parseCliCommand(arguments_);
  if (command.kind === "error") {
    output.stderr(`${command.message}\n${CLI_USAGE}\n`);
    return 2;
  }
  if (command.kind === "launch") return await handlers.launch(interactiveLaunchIntent(command.profileId));
  if (command.kind === "version") return await handlers.version();
  if (command.kind === "packages") return await handlers.packages(command.request);
  return await handlers.update(command.channel);
}

export type CliCommand =
  | { readonly kind: "launch"; readonly profileId: LaunchProfileId }
  | { readonly kind: "version" }
  | { readonly kind: "update"; readonly channel: UpdateChannel }
  | { readonly kind: "packages"; readonly request: PackageCommandRequest }
  | { readonly kind: "error"; readonly message: string };

export function parseCliCommand(arguments_: readonly string[]): CliCommand {
  if (arguments_.length === 0) return { kind: "launch", profileId: "a1" };
  const [command, ...rest] = arguments_;

  if (command === "pi" || command === "sandbox") return withoutArguments(rest, { kind: "launch", profileId: command });
  if (command === "version") return withoutArguments(rest, { kind: "version" });
  if (command === "update:next") return withoutArguments(rest, { kind: "update", channel: "next" });
  if (command === "update") return parseUpdate(rest);
  if (command === "install" || command === "remove" || command === "uninstall") {
    return parseSourceCommand(command === "install" ? "install" : "remove", rest);
  }
  if (command === "list") return withoutArguments(rest, { kind: "packages", request: { verb: "list", source: null } });

  if (command === "ui") return { kind: "error", message: `The ui subcommand was removed; run bare ${PRODUCT_TEXT.commandName} for the owned UI.` };
  if (command === "agent") return { kind: "error", message: `Bare ${PRODUCT_TEXT.commandName} is the ${PRODUCT_TEXT.displayName} agent experience; there is no agent subcommand.` };
  return { kind: "error", message: PRODUCT_TEXT.diagnostic(`received an unknown command: ${command ?? ""}`) };
}

/**
 * `update` carries both meanings pinned Pi gives it: itself by default, and the
 * profile's packages when a target says so. Pi is refused as a target because A1
 * certifies each release against one pinned Pi, so moving Pi underneath it would
 * invalidate what was certified.
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
  // A release channel is spelled with the colon. Taking the bare word as a package
  // source would turn a near miss into a confident search for a package nobody has.
  if (target === "next" || target === "stable") {
    const form = target === "next" ? `${PRODUCT_TEXT.commandName} update:next` : `${PRODUCT_TEXT.commandName} update`;
    return { kind: "error", message: PRODUCT_TEXT.diagnostic(`selects a release channel with a colon; run ${form}.`) };
  }
  if (target === "--extensions") return { kind: "packages", request: { verb: "update", source: null } };
  if (target === "--models") return { kind: "packages", request: { verb: "refresh-models", source: null } };
  if (target === undefined || target.startsWith("-")) return unknownOption(target ?? "", "update");
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

function profileRejection(verb: string): CliCommand {
  return {
    kind: "error",
    message: PRODUCT_TEXT.diagnostic(`manages packages in its own profile, so ${verb} takes no profile; Pi manages ${PRODUCT_TEXT.commandName} pi and the sandbox takes no packages.`),
  };
}

function unknownOption(option: string, verb: string): CliCommand {
  if (option.startsWith("--profile")) return profileRejection(verb);
  return { kind: "error", message: PRODUCT_TEXT.diagnostic(`received an unknown option for ${verb}: ${option}`) };
}
