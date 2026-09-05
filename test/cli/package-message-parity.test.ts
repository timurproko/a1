import { execFile } from "node:child_process";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { promisify } from "node:util";
import { afterEach, describe, expect, it } from "vitest";

const execute = promisify(execFile);
const roots: string[] = [];
afterEach(async () => { await Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true }))); });
interface Case {
  readonly id: string;
  readonly pinnedArgs: readonly string[];
  readonly ownedArgs: readonly string[];
  readonly scenario?: { readonly kind?: string; readonly detail?: string; readonly errors?: readonly (readonly [string, string])[] };
  readonly settings?: object;
}
interface Transcript { readonly id: string; readonly stdout: string; readonly stderr: string; readonly code: number }
async function capture(producer: "owned" | "pinned", home: string, cases: readonly Case[], color: 0 | 1): Promise<Transcript[]> {
  const environment = Object.fromEntries(Object.entries(process.env).filter(([key]) =>
    ["PATH", "PATHEXT", "SYSTEMROOT", "WINDIR", "TEMP", "TMP"].includes(key.toUpperCase())));
  const { stdout, stderr } = await execute(process.execPath, [
    "--import", "tsx", resolve("test/cli/pinned-package-message-worker.mjs"), producer, home, JSON.stringify(cases),
  ], {
    cwd: process.cwd(), timeout: 60_000, maxBuffer: 2 * 1024 * 1024,
    env: { ...environment, HOME: home, USERPROFILE: home, FORCE_COLOR: String(color), PI_OFFLINE: "1", PI_TELEMETRY: "0", PI_SKIP_VERSION_CHECK: "1" },
  });
  expect(stderr).toBe("");
  return JSON.parse(stdout) as Transcript[];
}
async function home(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "a1-command-parity-"));
  roots.push(root);
  return root;
}
function normalizeHome(transcripts: readonly Transcript[], root: string): readonly Transcript[] {
  const normalizedRoot = root.replaceAll("\\", "/");
  return transcripts.map(entry => ({
    ...entry,
    stdout: entry.stdout.replaceAll("\\", "/").replaceAll(normalizedRoot, "<HOME>"),
    stderr: entry.stderr.replaceAll("\\", "/").replaceAll(normalizedRoot, "<HOME>"),
  }));
}

const scenarios = [
  { kind: "success" },
  { kind: "timeout" },
  { kind: "provider-error", errors: [["provider-one", "not available"], ["provider-two", "try later"]] as const },
  { kind: "creation-error", detail: "  long  error\n" + "detail ".repeat(120) },
  { kind: "refresh-error", detail: "first line\n  second line  " },
  { kind: "non-error" },
];

describe("independent pinned package command transcripts", () => {
  it.each([0, 1] as const)("matches both model aliases and operational errors at color level %i", async color => {
    const root = await home();
    const cases: Case[] = scenarios.flatMap(scenario => [
      { id: `top-${scenario.kind}`, pinnedArgs: ["update", "--models"], ownedArgs: ["update", "--models"], scenario },
      { id: `pi-${scenario.kind}`, pinnedArgs: ["update", "--models"], ownedArgs: ["pi", "update", "--models"], scenario },
    ]);
    const pinned = await capture("pinned", root, cases, color);
    const owned = await capture("owned", root, cases, color);
    expect(owned).toEqual(pinned);
    expect(owned[0]?.stdout).toBe(color ? "\u001b[32mModel catalogs refreshed\u001b[39m\n" : "Model catalogs refreshed\n");
    expect(owned[0]?.code).toBe(0);
    expect(owned.find(entry => entry.id === "top-timeout")?.code).toBe(1);
    expect(owned.find(entry => entry.id === "top-creation-error")?.stderr.length).toBeGreaterThan(600);
  }, 120_000);

  it.each([0, 1] as const)("preserves empty list/update and distinct missing-package failures at color level %i", async color => {
    const ownedRoot = await home();
    const pinnedRoot = await home();
    const cases: Case[] = [
      ...[
        ["list"], ["update", "--extensions"], ["remove", "npm:absent"], ["uninstall", "npm:absent"], ["update", "npm:absent"],
      ].map((args, i) => ({ id: `operation-${i}`, pinnedArgs: args, ownedArgs: ["pi", ...args] })),
      {
        id: "equivalent-versioned-source",
        pinnedArgs: ["update", "npm:@fixture/example"],
        ownedArgs: ["pi", "update", "npm:@fixture/example"],
        settings: { packages: ["npm:@fixture/example@1.2.3"] },
      },
      {
        id: "suggest-versioned-source",
        pinnedArgs: ["update", "@fixture/example@1.2.3"],
        ownedArgs: ["pi", "update", "@fixture/example@1.2.3"],
        settings: { packages: ["npm:@fixture/example@1.2.3"] },
      },
    ];
    const owned = await capture("owned", ownedRoot, cases, color);
    const pinned = await capture("pinned", pinnedRoot, cases, color);
    expect(owned).toEqual(pinned);
    expect(owned.find(entry => entry.id === "equivalent-versioned-source")?.code).toBe(0);
    expect(owned.find(entry => entry.id === "suggest-versioned-source")?.stderr).toContain("Did you mean npm:@fixture/example@1.2.3?");
  }, 120_000);

  it.each([0, 1] as const)("preserves successful package progress and list output at color level %i", async color => {
    const pinnedHome = await home();
    const ownedHome = await home();
    await Promise.all([
      mkdir(join(pinnedHome, "extension"), { recursive: true }),
      mkdir(join(ownedHome, "extension"), { recursive: true }),
    ]);
    await Promise.all([
      writeFile(join(pinnedHome, "extension/index.js"), "export default {};\n"),
      writeFile(join(ownedHome, "extension/index.js"), "export default {};\n"),
    ]);
    const cases: Case[] = [
      { id: "install", pinnedArgs: ["install", "./extension", "--no-approve"], ownedArgs: ["pi", "install", "./extension"] },
      { id: "list", pinnedArgs: ["list", "--no-approve"], ownedArgs: ["pi", "list"] },
      { id: "update-equivalent", pinnedArgs: ["update", "./extension", "--no-approve"], ownedArgs: ["pi", "update", "./extension"] },
      { id: "remove", pinnedArgs: ["remove", "./extension", "--no-approve"], ownedArgs: ["pi", "remove", "./extension"] },
    ];
    const pinned = normalizeHome(await capture("pinned", pinnedHome, cases, color), pinnedHome);
    const owned = normalizeHome(await capture("owned", ownedHome, cases, color), ownedHome);
    expect(owned).toEqual(pinned);
    expect(owned.find(entry => entry.id === "install")?.stdout).toContain("Installing ./extension...");
    expect(owned.find(entry => entry.id === "list")?.stdout).toContain("User packages:");
    expect(owned.find(entry => entry.id === "remove")?.stdout).toContain("Removed ./extension");
  }, 120_000);

  it.each([0, 1] as const)("projects pinned explicit help onto only A1's supported grammar at color level %i", async color => {
    const root = await home();
    const verbs = ["install", "remove", "uninstall", "list", "update"] as const;
    const cases: Case[] = verbs.map(verb => ({
      id: `help-${verb}`,
      pinnedArgs: [verb, "--unknown", "--help"],
      ownedArgs: ["pi", verb, "--unknown", "--help"],
    }));
    const pinned = await capture("pinned", root, cases, color);
    const owned = await capture("owned", root, cases, color);
    for (const [index, upstream] of pinned.entries()) {
      const verb = verbs[index];
      if (verb === undefined) throw new Error(`Missing help verb for transcript ${index}`);
      const canonical = verb === "uninstall" ? "remove" : verb;
      expect(owned[index]).toEqual({ ...upstream, stdout: projectHelp(upstream.stdout, canonical) });
      expect(owned[index]?.stderr).toBe("");
      expect(owned[index]?.code).toBe(0);
    }
  }, 120_000);

  it.each([0, 1] as const)("matches focused syntax wording and emphasis at color level %i", async color => {
    const root = await home();
    const forms = [
      ["install"], ["remove"], ["uninstall"],
      ["install", "--unknown"], ["remove", "--unknown"], ["list", "--unknown"], ["update", "--unknown"],
      ["install", "npm:one", "npm:two"], ["remove", "npm:one", "npm:two"], ["update", "npm:one", "npm:two"],
    ];
    const cases: Case[] = forms.map((args, i) => ({ id: `syntax-${i}`, pinnedArgs: args, ownedArgs: ["pi", ...args] }));
    const expected = await capture("pinned", root, cases, color);
    const actual = await capture("owned", root, cases, color);
    const piUpdateUsage = "pi update [source|self|pi] [--self|--extensions|--models|--all] [--extension <source>] [--approve|--no-approve] [--force]";
    for (const [index, upstream] of expected.entries()) {
      const projected = upstream.stderr
        .replaceAll(piUpdateUsage, "a1 pi update [source|--extensions|--models]")
        .replaceAll(/pi (install|remove) <source> \[-l\] \[--approve\|--no-approve\]/g, "a1 pi $1 <source>")
        .replaceAll("pi list [--approve|--no-approve]", "a1 pi list")
        .replaceAll('"pi --help"', '"a1 --help"');
      expect(actual[index]).toEqual({ ...upstream, stderr: projected, code: 2 });
      expect(upstream.code).toBe(1);
    }
  }, 120_000);

  it("reports user settings warnings before operation output without reading project settings", async () => {
    const root = await home();
    await mkdir(join(root, ".a1/agent"), { recursive: true });
    await mkdir(join(root, ".pi"), { recursive: true });
    await writeFile(join(root, ".a1/agent/settings.json"), "{ invalid user settings");
    await writeFile(join(root, ".pi/settings.json"), "{ invalid project settings");
    const cases: Case[] = [{ id: "list", pinnedArgs: ["list", "--no-approve"], ownedArgs: ["pi", "list"] }];
    const [owned] = await capture("owned", root, cases, 1);
    const [pinned] = await capture("pinned", root, cases, 1);
    expect(owned?.stdout).toEqual(pinned?.stdout);
    // Compatibility: stack frames truthfully identify different callsites. Compare Pi's primary
    // warning literally, and prove the secondary detail retains dim styling.
    expect(owned?.stderr.split("\n")[0]).toEqual(pinned?.stderr.split("\n")[0]);
    expect(owned?.stderr).toContain("\u001b[2mSyntaxError:");
    expect(owned?.stderr).not.toContain("project settings");
    expect(owned?.code).toBe(pinned?.code);
  }, 120_000);
});

function projectHelp(upstream: string, verb: "install" | "remove" | "list" | "update"): string {
  const command = `a1 pi ${verb}`;
  if (verb === "install") {
    return upstream
      .replace("pi install <source> [-l] [--approve|--no-approve]", `${command} <source>`)
      .replace(/\nOptions:\n(?:  .*\n)+\nExamples:/, "\nExamples:")
      .replaceAll("  pi install", `  ${command}`);
  }
  if (verb === "remove") {
    return upstream
      .replace("pi remove <source> [-l] [--approve|--no-approve]", `${command} <source>`)
      .replace("Alias: pi uninstall <source> [-l]", "Alias: a1 pi uninstall <source>")
      .replace(/\nOptions:\n(?:  .*\n)+\nExamples:/, "\nExamples:")
      .replaceAll("  pi remove", "  a1 pi remove")
      .replaceAll("  pi uninstall", "  a1 pi uninstall");
  }
  if (verb === "list") {
    return upstream
      .replace("pi list [--approve|--no-approve]", command)
      .replace("List installed packages from user and project settings.", "List installed packages from user settings.")
      .replace(/\nOptions:\n(?:  .*\n)+\n$/, "\n");
  }
  const retained = upstream
    .replace("pi update [source|self|pi] [--self|--extensions|--models|--all] [--extension <source>] [--approve|--no-approve] [--force]", `${command} [source|--extensions|--models]`)
    .replace("Update pi, installed packages, or model catalogs.", "Update installed packages or model catalogs.")
    .split("\n")
    .filter(line => ![
      "  --self", "  --all", "  --extension <", "  -a,", "  -na,", "  --force",
      "  pi update                ", "  pi update --all", "  pi update pi",
    ].some(prefix => line.startsWith(prefix)))
    .join("\n")
    .replaceAll("  pi update --models", "  a1 pi update --models")
    .replaceAll("  pi update <source>", "  a1 pi update <source>");
  return retained.replace("Short forms:\n", "Short forms:\n  a1 pi update --extensions   Update installed packages only\n");
}
