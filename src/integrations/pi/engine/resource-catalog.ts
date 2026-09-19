import { isRecord, stringProperty } from "./message-values.js";
import type { AgentSession, AgentSessionRuntime } from "../startup-public.js";
import type { PiWorkflowContexts } from "./workflow-contexts.js";
import { OWNED_MODELS_COMMAND_NAME, workflowCommandNames, type PiProductMode, type PiWorkflowAutocompleteCommand } from "./workflows.js";

export interface OwnedPiResourceSummary {
  readonly kind: "skill" | "prompt-template" | "agent-context" | "system-prompt" | "theme";
  readonly id: string;
  readonly label: string;
  readonly sourcePath: string | null;
  readonly diagnostic: string | null;
}

export interface OwnedPiExtensionSourceSummary {
  readonly source: string;
  readonly scope: "user" | "project" | "temporary";
  readonly origin: "package" | "top-level";
  readonly baseDir: string | null;
}

export interface OwnedPiExtensionResourceSummary {
  readonly kind: "extension";
  readonly id: string;
  readonly sourcePath: string | null;
  readonly resolvedPath: string | null;
  readonly sourceInfo: OwnedPiExtensionSourceSummary | null;
  readonly loaded: boolean;
  readonly hidden: boolean;
  readonly diagnostic: string | null;
}

export interface PiResourceCatalogPorts {
  session(): AgentSession | undefined;
  runtime(): AgentSessionRuntime | undefined;
}

/**
 * The resources pinned Pi's loader discovered for the current runtime (skills, prompt templates,
 * agent context files, system prompts, themes, extensions) and the slash-command autocomplete
 * entries derived from them, shaped for the owned shell with the loader's diagnostics carried
 * along instead of thrown. Reads only; the runtime and session are reached through ports.
 */
export class PiResourceCatalog {
  readonly #ports: PiResourceCatalogPorts;
  readonly #contexts: PiWorkflowContexts;
  readonly #productMode: PiProductMode;

  constructor(options: { readonly contexts: PiWorkflowContexts; readonly productMode?: PiProductMode }, ports: PiResourceCatalogPorts) {
    this.#contexts = options.contexts;
    this.#productMode = options.productMode ?? "bare";
    this.#ports = ports;
  }

  nonVisualResources(): readonly OwnedPiResourceSummary[] {
    const loader = this.#ports.runtime()?.services.resourceLoader;
    if (!loader) return [];
    const resources: OwnedPiResourceSummary[] = [];
    const skills = collectionResult(loader.getSkills(), "skills");
    for (const [index, skill] of skills.values.entries()) {
      resources.push({
        kind: "skill",
        id: `skill-${index}-${stringProperty(skill, "name") ?? "unknown"}`,
        label: stringProperty(skill, "name") ?? "Unnamed skill",
        sourcePath: stringProperty(skill, "filePath") ?? stringProperty(skill, "path") ?? stringProperty(skill, "location") ?? null,
        diagnostic: null,
      });
    }
    resources.push(...skills.diagnostics.map((diagnostic, index) => ({
      kind: "skill" as const,
      id: `skill-diagnostic-${index}`,
      label: "Skill diagnostic",
      sourcePath: null,
      diagnostic,
    })));

    const prompts = collectionResult(loader.getPrompts(), "prompts");
    for (const [index, prompt] of prompts.values.entries()) {
      resources.push({
        kind: "prompt-template",
        id: `prompt-${index}-${stringProperty(prompt, "name") ?? "unknown"}`,
        label: stringProperty(prompt, "name") ?? "Prompt template",
        sourcePath: stringProperty(prompt, "filePath") ?? stringProperty(prompt, "path") ?? null,
        diagnostic: null,
      });
    }
    resources.push(...prompts.diagnostics.map((diagnostic, index) => ({
      kind: "prompt-template" as const,
      id: `prompt-diagnostic-${index}`,
      label: "Prompt diagnostic",
      sourcePath: null,
      diagnostic,
    })));

    const agentsFilesResult = loader.getAgentsFiles();
    const agentsFiles = unknownArray(isRecord(agentsFilesResult) ? agentsFilesResult.agentsFiles : undefined);
    for (const [index, file] of agentsFiles.entries()) {
      resources.push({
        kind: "agent-context",
        id: `agent-context-${index}`,
        label: "Agent context",
        sourcePath: stringProperty(file, "path") ?? null,
        diagnostic: null,
      });
    }
    const systemPrompt = loader.getSystemPromptSource();
    if (isRecord(systemPrompt) && typeof systemPrompt.path === "string") {
      resources.push({
        kind: "system-prompt",
        id: "system-prompt",
        label: "System prompt",
        sourcePath: systemPrompt.path,
        diagnostic: null,
      });
    }
    for (const [index, source] of unknownArray(loader.getAppendSystemPromptSources()).entries()) {
      resources.push({
        kind: "system-prompt",
        id: `append-system-prompt-${index}`,
        label: "Append system prompt",
        sourcePath: stringProperty(source, "path") ?? null,
        diagnostic: null,
      });
    }
    if (loader.getThemes !== undefined) {
      const themes = collectionResult(loader.getThemes(), "themes");
      for (const [index, theme] of themes.values.entries()) {
        const sourcePath = stringProperty(theme, "sourcePath");
        if (!sourcePath) continue;
        resources.push({
          kind: "theme",
          id: `theme-${index}-${stringProperty(theme, "name") ?? "unknown"}`,
          label: stringProperty(theme, "name") ?? compactResourceLabel(sourcePath),
          sourcePath,
          diagnostic: null,
        });
      }
      resources.push(...themes.diagnostics.map((diagnostic, index) => ({
        kind: "theme" as const,
        id: `theme-diagnostic-${index}`,
        label: "Theme diagnostic",
        sourcePath: null,
        diagnostic,
      })));
    }
    return resources;
  }

  extensionResources(): readonly OwnedPiExtensionResourceSummary[] {
    const loader = this.#ports.runtime()?.services.resourceLoader;
    if (loader?.getExtensions === undefined) return [];
    let result: unknown;
    try {
      result = loader.getExtensions();
    } catch (error) {
      return [extensionResourceDiagnostic(0, null, `Extension discovery failed: ${error instanceof Error ? error.message : String(error)}`)];
    }
    if (!isRecord(result)) return [extensionResourceDiagnostic(0, null, "Extension discovery returned a malformed result")];

    const resources: OwnedPiExtensionResourceSummary[] = [];
    if (!Array.isArray(result.extensions)) {
      resources.push(extensionResourceDiagnostic(resources.length, null, "Extension discovery returned a malformed extensions collection"));
    } else {
      for (const extension of result.extensions) {
        if (!isRecord(extension) || typeof extension.path !== "string" || extension.path.length === 0
          || typeof extension.resolvedPath !== "string" || extension.resolvedPath.length === 0
          || (extension.hidden !== undefined && typeof extension.hidden !== "boolean")) {
          resources.push(extensionResourceDiagnostic(resources.length, null, "Extension discovery returned malformed extension metadata"));
          continue;
        }
        resources.push({
          kind: "extension",
          id: `extension-${resources.length}`,
          sourcePath: extension.path,
          resolvedPath: extension.resolvedPath,
          sourceInfo: extensionSourceSummary(extension.sourceInfo),
          loaded: true,
          hidden: extension.hidden === true,
          diagnostic: null,
        });
      }
    }

    if (!Array.isArray(result.errors)) {
      resources.push(extensionResourceDiagnostic(resources.length, null, "Extension discovery returned a malformed errors collection"));
    } else {
      for (const error of result.errors) {
        if (!isRecord(error) || typeof error.path !== "string" || typeof error.error !== "string") {
          resources.push(extensionResourceDiagnostic(resources.length, null, "Extension discovery returned malformed error metadata"));
          continue;
        }
        resources.push(extensionResourceDiagnostic(resources.length, error.path, error.error));
      }
    }
    return resources;
  }

  workflowAutocompleteCommands(): readonly PiWorkflowAutocompleteCommand[] {
    const commands: PiWorkflowAutocompleteCommand[] = [
      this.#productMode === "bare"
        ? {
            name: OWNED_MODELS_COMMAND_NAME,
            description: "Switch models and manage scoped model cycling",
            argumentOptions: this.#contexts.modelOptions(),
            source: "builtin",
          }
        : {
            name: "model",
            description: "Select model (opens selector UI)",
            argumentHint: "<provider/model>",
            argumentOptions: this.#contexts.modelOptions(),
            source: "builtin",
          },
      {
        name: "login",
        description: "Configure provider authentication",
        argumentHint: "<provider>",
        argumentOptions: this.#contexts.loginOptions().map(option => ({ ...option, id: option.id.split(":").at(-1) ?? option.id })),
        source: "builtin",
      },
    ];
    // Invariant: only the active product mode's catalog reserves names; the other mode's replaced routes stay free for resources.
    const usedNames = new Set<string>(workflowCommandNames(this.#productMode));
    const loader = this.#ports.runtime()?.services.resourceLoader;
    if (!loader) return commands;
    const prompts = collectionResult(loader.getPrompts(), "prompts");
    for (const prompt of prompts.values) {
      const name = stringProperty(prompt, "name");
      if (!name || usedNames.has(name)) continue;
      const argumentHint = stringProperty(prompt, "argumentHint");
      commands.push({
        name,
        description: stringProperty(prompt, "description") ?? "Prompt template",
        ...(argumentHint === undefined ? {} : { argumentHint }),
        source: "prompt",
      });
      usedNames.add(name);
    }
    const settings = this.#ports.runtime()?.services.settingsManager;
    const skillsEnabled = settings?.getEnableSkillCommands?.() !== false;
    if (skillsEnabled) {
      const skills = collectionResult(loader.getSkills(), "skills");
      for (const skill of skills.values) {
        const resourceName = stringProperty(skill, "name");
        const name = resourceName ? `skill:${resourceName}` : undefined;
        if (!name || usedNames.has(name)) continue;
        commands.push({ name, description: stringProperty(skill, "description") ?? "Skill", source: "skill" });
        usedNames.add(name);
      }
    }
    const extensionCommands = this.#ports.session()?.extensionRunner?.getRegisteredCommands?.();
    if (Array.isArray(extensionCommands)) {
      const registered = extensionCommands.filter(isRecord);
      for (const command of registered) {
        const name = stringProperty(command, "invocationName") ?? stringProperty(command, "name");
        if (!name || usedNames.has(name) || isPiPrefixedCompatibilityAlias(command, registered)) continue;
        commands.push({ name, description: stringProperty(command, "description") ?? "Extension command", source: "extension" });
        usedNames.add(name);
      }
    }
    return commands;
  }
}

function extensionResourceDiagnostic(index: number, sourcePath: string | null, diagnostic: string): OwnedPiExtensionResourceSummary {
  return {
    kind: "extension",
    id: `extension-diagnostic-${index}`,
    sourcePath,
    resolvedPath: null,
    sourceInfo: null,
    loaded: false,
    hidden: false,
    diagnostic,
  };
}

function extensionSourceSummary(value: unknown): OwnedPiExtensionSourceSummary | null {
  if (!isRecord(value)) return null;
  const source = stringProperty(value, "source");
  const scope = value.scope;
  const origin = value.origin;
  const baseDir = value.baseDir;
  if (!source
    || (scope !== "user" && scope !== "project" && scope !== "temporary")
    || (origin !== "package" && origin !== "top-level")
    || (baseDir !== undefined && typeof baseDir !== "string")) return null;
  return { source, scope, origin, baseDir: baseDir ?? null };
}

export function collectionResult(value: unknown, key: string): { values: readonly unknown[]; diagnostics: readonly string[] } {
  if (!isRecord(value)) return { values: [], diagnostics: [] };
  const diagnostics = unknownArray(value.diagnostics).map(diagnostic => {
    if (typeof diagnostic === "string") return diagnostic;
    if (isRecord(diagnostic)) {
      const message = stringProperty(diagnostic, "message") ?? String(diagnostic);
      const path = stringProperty(diagnostic, "path");
      return path ? `${path}: ${message}` : message;
    }
    return String(diagnostic);
  });
  return { values: unknownArray(value[key]), diagnostics };
}

function unknownArray(value: unknown): readonly unknown[] {
  return Array.isArray(value) ? value : [];
}

/**
 * Some ecosystem extensions retain a `pi-<name>` slash-command alias beside
 * their unprefixed command. A1 presents the product-neutral command once while
 * leaving Pi's runner free to accept the compatibility alias when typed.
 */
function isPiPrefixedCompatibilityAlias(
  command: unknown,
  commands: readonly unknown[],
): boolean {
  const name = stringProperty(command, "name");
  if (!name?.startsWith("pi-") || name.length === 3) return false;
  const canonicalName = name.slice(3);
  const description = stringProperty(command, "description");
  const sourcePath = extensionCommandSourcePath(command);
  return commands.some(candidate =>
    candidate !== command
      && stringProperty(candidate, "name") === canonicalName
      && stringProperty(candidate, "description") === description
      && extensionCommandSourcePath(candidate) === sourcePath);
}

function extensionCommandSourcePath(command: unknown): string | undefined {
  return isRecord(command) ? stringProperty(command.sourceInfo, "path") : undefined;
}

function compactResourceLabel(path: string): string {
  const segments = path.replaceAll("\\", "/").split("/").filter(Boolean);
  return segments.at(-1) ?? path;
}
