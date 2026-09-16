import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { inspectStartupReachability, runtimeRelativeImports, validateStartupReachabilityBaseline } from "../../scripts/governance/startup-graph-policy.mjs";

const roots: string[] = [];
afterEach(async () => { await Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true }))); });

async function put(root: string, path: string, source: string) {
  await mkdir(dirname(join(root, path)), { recursive: true });
  await writeFile(join(root, path), source);
}

describe("startup reachability policy", () => {
  it("reports the shortest edge into a broad runtime barrel with deterministic totals", async () => {
    const root = await mkdtemp(join(tmpdir(), "a1-startup-graph-"));
    roots.push(root);
    await put(root, "src/root.ts", "import { leaf } from './direct.js';\nimport type { Contract } from './types.js';\nexport const value = leaf;\n");
    await put(root, "src/direct.ts", "import { broad } from './integrations/pi/components/index.js';\nexport const leaf = broad;\n");
    await put(root, "src/integrations/pi/components/index.ts", "export const broad = 1;\n");
    await put(root, "src/types.ts", "export interface Contract { value: number }\n");
    const report = await inspectStartupReachability(root, { roots: ["src/root.ts"] });
    expect(report.totals.files).toBe(3);
    expect(report.modules.map(module => module.path)).not.toContain("src/types.ts");
    expect(report.errors).toEqual([
      "src/integrations/pi/components/index.ts: prohibited startup entry via src/root.ts -> src/direct.ts -> src/integrations/pi/components/index.ts",
    ]);
  });

  it("recognizes multiline runtime imports while allowing erased type-only imports", () => {
    expect(runtimeRelativeImports(`import {\n  value,\n  type Shape,\n} from "./runtime.js";\nimport type { Contract } from "./types.js";\n`)).toEqual(["./runtime.js"]);
  });

  it("rejects an optional eager import even when timing evidence could still pass", async () => {
    const root = await mkdtemp(join(tmpdir(), "a1-startup-optional-"));
    roots.push(root);
    await put(root, "src/root.ts", "import './optional.js';\n");
    await put(root, "src/optional.ts", "export const optional = true;\n");
    const report = await inspectStartupReachability(root, { roots: ["src/root.ts"] });
    expect(validateStartupReachabilityBaseline(report, {
      schema: "a1-startup-graph-baseline-v1",
      a1Reachability: { maximumFiles: 10, maximumSourceBytes: 10_000, optionalModules: ["src/optional.ts"] },
    })).toEqual(["src/optional.ts: optional module is eagerly reachable"]);
  });

  it("keeps the production startup graph free of prohibited barrels", async () => {
    const report = await inspectStartupReachability(process.cwd());
    expect(report.errors).toEqual([]);
    expect(report.totals.files).toBeGreaterThan(100);
    expect(report.modules.find(module => module.path === "src/integrations/pi/startup-public.ts")?.chain).toEqual([
      "src/composition/owned-ui.ts",
      "src/integrations/pi/engine/adapter.ts",
      "src/integrations/pi/startup-public.ts",
    ]);
  });
});
