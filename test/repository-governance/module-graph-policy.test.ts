import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  collectModuleGraph,
  findImportCycles,
  findUnreachableModules,
  inspectModuleGraph,
  type ArchitectureAllowlist,
} from "../../scripts/governance/module-graph-policy.mjs";

const roots: string[] = [];

async function repository(files: Record<string, string>): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "module-graph-"));
  roots.push(root);
  for (const [path, source] of Object.entries(files)) {
    await mkdir(dirname(join(root, path)), { recursive: true });
    await writeFile(join(root, path), source);
  }
  return root;
}

function allowlist(overrides: Partial<ArchitectureAllowlist> = {}): ArchitectureAllowlist {
  return { schema: "a1-architecture-allowlist-v1", entryModules: [], importCycles: [], unreachableModules: [], ...overrides };
}

const ENTRY = { "bin/cli.js": "import { run } from '../dist/app/main.js'; run();" };

afterEach(async () => {
  await Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true })));
});

describe("module graph policy", () => {
  it("separates static edges from runtime edges", async () => {
    const root = await repository({
      "src/a.ts": "import path from 'node:path';\nimport type { B } from './b.js';\nimport { c } from './c.js';\nexport * from './d.js';\nconst worker = new URL(source ? './w.ts' : './w.js', import.meta.url);\nconst lazy = () => import('./e.js');",
      "src/b.ts": "export type B = 1;",
      "src/c.ts": "export const c = 1;",
      "src/d.ts": "export const d = 1;",
      "src/e.ts": "export const e = 1;",
      "src/w.ts": "",
    });
    const graph = await collectModuleGraph(root);
    expect(graph.get("src/a.ts")).toEqual({
      staticEdges: ["src/b.ts", "src/c.ts", "src/d.ts", "src/e.ts", "src/w.ts"],
      runtimeEdges: ["src/c.ts", "src/d.ts", "src/e.ts", "src/w.ts"],
      typeOnly: false,
    });
    expect(graph.get("src/b.ts")?.typeOnly).toBe(true);
  });

  it("finds every cycle including type-only back edges", async () => {
    const root = await repository({
      "src/x.ts": "import { y } from './y.js';",
      "src/y.ts": "import type { X } from './x.js';",
      "src/p.ts": "import './q.js';",
      "src/q.ts": "import './r.js';",
      "src/r.ts": "import './p.js';",
      "src/alone.ts": "",
    });
    expect(findImportCycles(await collectModuleGraph(root))).toEqual([
      ["src/p.ts", "src/q.ts", "src/r.ts"],
      ["src/x.ts", "src/y.ts"],
    ]);
  });

  it("reaches a type-only module through type imports, exempts owner barrels, and still strands runtime modules", async () => {
    const root = await repository({
      "src/main.ts": "import type { T } from './types-only.js';\nimport type { R } from './runtime.js';\nimport { live } from './live.js';",
      "src/types-only.ts": "export interface T { readonly a: 1 }\nexport type { U } from './other-types.js';",
      "src/other-types.ts": "export type U = 2;",
      "src/runtime.ts": "export type R = 1;\nexport const r = 1;",
      "src/live.ts": "export const live = 1;",
      "src/owner/index.ts": "export * from './leaf.js';",
      "src/owner/leaf.ts": "export const leaf = 1;",
    });
    expect(findUnreachableModules(await collectModuleGraph(root), ["src/main.ts"])).toEqual(["src/owner/leaf.ts", "src/runtime.ts"]);
  });

  it("collects roots from bin dist references and package.json", async () => {
    const root = await repository({
      ...ENTRY,
      "package.json": JSON.stringify({ exports: { "./worker": "./dist/worker/index.js" } }),
      "src/app/main.ts": "export const run = () => {};",
      "src/worker/index.ts": "import './job.js';",
      "src/worker/job.ts": "",
      "src/orphan.ts": "",
    });
    expect(await inspectModuleGraph(root, allowlist())).toEqual([
      "src/orphan.ts: not reachable from any entry and not allowlisted; delete it, connect it, or declare it an entry",
    ]);
  });

  it("reports an unlisted cycle with its members and accepts a listed one", async () => {
    const root = await repository({
      ...ENTRY,
      "src/app/main.ts": "import './a.js'; export const run = () => {};",
      "src/app/a.ts": "import './b.js';",
      "src/app/b.ts": "import './a.js';",
    });
    expect(await inspectModuleGraph(root, allowlist())).toEqual([
      "import cycle of 2 modules is not allowlisted: src/app/a.ts <-> src/app/b.ts",
    ]);
    expect(await inspectModuleGraph(root, allowlist({ importCycles: [["src/app/b.ts", "src/app/a.ts"]] }))).toEqual([]);
  });

  it("reports listed cycles and modules that no longer hold as stale", async () => {
    const root = await repository({
      ...ENTRY,
      "src/app/main.ts": "import './a.js'; export const run = () => {};",
      "src/app/a.ts": "",
    });
    expect(await inspectModuleGraph(root, allowlist({
      importCycles: [["src/app/a.ts", "src/app/main.ts"]],
      unreachableModules: ["src/app/a.ts", "src/app/gone.ts"],
    }))).toEqual([
      "architecture allowlist: listed import cycle no longer exists: src/app/a.ts <-> src/app/main.ts; drop it",
      "architecture allowlist: src/app/a.ts is reachable again; drop it from unreachableModules",
      "architecture allowlist: src/app/gone.ts is gone; drop it from unreachableModules",
    ]);
  });

  it("accepts a declared entry only while nothing imports it", async () => {
    const root = await repository({
      ...ENTRY,
      "src/app/main.ts": "export const run = () => {};",
      "src/app/worker.ts": "import './shared.js';",
      "src/app/shared.ts": "",
    });
    expect(await inspectModuleGraph(root, allowlist({ entryModules: ["src/app/worker.ts"] }))).toEqual([]);
    await writeFile(join(root, "src/app/main.ts"), "import './worker.js'; export const run = () => {};");
    expect(await inspectModuleGraph(root, allowlist({ entryModules: ["src/app/worker.ts", "src/app/missing.ts"] }))).toEqual([
      "architecture allowlist: declared entry module src/app/worker.ts is imported by src/app/main.ts; drop the declaration",
      "architecture allowlist: declared entry module src/app/missing.ts does not exist",
    ]);
  });

  it("rejects an allowlist with the wrong schema", async () => {
    const root = await repository(ENTRY);
    expect(await inspectModuleGraph(root, { schema: "other" } as unknown as ArchitectureAllowlist)).toEqual(["architecture allowlist schema is invalid"]);
  });
});
