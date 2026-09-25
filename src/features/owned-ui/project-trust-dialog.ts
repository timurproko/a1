const ACCENT = "\u001b[38;2;138;190;183m";
const MUTED = "\u001b[38;2;128;128;128m";
const DIM = "\u001b[38;2;102;102;102m";
const RESET_FG = "\u001b[39m";
const BOLD = "\u001b[1m";
const RESET_BOLD = "\u001b[22m";
const EXPLANATION = "This allows a1 to load project settings and resources, install missing project packages, and execute project extensions.";

/** Fixed startup-safe rendering only; project-derived presentation is forbidden before trust resolves. */
export function renderProjectTrustDialog(
  cwd: string,
  selected: number,
  terminalWidth: number,
  terminalRows: number,
): readonly string[] {
  const width = Math.min(96, terminalWidth);
  const rule = `${MUTED}${"─".repeat(width)}${RESET_FG}`;
  const title = ` ${BOLD}${ACCENT}Trust project folder?${RESET_FG}${RESET_BOLD}`;
  const path = ` ${MUTED}${sanitize(cwd)}${RESET_FG}`;
  const choices = [choice("Trust", selected === 0), choice("Do not trust", selected === 1)];
  const hint = ` ${DIM}↑/↓${MUTED} to navigate  ${DIM}Enter${MUTED} to select  ${DIM}Esc${MUTED} to cancel${RESET_FG}`;
  const explanation = wrap(EXPLANATION, Math.max(1, width - 2)).map(line => ` ${line}`);
  const preferred = [rule, title, path, "", ...explanation, "", ...choices, "", hint, rule];
  if (preferred.length <= terminalRows) return preferred;
  const ruled = [rule, title, path, ...choices, hint, rule];
  if (ruled.length <= terminalRows) return ruled;
  const compact = [title, path, ...choices, hint];
  if (compact.length <= terminalRows) return compact;
  const essential = [title, ...choices, hint];
  if (essential.length <= terminalRows) return essential;
  if (terminalRows >= 3) return [...choices, hint];
  if (terminalRows === 2) return choices;
  return [choices[selected] ?? choices[0] ?? ""];
}

function choice(label: string, selected: boolean): string {
  return selected ? ` ${ACCENT}→ ${label}${RESET_FG}` : `   ${label}`;
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
