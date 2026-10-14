import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { inflateRawSync } from "node:zlib";
import { afterEach, describe, expect, it } from "vitest";
import { writeDoctorBundle } from "../../../src/foundation/resident-tabs/doctor.js";
import { encodeZip } from "../../../src/foundation/resident-tabs/zip-archive.js";

const roots: string[] = [];
afterEach(async () => Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true }))));

/** Reads every entry back through the central directory, as an unzip tool would. */
function unzip(archive: Buffer): Map<string, string> {
  const end = archive.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
  const count = archive.readUInt16LE(end + 10);
  let offset = archive.readUInt32LE(end + 16);
  const entries = new Map<string, string>();
  for (let index = 0; index < count; index++) {
    const nameLength = archive.readUInt16LE(offset + 28);
    const name = archive.subarray(offset + 46, offset + 46 + nameLength).toString("utf8");
    const local = archive.readUInt32LE(offset + 42);
    const size = archive.readUInt32LE(offset + 20);
    const localName = archive.readUInt16LE(local + 26);
    const data = archive.subarray(local + 30 + localName, local + 30 + localName + size);
    entries.set(name, inflateRawSync(data).toString("utf8"));
    offset += 46 + nameLength;
  }
  return entries;
}

const CANARIES = {
  secret: "CANARY-PROFILE-SECRET",
  token: "CANARY-CLIENT-TOKEN",
  environment: "CANARY-ENVIRONMENT-VALUE",
  journal: "CANARY-PROMPT-JOURNAL",
  draft: "CANARY-DRAFT-CHECKPOINT",
  screen: "CANARY-LAST-SCREEN",
  stderr: "CANARY-CHILD-STDERR",
  terminal: "CANARY-TERMINAL-CONTENT",
  name: "CANARY-TAB-NAME-FROM-PROMPT",
  session: "CANARY-SESSION-FILE",
};

async function residentState() {
  const root = await mkdtemp(join(tmpdir(), "a1-doctor-"));
  roots.push(root);
  const state = join(root, "tabs", "profile-token");
  const tab = join(state, "tab-1");
  await mkdir(join(state, "diagnostics"), { recursive: true });
  await mkdir(join(tab, "recovery"), { recursive: true });
  await writeFile(join(state, "profile-secret"), CANARIES.secret);
  await writeFile(join(state, "client-token"), CANARIES.token);
  await writeFile(join(tab, "prompt-journal.jsonl"), CANARIES.journal);
  await writeFile(join(tab, "draft.json"), CANARIES.draft);
  await writeFile(join(tab, "recovery", "last-screen-1.txt"), CANARIES.screen);
  await writeFile(join(tab, "recovery", "stderr-1.log"), CANARIES.stderr);
  await writeFile(join(state, "diagnostics", "terminal-host-server.log"), "{\"event\":\"server-start\"}\n");
  await writeFile(join(state, "diagnostics", "terminal-host-server.log.1"), "x".repeat(16 * 1024));
  await writeFile(join(state, "diagnostics", "crash-holder-1-20261014.json"), "{\"role\":\"holder\",\"reason\":\"holder-crash\"}");
  await writeFile(join(state, "diagnostics", "unexpected-dump.txt"), CANARIES.terminal);
  await writeFile(join(state, "server.json"), JSON.stringify({ pid: 10, startIdentity: "s", endpoint: "e", generation: 1, verified: true, detachmentMode: "setsid", releaseRoot: join(root, "release") }));
  await writeFile(join(state, "registry.json"), JSON.stringify({
    registryRevision: 3,
    epoch: 2,
    bootId: "boot",
    tabs: [{ tabId: "tab-1", displayName: CANARIES.name, nameSource: "auto", order: 0, cwd: join(root, "work"), sessionFile: join(root, "sessions", `${CANARIES.session}.jsonl`), desired: "running", lifecycle: "running", incarnation: 1, holderPid: 11, childPid: 12, release: join(root, "release"), lastExit: null, restarts: 0 }],
  }));
  return { root, state };
}

describe("a1 tabs doctor bundle", () => {
  it("includes diagnostics by allowlist and none of the excluded sensitive classes", async () => {
    const { root, state } = await residentState();
    process.env.A1_DOCTOR_CANARY_ENVIRONMENT = CANARIES.environment;
    try {
      const bundle = await writeDoctorBundle({
        stateDir: state,
        hostStatus: { schema: "a1-tabs-maintenance-v1", command: "host-status", host: "running", exitCode: 0, result: { pid: 10, detachmentMode: "setsid", logs: [join(state, "diagnostics", "terminal-host-server.log")] } },
        releaseRoots: [join(root, "release")],
        settings: { tabsMax: 10, tabsAutoName: true },
        home: root,
      });
      const archive = await readFile(bundle.path);
      const text = archive.toString("latin1");
      const entries = unzip(archive);
      const everything = [...entries.values()].join("\n");
      for (const [kind, canary] of Object.entries(CANARIES)) {
        expect(everything, kind).not.toContain(canary);
        expect(text, kind).not.toContain(canary);
      }
      expect([...entries.keys()].sort()).toEqual([
        "artifacts.json", "crashes/crash-holder-1-20261014.json", "host-status.json", "logs/terminal-host-server.log",
        "logs/terminal-host-server.log.1", "manifest.txt", "platform.json", "registry.json", "server-marker.json", "settings.json",
      ]);
      const registry = JSON.parse(entries.get("registry.json")!) as { tabs: Record<string, unknown>[] };
      expect(registry.tabs[0]).toMatchObject({ tabId: "tab-1", cwd: "~/work", sessionDirectory: "~/sessions", release: "~/release" });
      expect(JSON.parse(entries.get("settings.json")!)).toEqual({ tabsMax: 10, tabsAutoName: true });
      expect(bundle.path.startsWith(join(state, "doctor"))).toBe(true);
    } finally {
      delete process.env.A1_DOCTOR_CANARY_ENVIRONMENT;
    }
  });

  it("drops the oldest log generations first to stay within its cap", async () => {
    const { state } = await residentState();
    const bundle = await writeDoctorBundle({
      stateDir: state,
      hostStatus: { schema: "a1-tabs-maintenance-v1", command: "host-status", host: "none", exitCode: 0 },
      releaseRoots: [],
      settings: { tabsMax: 10, tabsAutoName: true },
      maxBytes: 64 * 1024 + 4096,
    });
    expect(bundle.dropped).toEqual(["terminal-host-server.log.1"]);
    const entries = unzip(await readFile(bundle.path));
    expect(entries.has("logs/terminal-host-server.log")).toBe(true);
    expect(entries.get("manifest.txt")).toContain("dropped to stay within");
  });

  it("encodes archives that read back byte for byte and refuses unsafe names", () => {
    const entries = unzip(encodeZip([{ name: "a/b.txt", data: Buffer.from("hello") }, { name: "c.json", data: Buffer.from("{}") }]));
    expect(Object.fromEntries(entries)).toEqual({ "a/b.txt": "hello", "c.json": "{}" });
    expect(() => encodeZip([{ name: "../escape", data: Buffer.alloc(0) }])).toThrow(/unsafe/u);
  });
});
