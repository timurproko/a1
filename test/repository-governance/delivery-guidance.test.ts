import { readFile } from "node:fs/promises";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { parseDocument } from "yaml";

const root = fileURLToPath(new URL("../../", import.meta.url));
const entryPoints = ["AGENTS.md", ".agents/skills/change-delivery/SKILL.md", "openspec/config.yaml"];
const procedureOwners = [
  "docs/openspec-archive-automation.md",
  "docs/architecture/project-structure.md",
  "docs/local-worktree-cleanup.md",
];
const guidancePaths = [...entryPoints, procedureOwners[0]!, procedureOwners[2]!, "docs/features/session-exports.md"];

const progress = "Plan `tasks.md` as one task group per PR `## Implementation` outcome, in the same order. Then work one outcome at a time: write its code and tests, tick its `tasks.md` tasks, commit and push, and tick that outcome in the PR body (`[ ]` to `[x]`, nothing else) before starting the next one. A tick means the code and tests are written: CI, broad test runs, and manual validation never delay it, and a later defect is fixed in a new commit. Never save ticks for handoff.";

describe("implementation progress guidance", () => {
  it("gives every agent one shared rule for ticking outcomes while implementing", async () => {
    const agents = (await readFile(resolve(root, "AGENTS.md"), "utf8")).replaceAll("\r\n", "\n");
    expect(agents).toContain(`## Implementation progress\n\n${progress}\n`);
    expect(agents).toContain("never mark an implementation PR ready yourself");
    const runbook = await readFile(resolve(root, procedureOwners[0]!), "utf8");
    expect(runbook).toContain("one task group per item in the same order");
    expect(runbook).toContain("commit, push, and check that item before starting the next");
  });
});

describe("delivery guidance routing", () => {
  it.each(entryPoints)("routes %s to the existing procedure owners", async path => {
    const source = await readFile(resolve(root, path), "utf8");
    const destinations = localReferences(path, source).map(reference => relative(root, reference.path).replaceAll("\\", "/"));
    expect(destinations).toEqual(expect.arrayContaining(procedureOwners));
  });

  it("keeps routing in valid OpenSpec context rather than an unused YAML field", async () => {
    const document = parseDocument(await readFile(resolve(root, "openspec/config.yaml"), "utf8"));
    expect(document.errors).toEqual([]);
    expect(document.get("schema")).toBe("spec-driven");
    const context: unknown = document.get("context");
    expect(typeof context).toBe("string");
    const destinations = localReferences("openspec/config.yaml", context as string)
      .map(reference => relative(root, reference.path).replaceAll("\\", "/"));
    expect(destinations).toEqual(expect.arrayContaining(procedureOwners));
  });

  it("keeps local guidance references and section anchors resolvable", async () => {
    for (const path of guidancePaths) {
      const source = await readFile(resolve(root, path), "utf8");
      for (const reference of localReferences(path, source)) {
        const destination = await readFile(reference.path, "utf8");
        if (reference.anchor) {
          expect(headingAnchors(destination), `${path} -> ${relative(root, reference.path)}#${reference.anchor}`)
            .toContain(reference.anchor);
        }
      }
    }
  });

  it("routes session-export help through the shared decision before optional preservation", async () => {
    const path = "docs/features/session-exports.md";
    const source = await readFile(resolve(root, path), "utf8");
    const decisions = localReferences(path, source).find(reference => reference.anchor === "export-decisions");
    expect(decisions?.path).toBe(resolve(root, "docs/local-worktree-cleanup.md"));
    const cleanup = await readFile(resolve(root, "docs/local-worktree-cleanup.md"), "utf8");
    expect(localReferences("docs/local-worktree-cleanup.md", cleanup))
      .toContainEqual({ path: resolve(root, "docs/local-worktree-cleanup.md"), anchor: "explicit-named-export-preservation" });
  });
});

function localReferences(path: string, source: string): { path: string; anchor: string }[] {
  return [...source.matchAll(/\[[^\]\r\n]+\]\(([^)\s]+)\)/gu)]
    .map(match => match[1]!)
    .filter(href => !/^(?:[a-z][a-z0-9+.-]*:|\/\/)/iu.test(href))
    .map(href => {
      const [target, anchor = ""] = href.split("#");
      return { path: target ? resolve(root, dirname(path), target) : resolve(root, path), anchor };
    });
}

function headingAnchors(source: string): string[] {
  const anchors: string[] = [];
  const counts = new Map<string, number>();
  let fence = "";
  for (const line of source.split(/\r?\n/u)) {
    const marker = /^\s*(`{3,}|~{3,})/u.exec(line)?.[1];
    if (marker) {
      if (!fence) fence = marker;
      else if (marker[0] === fence[0] && marker.length >= fence.length) fence = "";
      continue;
    }
    if (fence) continue;
    const heading = /^#{1,6}\s+(.+?)\s*#*$/u.exec(line)?.[1];
    if (!heading) continue;
    const slug = heading.toLowerCase().replace(/[^\p{L}\p{N}_ -]/gu, "").replaceAll(" ", "-");
    const count = counts.get(slug) ?? 0;
    anchors.push(count ? `${slug}-${count}` : slug);
    counts.set(slug, count + 1);
  }
  return anchors;
}
