import { fork, type ChildProcess } from "node:child_process";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createOwnedUiClipboardServices } from "../../../src/app/session-shell/index.js";
import { fixture } from "./session-shell-fixture.js";

// Rationale: observe which helpers the shell forks at start without touching the system clipboard.
vi.mock("node:child_process", async importOriginal => {
  const actual = await importOriginal<typeof import("node:child_process")>();
  return { ...actual, fork: vi.fn(actual.fork) };
});
afterEach(() => vi.clearAllMocks());
const nextImmediate = () => new Promise<void>(resolve => setImmediate(resolve));
function children(): ChildProcess[] { return vi.mocked(fork).mock.results.map(result => result.value as ChildProcess); }
const exited = (child: ChildProcess) => vi.waitFor(() => expect(child.exitCode !== null || child.signalCode !== null).toBe(true), { timeout: 5_000 });

describe("OwnedUiSessionShell spare clipboard helpers", () => {
  it("forks one paste helper and one copy helper after the first frame and stops both on dispose", async () => {
    const { shell } = await fixture([], [], true, undefined, { readText: async () => "generated" }, undefined, undefined, undefined, undefined, undefined,
      "forked", undefined, undefined, undefined, "forked");
    expect(children()).toHaveLength(0);
    await nextImmediate();
    const entries = vi.mocked(fork).mock.calls.map(([entry]) => String(entry));
    expect(entries.some(entry => /paste-helper\.(?:ts|js)$/.test(entry))).toBe(true);
    expect(entries.some(entry => /response-copy-helper\.(?:ts|js)$/.test(entry))).toBe(true);
    expect(children()).toHaveLength(2);
    const [paste, copy] = children();
    expect(paste!.connected && copy!.connected).toBe(true);
    await shell.dispose();
    await exited(paste!);
    await exited(copy!);
  }, 15_000);

  it("takes the spare for the first paste and forks the replacement only after that paste settles", async () => {
    const phases: string[] = [];
    const { shell, terminal } = await fixture([], [], true, undefined, { readText: async () => "spare text" }, undefined, undefined, undefined, undefined, undefined,
      "forked", event => phases.push(event.phase), undefined, undefined, "forked");
    await nextImmediate();
    expect(children()).toHaveLength(2);
    terminal.input("\x16");
    await vi.waitFor(() => expect(phases).toContain("settled"), { timeout: 10_000 });
    expect(shell.root.editor.getText()).toBe("spare text");
    await vi.waitFor(() => expect(children()).toHaveLength(3), { timeout: 5_000 });
    expect(vi.mocked(fork).mock.calls.map(([entry]) => String(entry)).filter(entry => /paste-helper/.test(entry))).toHaveLength(2);
    await shell.dispose();
    for (const child of children()) await exited(child);
  }, 20_000);

  it("shares one paste spare and one copy spare across shells and stops them only with the services", async () => {
    const shared = { clipboard: createOwnedUiClipboardServices() };
    const open = () => fixture([], [], true, undefined, { readText: async () => "generated" }, undefined, undefined, undefined, undefined, undefined,
      "forked", undefined, undefined, undefined, "forked", undefined, undefined, undefined, undefined, shared);
    const first = await open();
    const second = await open();
    await nextImmediate();
    const entries = vi.mocked(fork).mock.calls.map(([entry]) => String(entry));
    expect(entries.filter(entry => /paste-helper\.(?:ts|js)$/.test(entry))).toHaveLength(1);
    expect(entries.filter(entry => /response-copy-helper\.(?:ts|js)$/.test(entry))).toHaveLength(1);
    const [paste, copy] = children();
    await first.shell.dispose();
    await second.shell.dispose();
    expect(paste!.connected && copy!.connected).toBe(true);
    shared.clipboard.dispose();
    await exited(paste!);
    await exited(copy!);
  }, 20_000);

  it("keeps the in-process preparation seam free of forked helpers", async () => {
    const { shell } = await fixture([], [], true, undefined, { readText: async () => "generated" });
    await nextImmediate();
    expect(children()).toHaveLength(0);
    await shell.dispose();
  });
});
