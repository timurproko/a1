const ACCENT = "\u001b[38;2;167;152;215m";
const BORDER = "\u001b[38;2;97;133;204m";
const MUTED = "\u001b[38;2;157;165;169m";
const DIM = "\u001b[38;2;126;136;142m";
const RESET_FG = "\u001b[39m";
const BOLD = "\u001b[1m";
const RESET_BOLD = "\u001b[22m";
const EXPLANATION = "This allows to load project settings and resources, install missing project packages, and execute project extensions.";

/** Fixed startup-safe rendering only; project-derived presentation is forbidden before trust resolves. */
export function renderProjectTrustDialog(
  cwd: string,
  options: readonly string[],
  selected: number,
  terminalWidth: number,
  terminalRows: number,
): readonly string[] {
  const width = Math.max(1, terminalWidth);
  const rule = `${BORDER}${"─".repeat(width)}${RESET_FG}`;
  const title = ` ${BOLD}${ACCENT}Trust project folder?${RESET_FG}${RESET_BOLD}`;
  const path = ` ${MUTED}${sanitize(cwd)}${RESET_FG}`;
  const choices = options.map((label, index) => choice(label, selected === index));
  const hint = ` ${DIM}↑↓${MUTED} navigate  ${DIM}Enter${MUTED} select  ${DIM}Esc${MUTED} exit${RESET_FG}`;
  const explanation = wrap(EXPLANATION, Math.max(1, width - 2)).map(line => ` ${line}`);
  const preferred = [rule, title, path, "", ...explanation, "", ...choices, "", hint, rule];
  if (preferred.length <= terminalRows) return preferred;
  const ruled = [rule, title, path, ...choices, hint, rule];
  if (ruled.length <= terminalRows) return ruled;
  const compact = [title, path, ...choices, hint];
  if (compact.length <= terminalRows) return compact;
  const essential = [title, ...choices, hint];
  if (essential.length <= terminalRows) return essential;
  if (terminalRows >= 3) return [title, ...choiceWindow(choices, selected, terminalRows - 2), hint];
  if (terminalRows === 2) return choiceWindow(choices, selected, 2);
  return [choices[selected] ?? choices[0] ?? ""];
}

function choice(label: string, selected: boolean): string {
  return selected ? ` ${ACCENT}→ ${label}${RESET_FG}` : `   ${label}`;
}

function choiceWindow(choices: readonly string[], selected: number, capacity: number): readonly string[] {
  const start = Math.min(Math.max(0, selected - Math.floor(capacity / 2)), Math.max(0, choices.length - capacity));
  return choices.slice(start, start + capacity);
}

function wrap(text: string, width: number): readonly string[] {
  const lines: string[] = [];
  let line = "";
  for (const word of text.split(/\s+/u)) {
    if (line && line.length + word.length + 1 > width) {
      lines.push(line);
      line = "";
    }
    line += `${line ? " " : ""}${word}`;
  }
  if (line) lines.push(line);
  return lines;
}

function sanitize(text: string): string {
  return text.replace(/[\u0000-\u001f\u007f-\u009f]/gu, "�");
}
