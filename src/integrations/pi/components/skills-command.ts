import type { AutocompleteItem, AutocompleteProvider } from "@earendil-works/pi-tui";
import type { PiShellAutocompleteCommand } from "./shell-shared-facade.js";

/** The collapsed bare-A1 replacement for the per-skill command listing. */
export const SKILLS_COMMAND_NAME = "skills";
export const SKILLS_COMMAND_DESCRIPTION = "Browse, search, and apply a skill";
/** Pi's own command prefix; the engine expands `/skill:<name>` regardless of how the menu presents it. */
export const SKILL_COMMAND_PREFIX = "skill:";
const SKILLS_TUNNEL_PREFIX = `${SKILLS_COMMAND_NAME}:`;
/** The tunnel form follows v2: a name without whitespace right after the colon. */
const SKILLS_TUNNEL_INPUT = /^\/skills:(\S*)$/u;
const SKILLS_TUNNEL_SUBMISSION = /^\/skills:([A-Za-z0-9][A-Za-z0-9_-]*)(\s[\s\S]*)?$/u;

export interface PiShellSkillSummary {
  readonly name: string;
  readonly description: string;
}

export interface PiShellCollapsedSkillCommands {
  readonly commands: readonly PiShellAutocompleteCommand[];
  /** The skills withheld from the top-level menu, in the engine's discovery order. */
  readonly skills: readonly PiShellSkillSummary[];
}

/** One line of description, as the v2 extension shows it beside a row. */
export function oneLineSkillDescription(description: string): string {
  return description.replace(/\s+/gu, " ").trim();
}

/** The skills the engine registered as `skill:<name>` commands, in its order. */
export function skillsFromCommands(commands: readonly PiShellAutocompleteCommand[]): readonly PiShellSkillSummary[] {
  return commands.flatMap(command => command.name.startsWith(SKILL_COMMAND_PREFIX) && command.name.length > SKILL_COMMAND_PREFIX.length
    ? [{ name: command.name.slice(SKILL_COMMAND_PREFIX.length), description: oneLineSkillDescription(command.description ?? "") }]
    : []);
}

/**
 * Replace every `skill:<name>` entry with one `skills` command whose argument completions are the
 * skill names. A list without skill entries (registration disabled, or no skills) is returned
 * unchanged with no `skills` command, so the collapsed presentation never invents a command.
 */
export function collapseSkillCommands(commands: readonly PiShellAutocompleteCommand[]): PiShellCollapsedSkillCommands {
  const skills = skillsFromCommands(commands);
  if (skills.length === 0) return { commands, skills };
  const collapsed: PiShellAutocompleteCommand[] = [];
  let inserted = false;
  for (const command of commands) {
    if (!command.name.startsWith(SKILL_COMMAND_PREFIX)) {
      collapsed.push(command);
      continue;
    }
    if (inserted) continue;
    inserted = true;
    collapsed.push({
      name: SKILLS_COMMAND_NAME,
      description: SKILLS_COMMAND_DESCRIPTION,
      argumentOptions: skills.map(skill => ({
        id: skill.name,
        label: skill.name,
        ...(skill.description.length === 0 ? {} : { description: skill.description }),
      })),
    });
  }
  return { commands: collapsed, skills };
}

/** Case-insensitive substring match on the name or description; a leading `skill:`/`skills:` in the query is ignored for the name. */
export function skillMatchesQuery(skill: PiShellSkillSummary, query: string): boolean {
  const normalized = query.trim().toLowerCase();
  if (normalized.length === 0) return true;
  const withoutPrefix = normalized.startsWith(SKILLS_TUNNEL_PREFIX)
    ? normalized.slice(SKILLS_TUNNEL_PREFIX.length)
    : normalized.startsWith(SKILL_COMMAND_PREFIX) ? normalized.slice(SKILL_COMMAND_PREFIX.length) : normalized;
  return skill.name.toLowerCase().includes(withoutPrefix)
    || `${SKILL_COMMAND_PREFIX}${skill.name}`.toLowerCase().includes(normalized)
    || skill.description.toLowerCase().includes(normalized);
}

/** Resolve a `/skills` argument token to a skill, accepting the name with or without `skill:`. */
export function findSkillByArgument(skills: readonly PiShellSkillSummary[], token: string): PiShellSkillSummary | undefined {
  const name = token.startsWith(SKILL_COMMAND_PREFIX) ? token.slice(SKILL_COMMAND_PREFIX.length) : token;
  return skills.find(skill => skill.name === name);
}

/** The `/skill:<name>` prompt the engine expands, with any arguments after one space. */
export function skillPrompt(name: string, args = ""): string {
  const trimmed = args.trim();
  return trimmed.length === 0 ? `/${SKILL_COMMAND_PREFIX}${name}` : `/${SKILL_COMMAND_PREFIX}${name} ${trimmed}`;
}

/**
 * Rewrite a submitted tunnel form `/skills:<name> rest` to `/skill:<name> rest`; anything else is
 * returned unchanged so ordinary prompts, `/skills <name>`, and `/skill:` input keep their text.
 */
export function rewriteSkillsTunnelSubmission(text: string): string {
  const match = SKILLS_TUNNEL_SUBMISSION.exec(text);
  if (match === null) return text;
  return `/${SKILL_COMMAND_PREFIX}${match[1]}${match[2] ?? ""}`;
}

/** The tunnel query when single-line content before the cursor is exactly `/skills:<query>`. */
export function skillsTunnelQuery(lines: readonly string[], cursorLine: number, cursorCol: number): string | null {
  if (cursorLine !== 0 || lines.length !== 1) return null;
  const match = SKILLS_TUNNEL_INPUT.exec((lines[0] ?? "").slice(0, cursorCol));
  return match === null ? null : match[1] ?? "";
}

export function skillsTunnelItems(skills: readonly PiShellSkillSummary[], query: string): AutocompleteItem[] {
  return skills.filter(skill => skillMatchesQuery(skill, query)).map(skill => ({
    value: `${SKILLS_TUNNEL_PREFIX}${skill.name}`,
    label: `${SKILLS_TUNNEL_PREFIX}${skill.name}`,
    ...(skill.description.length === 0 ? {} : { description: skill.description }),
  }));
}

/**
 * Wrap the pinned combined provider with the `skills` tunnel: `/skills:<query>` lists matching
 * skills as `skills:<name>` rows and shows nothing when none match; every other request, the
 * completion application, and the file-completion decision are delegated unchanged so extension
 * wrappers registered over this provider see one ordinary provider.
 */
export function createSkillsTunnelProvider(base: AutocompleteProvider, skills: readonly PiShellSkillSummary[]): AutocompleteProvider {
  return {
    ...(base.triggerCharacters === undefined ? {} : { triggerCharacters: base.triggerCharacters }),
    async getSuggestions(lines, cursorLine, cursorCol, options) {
      const query = skillsTunnelQuery(lines, cursorLine, cursorCol);
      if (query === null) return base.getSuggestions(lines, cursorLine, cursorCol, options);
      const items = skillsTunnelItems(skills, query);
      if (options.signal.aborted || items.length === 0) return null;
      return { prefix: (lines[cursorLine] ?? "").slice(0, cursorCol), items };
    },
    applyCompletion: (lines, cursorLine, cursorCol, item, prefix) => base.applyCompletion(lines, cursorLine, cursorCol, item, prefix),
    shouldTriggerFileCompletion: (lines, cursorLine, cursorCol) => base.shouldTriggerFileCompletion?.(lines, cursorLine, cursorCol) ?? true,
  };
}
