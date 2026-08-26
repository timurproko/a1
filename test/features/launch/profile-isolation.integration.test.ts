import { mkdtemp, mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { interactiveLaunchIntent, prepareInteractiveLaunch, resolveLaunchProfilePaths } from "../../../src/features/launch/index.js";

const roots: string[] = [];
afterEach(async () => await Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true }))));

const profileArtifacts = [
  "settings.json", "auth.json", "sessions/session.jsonl", "extensions/extension.ts",
  "skills/example/SKILL.md", "prompts/prompt.md", "themes/theme.json", "npm/package/package.json", "trust.json",
] as const;

describe("launch profile filesystem isolation", () => {
  it("keeps A1 and ordinary Pi profile data separate", async () => {
    const home = await mkdtemp(resolve(tmpdir(), "a1-profile-isolation-"));
    roots.push(home);
    const paths = resolveLaunchProfilePaths({ home, environment: {}, platform: process.platform });
    const rootsByProfile = { pi: resolve(home, ".pi", "agent"), owned: paths.agentProfile } as const;

    for (const [profile, root] of Object.entries(rootsByProfile)) {
      for (const artifact of profileArtifacts) {
        const path = resolve(root, artifact);
        await mkdir(resolve(path, ".."), { recursive: true });
        await writeFile(path, `${profile}:${artifact}`);
      }
    }
    await rm(resolve(rootsByProfile.owned, "auth.json"));

    const ownedLaunch = await prepareInteractiveLaunch(interactiveLaunchIntent("a1"), {}, { home, platform: process.platform });
    const vanilla = await prepareInteractiveLaunch(interactiveLaunchIntent("pi"), { PI_CODING_AGENT_DIR: "must-be-removed" }, { home, platform: process.platform });

    expect(ownedLaunch.configurationRoot).toBe(rootsByProfile.owned);
    expect(vanilla.configurationRoot).toBeNull();
    expect(vanilla.environment.PI_CODING_AGENT_DIR).toBeUndefined();
    await expect(stat(resolve(rootsByProfile.owned, "auth.json"))).rejects.toMatchObject({ code: "ENOENT" });
    await expect(readFile(resolve(rootsByProfile.pi, "auth.json"), "utf8")).resolves.toBe("pi:auth.json");

    for (const artifact of profileArtifacts.filter(value => value !== "auth.json")) {
      await expect(readFile(resolve(rootsByProfile.owned, artifact), "utf8")).resolves.toBe(`owned:${artifact}`);
      await expect(readFile(resolve(rootsByProfile.pi, artifact), "utf8")).resolves.toBe(`pi:${artifact}`);
    }
  });

  it("profile selection adds no terminal intermediary", async () => {
    const source = await readFile("src/features/launch/prepare-launch.ts", "utf8");
    expect(source).not.toMatch(/node-pty|conpty|wezterm|@xterm|parser|renderer|framebuffer|process\.stdin|process\.stdout|SendInput|ReadConsoleInputW/i);
    expect(source).toContain("PI_CODING_AGENT_DIR");
  });
});
