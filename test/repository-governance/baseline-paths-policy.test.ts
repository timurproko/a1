import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { inspectBaselinePaths, recordedSourcePaths } from "../../scripts/governance/baseline-paths-policy.mjs";

const roots: string[] = [];

async function repository(baselines: Record<string, unknown>, files: string[]): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "baseline-paths-"));
  roots.push(root);
  await mkdir(join(root, "config", "baselines"), { recursive: true });
  for (const [name, document] of Object.entries(baselines)) {
    await writeFile(join(root, "config", "baselines", name), JSON.stringify(document));
  }
  for (const file of files) {
    await mkdir(join(root, file, ".."), { recursive: true });
    await writeFile(join(root, file), "");
  }
  return root;
}

afterEach(async () => {
  await Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true })));
});

describe("governance baseline recorded paths", () => {
  it("collects source paths by shape from any field, nested at any depth", () => {
    expect(recordedSourcePaths({
      coverage: ["test/a.test.ts", "packages/coding-agent/src/upstream.ts"],
      records: [{ localDestination: "src/integrations/pi/x.ts", upstreamPath: "packages/tui/src/y.ts" }],
      nested: { deeper: { path: "scripts/governance/z.mjs", note: "src/not-a-path" } },
      entry: "bin/ui.js",
    })).toEqual(["bin/ui.js", "scripts/governance/z.mjs", "src/integrations/pi/x.ts", "test/a.test.ts"]);
  });

  it("names the baseline file and each missing path", async () => {
    const root = await repository({
      "one.json": { coverage: ["test/present.test.ts", "test/gone.test.ts"] },
      "two.json": { records: [{ path: "src/gone.ts" }] },
    }, ["test/present.test.ts"]);

    expect(await inspectBaselinePaths(root)).toEqual([
      "config/baselines/one.json: records missing path test/gone.test.ts",
      "config/baselines/two.json: records missing path src/gone.ts",
    ]);
  });

  it("passes silently when every recorded path exists", async () => {
    const root = await repository({
      "one.json": { coverage: ["test/present.test.ts"], records: [{ path: "src/present.ts" }] },
    }, ["test/present.test.ts", "src/present.ts"]);

    expect(await inspectBaselinePaths(root)).toEqual([]);
  });

  it("reports a baseline that is not valid JSON instead of skipping it", async () => {
    const root = await repository({}, []);
    await writeFile(join(root, "config", "baselines", "broken.json"), "{");

    const errors = await inspectBaselinePaths(root);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toMatch(/^config\/baselines\/broken\.json: not valid JSON/);
  });
});
