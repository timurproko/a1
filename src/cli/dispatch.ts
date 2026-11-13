import { interactiveLaunchIntent, parseInteractiveLaunchArguments, type InteractiveLaunchArguments, type InteractiveLaunchIntent, type LaunchProfileId } from "../features/launch/index.js";
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
  readonly sessionColor?: (arguments_: readonly string[]) => Promise<number>;
  /** Removes A1 from the machine; absent in hosts that cannot uninstall. */
  readonly uninstall?: (request: { readonly yes: boolean; readonly purge: boolean }) => Promise<number>;
}

export interface CliOutput {
  readonly stdout: (message: string) => void;
  readonly stderr: (message: string) => void;
}

export function cliUsage(capabilities: CliCapabilities): string {
  return PRODUCT_TEXT.usage([
    "",
    "--session <path|id>",
    "--session-color <name> [-- literal prompt]",
    "--session-dir <dir> --session <path|id>",
    ...(capabilities.developmentComparison ? ["pi"] : []),
    "help",
    "version",
    "update",
    "update --release",
    "update --develop [preview-or-version]",
    "update --models",
    "update --extensions",
    "update <source>",
    "install <source>",
    "remove <source>",
    "uninstall [--yes] [--purge]",
    "uninstall <source>",
    "list",
    "worktree enter <branch> [--base <branch>]",
    "worktree attach <path>",
    "worktree detach",
    "worktree complete [--change <id>] [--pr <number>]",
    "worktree remove-local",
    "worktree list",
    "session color capabilities | list | get [--session <id>] | set <color> [--session <id>]",
    "session worktrees",
    "session link-worktree <path>",
    "session unlink-worktree",
  ]);
}

export function cliHelp(capabilities: CliCapabilities): string {
  const command = PRODUCT_TEXT.commandName;
  return [
    "Common:",
    `  ${command}`,
    `  ${command} --session <path|id>`,
    `  ${command} --session-color <name> [-- literal prompt]`,
    "  Colors: blue, green, orange, pink, purple, cyan, grey; invocation only.",
    "  Startup color wins before first paint and on successful replacements; live Current edits do not change it.",
    `  ${command} --session-dir <dir> --session <path|id>`,
    ...(capabilities.developmentComparison ? [`  ${command} pi`] : []),
    `  ${command} help`,
    `  ${command} version`,
    "",
    "Update:",
    `  ${command} update`,
    `  ${command} update --release`,
    `  ${command} update --develop [preview-or-version]`,
    `  ${command} update --models`,
    `  ${command} update --extensions`,
    `  ${command} update <source>`,
    "",
    "Packages:",
    `  ${command} install <source>`,
    `  ${command} remove <source>`,
    `  ${command} uninstall [--yes] [--purge]`,
    `  ${command} uninstall <source>`,
    `  ${command} list`,
    "",
    "Worktrees (successful enter/attach is authoritative; detach preserves files):",
    `  ${command} worktree enter <branch> [--base <branch>]`,
    `  ${command} worktree attach <path>`,
    `  ${command} worktree detach`,
    `  ${command} worktree complete [--change <id>] [--pr <number>]`,
    `  ${command} worktree remove-local`,
    `  ${command} worktree list`,
    "",
    "Session colors (always JSON; explicit session id required outside the session shell):",
    `  ${command} session color capabilities`,
    `  ${command} session color list`,
    `  ${command} session color get --session <id>`,
    `  ${command} session color set <color> --session <id>`,
    "  Capabilities: version 1, launchColor and terminalIdentity booleans; no interactive/Core startup.",
    "  Core-hosted bare A1 reports a1.session, a1.runtime, a1.at automatically; comparison is unchanged.",
    "",
    "Session context (compatibility aliases):",
    `  ${command} session worktrees`,
    `  ${command} session link-worktree <path>`,
    `  ${command} session unlink-worktree`,
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
  if (command.kind === "launch") return await handlers.launch(interactiveLaunchIntent(command.profileId, command.sessionSelection, command));
  if (command.kind === "version") return await handlers.version();
  if (command.kind === "packages") return await handlers.packages(command.request);
  if (command.kind === "session-context") return await handlers.sessionContext(command.request);
  if (command.kind === "session-color") {
    if (handlers.sessionColor) return await handlers.sessionColor(command.arguments);
    output.stdout(`${JSON.stringify({ error: { code: "control-unavailable", message: "Session color API is unavailable in this host." } })}\n`);
    return 1;
  }
  if (command.kind === "uninstall") return handlers.uninstall ? await handlers.uninstall(command.request) : 2;
  return await handlers.update(command.channel, command.target);
}

export type CliCommand =
  | { readonly kind: "noop" }
  | { readonly kind: "help" }
  | { readonly kind: "package-help"; readonly verb: PackageCliVerb; readonly namespace: PackageCommandNamespace }
  | { readonly kind: "package-error"; readonly diagnostic: PackageSyntaxDiagnostic; readonly namespace: PackageCommandNamespace }
  | ({ readonly kind: "launch"; readonly profileId: LaunchProfileId } & InteractiveLaunchArguments)
  | { readonly kind: "version" }
  | { readonly kind: "update"; readonly channel: UpdateChannel; readonly target?: string }
  | { readonly kind: "packages"; readonly request: PackageCommandRequest }
  | { readonly kind: "session-context"; readonly request: SessionContextRequest }
  | { readonly kind: "session-color"; readonly arguments: readonly string[] }
  | { readonly kind: "uninstall"; readonly request: { readonly yes: boolean; readonly purge: boolean } }
  | { readonly kind: "error"; readonly message: string };

export function parseCliCommand(arguments_: readonly string[], capabilities: CliCapabilities): CliCommand {
  if (arguments_.length === 0) return { kind: "launch", profileId: "a1" };
  const [command, ...rest] = arguments_;

  if (command === "--session" || command === "--session-dir" || command === "--session-color" || command === "--") {
    try {
      return { kind: "launch", profileId: "a1", ...parseInteractiveLaunchArguments(arguments_) };
    } catch (error) {
      return { kind: "error", message: PRODUCT_TEXT.diagnostic(`could not parse session launch: ${error instanceof Error ? error.message : String(error)}`) };
    }
  }
  if (command === "help" || command === "--help" || command === "-h") return withoutArguments(rest, { kind: "help" });
  if (command === "version" || command === "--version" || command === "-v") return withoutArguments(rest, { kind: "version" });
  // Compatibility: a source keeps `uninstall` as package removal; without one it removes A1.
  if (command === "uninstall" && rest.every(value => value === "--yes" || value === "--purge")
    && new Set(rest).size === rest.length) {
    return { kind: "uninstall", request: { yes: rest.includes("--yes"), purge: rest.includes("--purge") } };
  }
  if (command === "install" || command === "remove" || command === "uninstall" || command === "list") {
    return parsePackageCommand(arguments_, "direct");
  }
  if (command === "pi") {
    if (rest.length > 0) return parsePackageCommand(rest, "pi");
    return capabilities.developmentComparison ? { kind: "launch", profileId: "pi" } : { kind: "noop" };
  }
  if (command === "update") return parseUpdate(rest, capabilities.runningChannel ?? "stable");
  if (command === "worktree") return parseWorktree(rest);
  if (command === "session" && rest[0] === "color") return { kind: "session-color", arguments: rest.slice(1) };
  if (command === "session") return parseSessionContext(rest);
  if (command?.startsWith("update:")) return { kind: "noop" };

  // Rationale: unsupported and reserved command spaces are deliberately quiet. Help is
  // explicit, and a typo must never start an interactive or maintenance path.
  return { kind: "noop" };
}

function parseWorktree(rest: readonly string[]): CliCommand {
  const [action, value, flag, base, extra] = rest;
  if (action === "enter" && value !== undefined && !value.startsWith("-")
    && (flag === undefined || (flag === "--base" && base !== undefined && !base.startsWith("-"))) && extra === undefined) {
    return { kind: "session-context", request: { action: "enter-worktree", branch: value, ...(base === undefined ? {} : { base }) } };
  }
  if (action === "attach" && value !== undefined && flag === undefined) {
    return { kind: "session-context", request: { action: "link-worktree", path: value } };
  }
  if ((action === "detach" || action === "list") && value === undefined) {
    return { kind: "session-context", request: { action: action === "detach" ? "unlink-worktree" : "worktrees" } };
  }
  if (action === "remove-local" && value === undefined) {
    return { kind: "session-context", request: { action: "remove-local-worktree" } };
  }
  if (action === "complete") {
    const selectors = rest.slice(1);
    let change: string | undefined, pr: number | undefined;
    let valid = selectors.length % 2 === 0;
    for (let index = 0; valid && index < selectors.length; index += 2) {
      const name = selectors[index], selected = selectors[index + 1] ?? "";
      if (name === "--change" && change === undefined && /^[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(selected)) change = selected;
      else if (name === "--pr" && pr === undefined && /^[1-9][0-9]{0,8}$/u.test(selected)) pr = Number(selected);
      else valid = false;
    }
    if (valid) {
      return { kind: "session-context", request: { action: "complete-worktree", ...(change === undefined ? {} : { change }), ...(pr === undefined ? {} : { pr }) } };
    }
  }
  return { kind: "error", message: PRODUCT_TEXT.diagnostic("worktree accepts enter <branch> [--base <branch>], attach <path>, detach, complete [--change <id>] [--pr <number>], remove-local, or list.") };
}

function parseSessionContext(rest: readonly string[]): CliCommand {
  const [action, value, extra] = rest;
  if (action === "link-worktree") {
    if (value === undefined) return { kind: "error", message: PRODUCT_TEXT.diagnostic("session link-worktree requires one path.") };
    if (extra !== undefined) return { kind: "error", message: PRODUCT_TEXT.diagnostic("session link-worktree accepts one path.") };
    return { kind: "session-context", request: { action, path: value } };
  }
  if (action === "unlink-worktree" || action === "worktrees") {
    if (value !== undefined) return { kind: "error", message: PRODUCT_TEXT.diagnostic(`session ${action} does not accept arguments.`) };
    return { kind: "session-context", request: { action } };
  }
  return { kind: "error", message: PRODUCT_TEXT.diagnostic("session accepts worktrees, link-worktree <path>, or unlink-worktree.") };
}

/**
 * The empty form stays on the running channel; `--release` moves to stable. `--develop` selects
 * the moving development head or one immutable numbered preview, while model refresh remains a
 * separate operation that cannot be combined with either update channel.
 */
function parseUpdate(rest: readonly string[], runningChannel: UpdateChannel): CliCommand {
  if (rest.some(value => value === "--help" || value === "-h")) {
    return { kind: "package-help", verb: "update", namespace: "direct" };
  }
  if (rest.length === 0) return { kind: "update", channel: runningChannel };
  const [selector, ...values] = rest;

  if (selector === "--release") {
    if (values.length > 0) return updateGrammarError("--release cannot be combined with another update selector.");
    return { kind: "update", channel: "stable" };
  }

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
