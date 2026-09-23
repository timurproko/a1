import { interactiveLaunchIntent, parseSessionSelection, type InteractiveLaunchIntent, type LaunchProfileId, type SessionSelection } from "../features/launch/index.js";
import type { CliCapabilities } from "./capabilities.js";
import type { PackageCommandRequest } from "./packages.js";
import type { SessionContextRequest } from "./session-context.js";
import {
  packageCommandHelp,
  renderPackageSyntax,
  type PackageCliVerb,
  type PackageCommandNamespace,
  type PackageSyntaxDiagnostic,
} from "./package-messages.js";
import { PRODUCT_TEXT } from "../product-identity.js";

export type UpdateChannel = "stable" | "next";

export interface CliHandlers {
  readonly launch: (intent: InteractiveLaunchIntent) => Promise<number>;
  readonly version: () => Promise<number>;
  readonly update: (channel: UpdateChannel, target?: string) => Promise<number>;
  readonly packages: (request: PackageCommandRequest) => Promise<number>;
  readonly sessionContext: (request: SessionContextRequest) => Promise<number>;
}

export interface CliOutput {
  readonly stdout: (message: string) => void;
  readonly stderr: (message: string) => void;
}

export function cliUsage(capabilities: CliCapabilities): string {
  return PRODUCT_TEXT.usage([
    "",
    "--session <path|id>",
    "--session-dir <dir> --session <path|id>",
    ...(capabilities.developmentComparison ? ["pi"] : []),
    "help",
    "version",
    "update",
    "update --develop [preview-or-version]",
    "update --models",
    "update --extensions",
    "update <source>",
    "install <source>",
    "remove <source>",
    "uninstall <source>",
    "list",
    "session link-worktree <path>",
    "session unlink-worktree",
    "--help",
    "-h",
    "--version",
    "-v",
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
    `  ${command} --session <path|id>`,
    `  ${command} --session-dir <dir> --session <path|id>`,
    ...(capabilities.developmentComparison ? [`  ${command} pi`] : []),
    `  ${command} help`,
    `  ${command} version`,
    "",
    "Update:",
    `  ${command} update`,
    `  ${command} update --develop [preview-or-version]`,
    `  ${command} update --models`,
    `  ${command} update --extensions`,
    `  ${command} update <source>`,
    "",
    "Packages:",
    `  ${command} install <source>`,
    `  ${command} remove <source>`,
    `  ${command} uninstall <source>`,
    `  ${command} list`,
    "",
    "Session context:",
    `  ${command} session link-worktree <path>`,
    `  ${command} session unlink-worktree`,
    "",
    "Compatibility aliases:",
    `  ${command} --help | ${command} -h`,
    `  ${command} --version | ${command} -v`,
    `  ${command} pi install <source>`,
    `  ${command} pi remove <source> | ${command} pi uninstall <source>`,
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
  if (command.kind === "package-help") {
    output.stdout(packageCommandHelp(command.verb, command.namespace));
    return 0;
  }
  if (command.kind === "package-error") {
    output.stderr(renderPackageSyntax(command.diagnostic, command.namespace));
    return 2;
  }
  if (command.kind === "error") {
    output.stderr(`${command.message}\n`);
    return 2;
  }
  if (command.kind === "launch") return await handlers.launch(interactiveLaunchIntent(command.profileId, command.sessionSelection));
  if (command.kind === "version") return await handlers.version();
  if (command.kind === "packages") return await handlers.packages(command.request);
  if (command.kind === "session-context") return await handlers.sessionContext(command.request);
  return await handlers.update(command.channel, command.target);
}

export type CliCommand =
  | { readonly kind: "noop" }
  | { readonly kind: "help" }
  | { readonly kind: "package-help"; readonly verb: PackageCliVerb; readonly namespace: PackageCommandNamespace }
  | { readonly kind: "package-error"; readonly diagnostic: PackageSyntaxDiagnostic; readonly namespace: PackageCommandNamespace }
  | { readonly kind: "launch"; readonly profileId: LaunchProfileId; readonly sessionSelection?: SessionSelection }
  | { readonly kind: "version" }
  | { readonly kind: "update"; readonly channel: UpdateChannel; readonly target?: string }
  | { readonly kind: "packages"; readonly request: PackageCommandRequest }
  | { readonly kind: "session-context"; readonly request: SessionContextRequest }
  | { readonly kind: "error"; readonly message: string };

export function parseCliCommand(arguments_: readonly string[], capabilities: CliCapabilities): CliCommand {
  if (arguments_.length === 0) return { kind: "launch", profileId: "a1" };
  const [command, ...rest] = arguments_;

  if (command === "--session" || command === "--session-dir") {
    try {
      const sessionSelection = parseSessionSelection(arguments_);
      return { kind: "launch", profileId: "a1", ...(sessionSelection === undefined ? {} : { sessionSelection }) };
    } catch (error) {
      return { kind: "error", message: PRODUCT_TEXT.diagnostic(`could not parse session launch: ${error instanceof Error ? error.message : String(error)}`) };
    }
  }
  if (command === "help" || command === "--help" || command === "-h") return withoutArguments(rest, { kind: "help" });
  if (command === "version" || command === "--version" || command === "-v") return withoutArguments(rest, { kind: "version" });
  if (command === "install" || command === "remove" || command === "uninstall" || command === "list") {
    return parsePackageCommand(arguments_, "direct");
  }
  if (command === "pi") {
    if (rest.length > 0) return parsePackageCommand(rest, "pi");
    return capabilities.developmentComparison ? { kind: "launch", profileId: "pi" } : { kind: "noop" };
  }
  if (command === "update") return parseUpdate(rest);
  if (command === "session") return parseSessionContext(rest);
  if (command?.startsWith("update:")) return { kind: "noop" };

  // Rationale: unsupported and reserved command spaces are deliberately quiet. Help is
  // explicit, and a typo must never start an interactive or maintenance path.
  return { kind: "noop" };
}

function parseSessionContext(rest: readonly string[]): CliCommand {
  const [action, value, extra] = rest;
  if (action === "link-worktree") {
    if (value === undefined) return { kind: "error", message: PRODUCT_TEXT.diagnostic("session link-worktree requires one path.") };
    if (extra !== undefined) return { kind: "error", message: PRODUCT_TEXT.diagnostic("session link-worktree accepts one path.") };
    return { kind: "session-context", request: { action, path: value } };
  }
  if (action === "unlink-worktree") {
    if (value !== undefined) return { kind: "error", message: PRODUCT_TEXT.diagnostic("session unlink-worktree does not accept arguments.") };
    return { kind: "session-context", request: { action } };
  }
  return { kind: "error", message: PRODUCT_TEXT.diagnostic("session accepts link-worktree <path> or unlink-worktree.") };
}

/**
 * Stable update is the empty form. `--develop` selects the moving development
 * head or one immutable numbered preview, while model refresh remains a separate
 * operation that cannot be combined with either update channel.
 */
function parseUpdate(rest: readonly string[]): CliCommand {
  if (rest.some(value => value === "--help" || value === "-h")) {
    return { kind: "package-help", verb: "update", namespace: "direct" };
  }
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
  if (selector === "--self" || selector === "--all") return unknownOption(selector, "update");
  return parsePackageUpdate(rest, "direct");
}

function isDevelopmentTarget(target: string): boolean {
  return /^[1-9]\d*$/.test(target) || /^\d+\.\d+\.\d+-dev\.[1-9]\d*$/.test(target);
}

function updateGrammarError(detail: string): CliCommand {
  return { kind: "error", message: PRODUCT_TEXT.diagnostic(`could not parse update: ${detail}`) };
}

function parsePackageCommand(arguments_: readonly string[], namespace: PackageCommandNamespace): CliCommand {
  const [verb, ...rest] = arguments_;
  if ((verb === "install" || verb === "remove" || verb === "uninstall" || verb === "list" || verb === "update")
    && rest.some(value => value === "--help" || value === "-h")) {
    return { kind: "package-help", verb: verb === "uninstall" ? "remove" : verb, namespace };
  }
  if (verb === "install" || verb === "remove" || verb === "uninstall") {
    return parseSourceCommand(verb === "install" ? "install" : "remove", rest, namespace);
  }
  if (verb === "list") {
    const flag = rest.find(argument => argument.startsWith("-"));
    if (flag !== undefined) return packageOptionError(flag, "list", namespace);
    if (rest[0] !== undefined) return packageSyntax({ verb: "list", kind: "unexpected-argument", value: rest[0] }, namespace);
    return { kind: "packages", request: { verb: "list", source: null } };
  }
  if (verb === "update") return parsePackageUpdate(rest, namespace);
  return { kind: "noop" };
}

function parsePackageUpdate(rest: readonly string[], namespace: PackageCommandNamespace): CliCommand {
  if (rest.length === 0) return pinnedPiUpdateError();
  if (rest.length > 1) {
    const unknown = rest.find(value => value.startsWith("-") && !["--extensions", "--models", "--self", "--all"].includes(value));
    if (unknown !== undefined) return packageOptionError(unknown, "update", namespace);
    if (rest.includes("--self") || rest.includes("--all") || rest.includes("self") || rest.includes("pi")) return pinnedPiUpdateError();
    if (rest.every(value => value === rest[0]) && rest[0]?.startsWith("-")) {
      const command = namespace === "direct" ? "update" : "pi update";
      return { kind: "error", message: PRODUCT_TEXT.diagnostic(`${command} accepts one target.`) };
    }
    const sources = rest.filter(value => !value.startsWith("-"));
    if (sources[1] !== undefined) return packageSyntax({ verb: "update", kind: "unexpected-argument", value: sources[1] }, namespace);
    const message = rest.includes("--models")
      ? rest.includes("--extensions")
        ? "--models cannot be combined with --self, --extensions, --all, or --extension"
        : "--models cannot be combined with a positional source"
      : "positional update targets cannot be combined with --self, --extensions, or --all";
    return packageSyntax({ verb: "update", kind: "conflict", message }, namespace);
  }
  const [target] = rest;
  if (target === "--extensions") return { kind: "packages", request: { verb: "update", source: null } };
  if (target === "--models") return { kind: "packages", request: { verb: "refresh-models", source: null } };
  if (target === "--self" || target === "--all" || target === "self" || target === "pi") return pinnedPiUpdateError();
  if (target === undefined || target.startsWith("-")) return packageOptionError(target ?? "", "update", namespace);
  return { kind: "packages", request: { verb: "update", source: target } };
}

function pinnedPiUpdateError(): CliCommand {
  return {
    kind: "error",
    message: [
      PRODUCT_TEXT.diagnostic("pins its certified Pi runtime and cannot update it independently."),
      "Use:",
      `  ${PRODUCT_TEXT.commandName} update                    Update a1`,
      `  ${PRODUCT_TEXT.commandName} update --extensions       Update Pi-compatible packages`,
      `  ${PRODUCT_TEXT.commandName} update --models           Refresh model catalogs`,
    ].join("\n"),
  };
}

function parseSourceCommand(
  verb: "install" | "remove",
  rest: readonly string[],
  namespace: PackageCommandNamespace,
): CliCommand {
  const flag = rest.find(argument => argument.startsWith("-"));
  if (flag !== undefined) return packageOptionError(flag, verb, namespace);
  const [source, extra] = rest;
  if (extra !== undefined) return packageSyntax({ verb, kind: "unexpected-argument", value: extra }, namespace);
  if (source === undefined) return packageSyntax({ verb, kind: "missing-source" }, namespace);
  if (PROFILE_WORDS.has(source)) return profileRejection(verb);
  return { kind: "packages", request: { verb, source } };
}

function packageSyntax(diagnostic: PackageSyntaxDiagnostic, namespace: PackageCommandNamespace): CliCommand {
  return { kind: "package-error", diagnostic, namespace };
}

function packageOptionError(option: string, verb: PackageCliVerb, namespace: PackageCommandNamespace): CliCommand {
  if (option.startsWith("--profile") || option === "-l" || option === "--local") return profileRejection(verb);
  // Compatibility: these recognized Pi flags remain outside A1's supported subset.
  if (["--extension", "--approve", "--no-approve", "-a", "-na", "--force"].includes(option)) {
    return unknownOption(option, namespace === "direct" ? verb : `pi ${verb}`);
  }
  return packageSyntax({ verb, kind: "unknown-option", value: option }, namespace);
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
