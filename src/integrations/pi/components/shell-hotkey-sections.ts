import { getMarkdownTheme } from "../startup-public.js";
import { Markdown } from "@earendil-works/pi-tui";
import { ensureTheme, type PiShellExtensionRendererResolver } from "./shell-shared-facade.js";
import { hotkeysMarkdown, type PiShellHotkeysPresentation } from "./shell-presenters-info.js";

export interface PiShellHotkeySection {
  readonly title: string;
  readonly rows: readonly string[];
}

/** Turns heading-led hotkeys Markdown into reusable grouped-document data before row rendering. */
export function renderPiShellHotkeySections(presentation: PiShellHotkeysPresentation, width: number): readonly PiShellHotkeySection[] {
  ensureTheme();
  const shortcuts: NonNullable<PiShellExtensionRendererResolver["getShortcuts"]> = presentation.getShortcuts ?? (() => []);
  const markdown = hotkeysMarkdown(presentation.bindings, shortcuts, presentation.profile ?? "pi");
  const sections: { title: string; lines: string[] }[] = [];
  for (const line of markdown.split("\n")) {
    const heading = /^\*\*(.+)\*\*$/.exec(line)?.[1];
    if (heading !== undefined) sections.push({ title: heading, lines: [] });
    else sections.at(-1)?.lines.push(line);
  }
  for (const section of sections) while (section.lines.at(-1) === "") section.lines.pop();
  return sections.map(section => {
    const rows = [...new Markdown(section.lines.join("\n"), 1, 1, getMarkdownTheme()).render(width)];
    while (rows[0]?.trim().length === 0) rows.shift();
    while (rows.at(-1)?.trim().length === 0) rows.pop();
    return { title: section.title, rows };
  });
}
