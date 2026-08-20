import { mkdtemp, mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { interactiveLaunchIntent, prepareInteractiveLaunch, resolveLaunchProfilePaths } from "../../../src/features/launch/index.js";

const roots: string[] = [];
afterEach(async () => await Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true }))));

const profileArtifacts = [
  "settings.json",
  "auth.json",
  "sessions/session.jsonl",
  "extensions/extension.ts",
  "skills/example/SKILL.md",
  "prompts/prompt.md",
  "themes/theme.json",
  "npm/package/package.json",
  "trust.json",
] as const;

describe("launch profile filesystem isolation", () => {
  it("keeps Pi-owned settings, authentication, sessions, resources, packages, and trust in the selected root", async () => {
    const home = await mkdtemp(resolve(tmpdir(), "a1-profile-isolation-"));
    roots.push(home);
    const paths = resolveLaunchProfilePaths({ home, environment: {}, platform: process.platform });
    const rootsByProfile = {
      pi: resolve(home, ".pi", "agent"),
      a1: paths.a1Agent,
      sandbox: paths.sandbox,
    } as const;

    for (const [profile, root] of Object.entries(rootsByProfile)) {
      for (const artifact of profileArtifacts) {
        const path = resolve(root, artifact);
        await mkdir(resolve(path, ".."), { recursive: true });
        await writeFile(path, `${profile}:${artifact}`);
      }
    }
    await rm(resolve(rootsByProfile.a1, "auth.json"));

    const a1 = await prepareInteractiveLaunch(interactiveLaunchIntent("a1"), {}, { home, platform: process.platform });
    const vanilla = await prepareInteractiveLaunch(interactiveLaunchIntent("pi"), { PI_CODING_AGENT_DIR: "must-be-removed" }, { home, platform: process.platform });
    const sandbox = await prepareInteractiveLaunch(interactiveLaunchIntent("sandbox"), {}, { home, platform: process.platform });

    expect(a1.configurationRoot).toBe(rootsByProfile.a1);
    expect(vanilla.configurationRoot).toBeNull();
    expect(vanilla.environment.PI_CODING_AGENT_DIR).toBeUndefined();
    expect(sandbox.configurationRoot).toBe(rootsByProfile.sandbox);
    expect(sandbox.piArguments).toEqual(["--no-approve"]);

    await expect(stat(resolve(rootsByProfile.a1, "auth.json"))).rejects.toMatchObject({ code: "ENOENT" });
    await expect(readFile(resolve(rootsByProfile.pi, "auth.json"), "utf8")).resolves.toBe("pi:auth.json");
    await expect(readFile(resolve(rootsByProfile.sandbox, "auth.json"), "utf8")).resolves.toBe("sandbox:auth.json");

    for (const artifact of profileArtifacts.filter(value => value !== "auth.json")) {
      await expect(readFile(resolve(rootsByProfile.a1, artifact), "utf8")).resolves.toBe(`a1:${artifact}`);
      await expect(readFile(resolve(rootsByProfile.pi, artifact), "utf8")).resolves.toBe(`pi:${artifact}`);
      await expect(readFile(resolve(rootsByProfile.sandbox, artifact), "utf8")).resolves.toBe(`sandbox:${artifact}`);
    }
  });

  it("profile selection adds no terminal intermediary", async () => {
    const source = await readFile("src/features/launch/prepare-launch.ts", "utf8");
    expect(source).not.toMatch(/node-pty|conpty|wezterm|@xterm|parser|renderer|framebuffer|process\.stdin|process\.stdout|SendInput|ReadConsoleInputW/i);
    expect(source).toContain("PI_CODING_AGENT_DIR");
    expect(source).toContain("--no-approve");
  });
});
