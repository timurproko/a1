import { interactiveLaunchIntent, type InteractiveLaunchArguments, type InteractiveLaunchIntent, type LaunchProfileId } from "../features/launch/index.js";
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

import { interactiveOptionHelp, parseInteractiveCommand } from "./interactive-options.js";
import type { RuntimeLaunchOptions } from "../foundation/launch-context/index.js";

export type UpdateChannel = "stable" | "next";

export interface CliHandlers {
  readonly launch: (intent: InteractiveLaunchIntent) => Promise<number>;
  readonly version: () => Promise<number>;
  readonly catalog?: (options: RuntimeLaunchOptions, search?: string) => Promise<number>;
  readonly update: (channel: UpdateChannel, target?: string) => Promise<number>;
  readonly packages: (request: PackageCommandRequest) => Promise<number>;
  readonly sessionContext: (request: SessionContextRequest) => Promise<number>;
  readonly api?: (arguments_: readonly string[]) => Promise<number>;
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
    "worktree enter <branch> [--repo <absolute-path>] [--base <branch>]",
    "worktree attach <path>",
    "worktree detach",
    "worktree complete [--change <id>] [--pr <number>]",
    "worktree list [--repo <absolute-path>]",
    "worktree status",
    "api <request-json>",
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
    "Interactive launch:",
    ...interactiveOptionHelp(),
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
    `  ${command} worktree enter <branch> [--repo <absolute-path>] [--base <branch>]`,
    `  ${command} worktree attach <path>`,
    `  ${command} worktree detach`,
    `  ${command} worktree complete [--change <id>] [--pr <number>]`,
    `  ${command} worktree list [--repo <absolute-path>]`,
    `  ${command} worktree status`,
    "",
    'Integration API: a1 api \'{"version":1,"id":"discovery","type":"capabilities"}\'',
    "  Versioned JSON request/response; exact sessionId and runtimeId required for live operations.",
    "  Operations: capabilities, settings.list, settings.get, settings.update, session.get, session.lifecycle, session.exit, session.rename.",
    "  session.exit stops an idle session through the /quit path only when nothing would be lost; admitted is not exited.",
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
  if (command.kind === "catalog") {
    if (handlers.catalog) return await handlers.catalog(command.runtimeOptions, command.search);
    output.stderr("Model catalog is unavailable in this host.\n");
    return 2;
  }
  if (command.kind === "packages") return await handlers.packages(command.request);
  if (command.kind === "session-context") return await handlers.sessionContext(command.request);
  if (command.kind === "api") {
    if (handlers.api) return await handlers.api(command.arguments);
    output.stdout(`${JSON.stringify({ version: 1, id: null, type: "response", command: null, success: false, error: { code: "control-unavailable", message: "Integration API is unavailable in this host." } })}\n`);
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
  | { readonly kind: "catalog"; readonly runtimeOptions: RuntimeLaunchOptions; readonly search?: string }
  | { readonly kind: "update"; readonly channel: UpdateChannel; readonly target?: string }
  | { readonly kind: "packages"; readonly request: PackageCommandRequest }
  | { readonly kind: "session-context"; readonly request: SessionContextRequest }
  | { readonly kind: "api"; readonly arguments: readonly string[] }
  | { readonly kind: "uninstall"; readonly request: { readonly yes: boolean; readonly purge: boolean } }
  | { readonly kind: "error"; readonly message: string };

export function parseCliCommand(arguments_: readonly string[], capabilities: CliCapabilities): CliCommand {
  if (arguments_.length === 0) return { kind: "launch", profileId: "a1" };
  const [command, ...rest] = arguments_;

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
  if (command === "api") return { kind: "api", arguments: rest };
  if (command === "update") return parseUpdate(rest, capabilities.runningChannel ?? "stable");
  if (command === "worktree") return parseWorktree(rest);
  if (command === "session") return parseSessionContext(rest);
  if (command?.startsWith("update:") || ["agent", "solo", "ui", "tabs"].includes(command ?? "")) {
    return { kind: "error", message: PRODUCT_TEXT.diagnostic("unsupported reserved command; use -- before a literal instruction.") };
  }
  if (["config", "auth", "mcp"].includes(command ?? "")) {
    return { kind: "error", message: PRODUCT_TEXT.diagnostic(`${command} is not supported.`) };
  }
  return parseInteractiveCommand(arguments_);
}

function parseWorktree(rest: readonly string[]): CliCommand {
  const [action, value, flag] = rest;
  if (action === "enter" && value !== undefined && !value.startsWith("-")) {
    const flags = rest.slice(2);
    let base: string | undefined, repo: string | undefined;
    let valid = flags.length % 2 === 0;
    for (let index = 0; valid && index < flags.length; index += 2) {
      const name = flags[index], selected = flags[index + 1];
      if (!selected || selected.startsWith("-")) valid = false;
      else if (name === "--base" && base === undefined) base = selected;
      else if (name === "--repo" && repo === undefined) repo = selected;
      else valid = false;
    }
    if (valid) return { kind: "session-context", request: { action: "enter-worktree", branch: value, ...(base === undefined ? {} : { base }), ...(repo === undefined ? {} : { repo }) } };
  }
  if (action === "attach" && value !== undefined && flag === undefined) {
    return { kind: "session-context", request: { action: "link-worktree", path: value } };
  }
  if ((action === "detach" || action === "list" || action === "status") && value === undefined) {
    return { kind: "session-context", request: { action: action === "detach" ? "unlink-worktree" : action === "list" ? "worktrees" : "worktree-status" } };
  }
  if (action === "list" && value === "--repo" && flag && !flag.startsWith("-") && rest.length === 3) {
    return { kind: "session-context", request: { action: "worktrees", repo: flag } };
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
  return { kind: "error", message: PRODUCT_TEXT.diagnostic("worktree accepts enter <branch> [--repo <absolute-path>] [--base <branch>], attach <absolute-path>, detach, status, complete [--change <id>] [--pr <number>], or list [--repo <absolute-path>].") };
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
  if (selector === "self") return updateGrammarError("use bare update for the A1 product; independent Pi updates are not supported.");

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
