import { visibleWidth } from "@earendil-works/pi-tui";
import type { LogicalTerminalAgent, SupervisorSnapshot, TerminalSurface } from "../domain/index.js";

export interface ShellFrame {
  readonly ansi: string;
  readonly lines: readonly string[];
  readonly plusBounds: { readonly row: number; readonly startColumn: number; readonly endColumn: number };
}

export function renderShell(snapshot: SupervisorSnapshot, columns: number, rows: number, chromeFocused: boolean): ShellFrame {
  const selected = snapshot.agents.find(agent => agent.id === snapshot.workspace.selectedAgentId) ?? null;
  const plus = chromeFocused ? "\x1b[30;47m[ + ]\x1b[0m" : "\x1b[1;36m[ + ]\x1b[0m";
  const tabs = snapshot.agents.map(agent => renderTab(agent, agent.id === selected?.id)).join(" ");
  const header = fit(` ${plus}${tabs ? ` ${tabs}` : ""}`, columns);
  const separator = `\x1b[2m${"─".repeat(columns)}\x1b[0m`;
  const contentRows = Math.max(1, rows - 4);
  const content = selected?.surface ? surfaceLines(selected.surface, columns, contentRows) : emptySurface(columns, contentRows);
  const status = selected
    ? ` AddOne · ${selected.name} · ${selected.currentGeneration.state}${selected.currentGeneration.state === "exited" ? ` (${selected.currentGeneration.exitCode ?? "signal"})` : ""} · Tab: chrome/terminal`
    : " AddOne · Enter or click + to start Native Pi · Tab: chrome/terminal";
  const lines = [header, separator, ...content, `\x1b[2m${fit(status, columns)}\x1b[0m`].slice(0, rows);
  while (lines.length < rows) lines.push(" ".repeat(columns));
  return {
    lines,
    plusBounds: { row: 1, startColumn: 2, endColumn: 6 },
    ansi: `\x1b[H${lines.map(line => `${fit(line, columns)}\x1b[0m`).join("\r\n")}`,
  };
}

function renderTab(agent: LogicalTerminalAgent, selected: boolean): string {
  const label = `[${agent.name}${agent.currentGeneration.state === "exited" ? " ×" : ""}]`;
  return selected ? `\x1b[1;35m${label}\x1b[0m` : `\x1b[2m${label}\x1b[0m`;
}

function surfaceLines(surface: TerminalSurface, columns: number, rows: number): string[] {
  return Array.from({ length: rows }, (_, row) => {
    const cells = surface.cells[row] ?? [];
    return fit(cells.map(cell => cell.width === 0 ? "" : cell.character).join(""), columns);
  });
}

function emptySurface(columns: number, rows: number): string[] {
  const message = "No terminal agent. Activate + to create one.";
  return Array.from({ length: rows }, (_, row) => row === Math.floor(rows / 2) ? fit(`  ${message}`, columns) : " ".repeat(columns));
}

function fit(value: string, width: number): string {
  const visible = visibleWidth(value);
  if (visible <= width) return `${value}${" ".repeat(width - visible)}`;
  let output = "";
  let measured = 0;
  let escape = false;
  for (const character of value) {
    if (character === "\x1b") escape = true;
    output += character;
    if (escape) {
      if (character === "m") escape = false;
    } else if (++measured >= width) break;
  }
  return output;
}
