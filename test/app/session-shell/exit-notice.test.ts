import { existsSync } from "node:fs";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { armExitNotice, uncleanExitNoticeLines, type ExitNoticeSource } from "../../../src/app/session-shell/exit-notice.js";
import type { SessionResumeCommandMetadata } from "../../../src/app/session-shell/session-shell.js";
import { EMERGENCY_TERMINAL_RESET } from "../../../src/foundation/terminal-cleanup/index.js";

const roots: string[] = [];
afterEach(async () => Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true }))));

async function noticePath(): Promise<string> {
  const root = await mkdtemp(resolve(tmpdir(), "a1-exit-notice-"));
  roots.push(root);
  return resolve(root, "instance.exit-notice");
}

function fakeSource() {
  const listeners = new Set<(event: { readonly type: string }) => void>();
  const state = { sessionGeneration: 1, resume: null as SessionResumeCommandMetadata | null };
  const source = {
    get sessionGeneration() { return state.sessionGeneration; },
    set sessionGeneration(value: number) { state.sessionGeneration = value; },
    get resume() { return state.resume; },
    set resume(value: SessionResumeCommandMetadata | null) { state.resume = value; },
    identity: {
      get sessionGeneration() { return state.sessionGeneration; },
      currentSessionResumeMetadata: () => state.resume,
    },
    session: {
      onEvent(listener: (event: { readonly type: string }) => void) { listeners.add(listener); return () => listeners.delete(listener); },
    },
    emit(type: string) { for (const listener of listeners) listener({ type }); },
    get listenerCount() { return listeners.size; },
  };
  return source satisfies ExitNoticeSource;
}

describe("unclean-exit notice", () => {
  it("arms on start, follows the persisted session, and clears for good after a clean shutdown", async () => {
    const path = await noticePath();
    const source = fakeSource();
    const notice = armExitNotice(source, path);
    await expect(readFile(path, "utf8")).resolves.toBe("a1 was stopped unexpectedly.\n");

    source.resume = { sessionId: "01a1", sessionDir: "/s", usesDefaultSessionDir: true };
    source.emit("transcript-block");
    await expect(readFile(path, "utf8")).resolves.toBe("a1 was stopped unexpectedly.\n");
    source.emit("assistant-message-completed");
    await expect(readFile(path, "utf8")).resolves.toBe("a1 was stopped unexpectedly.\nTo resume this session: a1 --session 01a1\n");

    source.resume = { sessionId: "02b2", sessionDir: "/s", usesDefaultSessionDir: true };
    source.sessionGeneration = 2;
    source.emit("session-view");
    await expect(readFile(path, "utf8")).resolves.toContain("a1 --session 02b2");

    notice.clear();
    expect(existsSync(path)).toBe(false);
    expect(source.listenerCount).toBe(0);
  });

  it("names the resume command only once the session is persisted", () => {
    expect(uncleanExitNoticeLines(null)).toEqual(["a1 was stopped unexpectedly."]);
    expect(uncleanExitNoticeLines({ sessionId: "01a1", sessionDir: "/s dir", usesDefaultSessionDir: false })).toEqual([
      "a1 was stopped unexpectedly.",
      "To resume this session: a1 --session-dir '/s dir' --session 01a1",
    ]);
  });

  it("keeps the native guardian's reset identical to the runtime's emergency reset", async () => {
    const source = await readFile(resolve("native/process-guardian/src/exit_notice.rs"), "utf8");
    const literal = /pub\(crate\) const TERMINAL_RESET: &str = "((?:[^"\\]|\\.)*)";/.exec(source)?.[1];
    expect(literal).toBeDefined();
    const decoded = literal!.replace(/\\x([0-9a-fA-F]{2})|\\\\/g, (_match, hex: string | undefined) =>
      hex === undefined ? "\\" : String.fromCharCode(Number.parseInt(hex, 16)));
    expect(decoded).toBe(EMERGENCY_TERMINAL_RESET);
  });
});
