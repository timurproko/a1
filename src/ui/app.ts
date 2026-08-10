import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import type { AddOneEvent, OrderedEvent, SupervisorSnapshot } from "../domain/index.js";
import { SupervisorClient } from "../protocol/index.js";
import { initialStartupState, INTRO_DURATION_MS, INTRO_TICK_MS, renderIntro, renderShell, updateStartupState, type MonotonicClock, type StartupState } from "../presentation/index.js";

export interface UiDependencies {
  readonly input: NodeJS.ReadStream;
  readonly output: NodeJS.WriteStream;
  readonly clock: MonotonicClock;
  readonly cwd: string;
  readonly introDurationMs: number;
}

export async function runUi(endpoint: string, overrides: Partial<UiDependencies> = {}): Promise<void> {
  const input = overrides.input ?? process.stdin;
  const output = overrides.output ?? process.stdout;
  const clock = overrides.clock ?? { now: () => performance.now() };
  const cwd = overrides.cwd ?? process.cwd();
  const introDurationMs = overrides.introDurationMs ?? parseDuration(process.env.ADDONE_INTRO_DURATION_MS);
  const client = new SupervisorClient();
  let snapshot = await client.connect(endpoint);
  let startup: StartupState = initialStartupState(clock);
  let chromeFocused = snapshot.workspace.selectedAgentId === null;
  let stopped = false;
  let rendering = false;
  let consumePlusMouseRelease = false;

  const dimensions = () => {
    const injected = readInjectedDimensions(process.env.ADDONE_TEST_TERMINAL_SIZE_PATH);
    return {
      columns: Math.max(20, injected?.columns ?? output.columns ?? 80),
      rows: Math.max(6, injected?.rows ?? output.rows ?? 24),
    };
  };
  const childDimensions = () => ({ columns: dimensions().columns, rows: Math.max(1, dimensions().rows - 4) });
  const render = () => {
    if (rendering || stopped) return;
    rendering = true;
    try {
      startup = updateStartupState(startup, clock, introDurationMs);
      const size = dimensions();
      if (startup.phase === "intro") {
        const lines = renderIntro(startup, size.columns, size.rows);
        output.write(`\x1b[H${lines.join("\r\n")}\x1b[0m`);
      } else {
        output.write(renderShell(snapshot, size.columns, size.rows, chromeFocused).ansi);
      }
    } finally {
      rendering = false;
    }
  };

  const createAgent = async () => {
    const result = await client.command({ type: "create-terminal-agent", requestId: randomUUID(), cwd, dimensions: childDimensions() });
    if (!result.ok) throw new Error(result.error?.message ?? "failed to create Native Pi");
    chromeFocused = false;
    render();
  };

  const applyOrdered = (ordered: OrderedEvent) => {
    if (ordered.revision !== snapshot.revision + 1) {
      void client.command({ type: "resynchronize", requestId: randomUUID() });
      return;
    }
    snapshot = applyEvent({ ...snapshot, revision: ordered.revision }, ordered.event);
    render();
  };

  client.on("snapshot", next => { snapshot = next; render(); });
  client.on("event", applyOrdered);
  client.on("disconnect", () => { if (!stopped) void shutdown(1); });

  const onInput = (data: Buffer | string) => {
    const raw = typeof data === "string" ? data : data.toString("utf8");
    if (raw === "\x03") { void shutdown(0); return; }
    if (startup.phase !== "shell") return;
    if (raw.startsWith("\t")) {
      chromeFocused = !chromeFocused;
      render();
      if (raw.length > 1) onInput(raw.slice(1));
      return;
    }
    if (raw === "\x0e") { void createAgent().catch(showError); return; }
    const mouse = parseMouse(raw);
    if (mouse) {
      const frame = renderShell(snapshot, dimensions().columns, dimensions().rows, chromeFocused);
      const overPlus = mouse.row === frame.plusBounds.row && mouse.column >= frame.plusBounds.startColumn && mouse.column <= frame.plusBounds.endColumn;
      if (mouse.press && overPlus) {
        consumePlusMouseRelease = true;
        void createAgent().catch(showError);
        return;
      }
      if (!mouse.press && consumePlusMouseRelease) {
        consumePlusMouseRelease = false;
        return;
      }
      consumePlusMouseRelease = false;
    }
    if (chromeFocused && (raw === "\r" || raw === " ")) { void createAgent().catch(showError); return; }
    const agent = snapshot.agents.find(candidate => candidate.id === snapshot.workspace.selectedAgentId);
    if (!chromeFocused && agent && agent.currentGeneration.state !== "exited") {
      void client.command({ type: "terminal-input", requestId: randomUUID(), agentId: agent.id, generationId: agent.currentGeneration.id, data: raw }).then(result => {
        if (!result.ok) showError(new Error(result.error?.message ?? "input failed"));
      });
    }
  };

  const onResize = () => {
    render();
    const agent = snapshot.agents.find(candidate => candidate.id === snapshot.workspace.selectedAgentId);
    if (agent && agent.currentGeneration.state !== "exited") {
      void client.command({ type: "terminal-resize", requestId: randomUUID(), agentId: agent.id, generationId: agent.currentGeneration.id, dimensions: childDimensions() });
    }
  };

  const showError = (error: unknown) => {
    output.write(`\x1b[${dimensions().rows};1H\x1b[31m${error instanceof Error ? error.message : String(error)}\x1b[0m`);
  };

  const shutdown = async (code: number) => {
    if (stopped) return;
    stopped = true;
    clearInterval(timer);
    input.off("data", onInput);
    input.pause();
    output.off("resize", onResize);
    client.close();
    if (input.isTTY) input.setRawMode?.(false);
    output.write("\x1b[?1000l\x1b[?1006l\x1b[?2004l\x1b[?25h\x1b[?1049l");
    process.exitCode = code;
  };

  if (input.isTTY) input.setRawMode?.(true);
  input.setEncoding("utf8");
  input.resume();
  input.on("data", onInput);
  output.on("resize", onResize);
  output.write("\x1b[?1049h\x1b[2J\x1b[H\x1b[?25l\x1b[?1000h\x1b[?1006h\x1b[?2004h");
  const timer = setInterval(render, INTRO_TICK_MS);
  render();
  await new Promise<void>(resolve => {
    const poll = setInterval(() => {
      if (stopped) { clearInterval(poll); resolve(); }
    }, 20);
    poll.unref();
  });
}

function applyEvent(snapshot: SupervisorSnapshot, event: AddOneEvent): SupervisorSnapshot {
  if (event.type === "agent-created") {
    return {
      ...snapshot,
      agents: [...snapshot.agents, event.agent],
      workspace: { ...snapshot.workspace, agentIds: [...snapshot.workspace.agentIds, event.agent.id] },
    };
  }
  if (event.type === "selection-changed") return { ...snapshot, workspace: { ...snapshot.workspace, selectedAgentId: event.agentId } };
  return {
    ...snapshot,
    agents: snapshot.agents.map(agent => {
      if (agent.id !== event.agentId || agent.currentGeneration.id !== event.generationId) return agent;
      if (event.type === "generation-ready") return { ...agent, currentGeneration: { ...agent.currentGeneration, state: "ready" } };
      if (event.type === "terminal-surface-updated") return { ...agent, surface: event.surface };
      if (event.type === "generation-exited") return {
        ...agent,
        surface: event.surface ?? agent.surface,
        currentGeneration: { ...agent.currentGeneration, state: "exited", exitCode: event.exitCode, signal: event.signal, exitedAt: new Date().toISOString() },
      };
      return { ...agent, currentGeneration: { ...agent.currentGeneration, state: "error", error: event.message } };
    }),
  };
}

function parseMouse(raw: string): { column: number; row: number; press: boolean } | null {
  const match = /^\x1b\[<(\d+);(\d+);(\d+)([Mm])$/.exec(raw);
  if (!match) return null;
  return { column: Number(match[2]), row: Number(match[3]), press: match[4] === "M" && (Number(match[1]) & 3) === 0 };
}

function readInjectedDimensions(path: string | undefined): { columns: number; rows: number } | null {
  if (!path) return null;
  try {
    const value = JSON.parse(readFileSync(path, "utf8")) as { columns?: unknown; rows?: unknown };
    return typeof value.columns === "number" && typeof value.rows === "number" ? { columns: value.columns, rows: value.rows } : null;
  } catch {
    return null;
  }
}

function parseDuration(value: string | undefined): number {
  if (value === undefined) return INTRO_DURATION_MS;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : INTRO_DURATION_MS;
}
