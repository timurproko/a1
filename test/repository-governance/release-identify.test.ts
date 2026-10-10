import { spawnSync } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { parse } from "yaml";

type Step = { id?: string; run?: string };
type Workflow = { jobs: Record<string, { steps: Step[] }> };

async function identifyScript(): Promise<string> {
  const workflow = parse(await readFile(".github/workflows/release.yml", "utf8")) as Workflow;
  const step = workflow.jobs.identify!.steps.find(candidate => candidate.id === "identify");
  if (!step?.run) throw new Error("release identify step is missing");
  return step.run;
}

// Rationale: the step is executed, not only read, because a regex capture can be clobbered by a later test.
async function identify(tag: string, releaseId: string) {
  const directory = await mkdtemp(join(tmpdir(), "a1-release-identify-"));
  try {
    const output = join(directory, "output").replaceAll("\\", "/");
    await writeFile(output, "");
    const result = spawnSync("bash", ["--noprofile", "--norc", "-e", "-o", "pipefail", "-c", await identifyScript()], {
      encoding: "utf8", timeout: 10_000,
      env: { ...process.env, TAG_NAME: tag, RELEASE_ID: releaseId, GITHUB_OUTPUT: output },
    });
    return { status: result.status, stderr: result.stderr, output: await readFile(output, "utf8") };
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

describe("published stable Release identification", () => {
  it("derives the version and release id from a published stable tag", async () => {
    const result = await identify("v0.2.2", "399403552");
    expect(result.stderr).toBe("");
    expect(result.status).toBe(0);
    expect(result.output).toBe("version=0.2.2\nrelease_id=399403552\n");
  });

  it.each([["v0.2.2-dev.5", "1"], ["0.2.2", "1"], ["v01.2.3", "1"], ["v0.2.2", "0"], ["v0.2.2", "abc"]])(
    "rejects tag %s with release id %s", async (tag, releaseId) => {
      const result = await identify(tag, releaseId);
      expect(result.status).toBe(1);
      expect(result.stderr).toContain("::error::");
      expect(result.output).toBe("");
    });
});
