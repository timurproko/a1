import { link, mkdir, mkdtemp, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  acquireExisting,
  reserveNew,
  SessionWriterConflict,
  setSessionWriterLockBackendForTest,
} from "../../../src/foundation/session-writer-lock/index.js";

const roots: string[] = [];
afterEach(async () => {
  setSessionWriterLockBackendForTest(undefined);
  while (roots.length > 0) await rm(roots.pop()!, { recursive: true, force: true });
});

async function temporaryRoot(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "session-writer-alias-"));
  roots.push(root);
  return root;
}

describe("session writer lock aliases", () => {
  it("treats hard links as one existing session and releases on writer exit", async () => {
    const root = await temporaryRoot();
    const session = join(root, "session.jsonl");
    const alias = join(root, "hard-link.jsonl");
    await writeFile(session, "{}\n");
    await link(session, alias);
    const writer = acquireExisting(session);
    expect(() => acquireExisting(alias)).toThrow(SessionWriterConflict);
    writer.release();
    acquireExisting(alias).release();
  });

  it("treats symbolic or junction aliases as one session location", async () => {
    const root = await temporaryRoot();
    const physical = join(root, "physical");
    const alias = join(root, "alias");
    await mkdir(physical);
    await symlink(physical, alias, process.platform === "win32" ? "junction" : "dir");
    const session = join(physical, "session.jsonl");
    await writeFile(session, "{}\n");
    const writer = acquireExisting(session);
    expect(() => acquireExisting(join(alias, "session.jsonl"))).toThrow(SessionWriterConflict);
    writer.release();
  });

  it("keeps a new-file reservation authoritative through bind", async () => {
    const root = await temporaryRoot();
    const writer = reserveNew(root, "new.jsonl");
    await writeFile(writer.path, "");
    writer.bind();
    expect(writer.bound).toBe(true);
    const alias = join(root, "new-hard-link.jsonl");
    await link(writer.path, alias);
    expect(() => acquireExisting(writer.path)).toThrow(SessionWriterConflict);
    expect(() => acquireExisting(alias)).toThrow(SessionWriterConflict);
    writer.release();
  });
});
