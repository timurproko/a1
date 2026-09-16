import { access, readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { parseImplementation } from "../../scripts/governance/openspec-archive-policy.mjs";

describe("repository-owned atomic delivery guidance", () => {
  it("keeps planning approval, exact-head validation, and manual acceptance distinct", async () => {
    const config = await readFile("openspec/config.yaml", "utf8");
    expect(config).toContain("one normally named draft PR");
    expect(config).not.toContain("> Phase: Proposal");
    expect(config).not.toContain("> Phase: Implementation");
    expect(config).toContain("do not add a quoted proposal or implementation phase line");
    expect(config).toContain("no lifecycle body edit or second validation run is required");
    expect(config).toContain("derive the post-merge state `Archived`");
    expect(config).toContain("`## Proposal`");
    expect(config).toContain("one or two sentences of intent");
    expect(config).toContain("`## Implementation`");
    expect(config).toContain("`## Automation`");
    expect(config).toContain("Omit routine validation-command listings");
    expect(config).toContain("explicit plan approval and an implementation request");
    expect(config).toContain("same worktree, branch, history, and draft PR");
    expect(config).toContain("Never arm or invoke auto-merge");
    expect(config).toContain("A new head, changed body list, changed manifest, or advanced target baseline requires renewed validation");
    expect(config).toContain("manual merge of the exact validated head means the listed scenarios are accepted");
    expect(config).toContain("one to three concise implementation-specific behavior-and-result bullets");
    expect(config).toContain("no acceptance, spec-only, or archive-only follow-up PR");
    expect(config).toContain("Standalone existing-spec/OpenSpec revisions and ordinary docs retain this route");
    expect(config).toContain("`local-worktree-cleanup.mjs complete`");
    expect(config).toContain("Never choose disposable paths");
    expect(config).not.toContain("After the initial specification merges");
  });

  it("ships a concise first-party skill with resolvable local guidance links", async () => {
    const path = resolve(".agents/skills/change-delivery/SKILL.md");
    const skill = await readFile(path, "utf8");
    expect(skill).toMatch(/^---\nname: change-delivery\ndescription: .+\n---/);
    expect(skill).toContain("same worktree, branch, history, and PR");
    expect(skill).not.toContain("> Phase: Proposal");
    expect(skill).not.toContain("> Phase: Implementation");
    expect(skill).toContain("do not add a quoted phase line");
    expect(skill).toContain("Do not add a lifecycle body edit");
    expect(skill).toContain("report `Archived`");
    expect(skill).toContain("`## Proposal`");
    expect(skill).toContain("one or two sentences of intent");
    expect(skill).toContain("`## Implementation`");
    expect(skill).toContain("`## Automation`");
    expect(skill).toContain("approves the plan and explicitly requests implementation");
    expect(skill).toContain("## Acceptance");
    expect(skill).toContain("Create no acceptance, spec-only, or archive-only follow-up PR");
    expect(skill).toContain("`local-worktree-cleanup.mjs complete`");
    expect(skill).toContain("never delete those ad hoc");
    expect(skill).not.toMatch(/version/i);
    expect(skill.split(/\s+/).length).toBeLessThan(600);
    for (const match of skill.matchAll(/\]\((\.\.\/[^)]+)\)/g)) await access(resolve(dirname(path), match[1]!));
  });

  it("documents the exact generated-artifact cleanup boundary", async () => {
    const cleanup = await readFile("docs/local-worktree-cleanup.md", "utf8");
    expect(cleanup).toContain("`.artifacts/validation`");
    expect(cleanup).toContain("`.artifacts`, sibling directories");
    expect(cleanup).toContain("`.artifacts/validation-user` remain blocking");
  });

  it("documents valid draft and finalized single-PR links without inventing acceptance", async () => {
    const docs = await readFile("docs/openspec-archive-automation.md", "utf8");
    const examples = [...docs.matchAll(/```openspec-implementation\n([\s\S]*?)\n```/g)].map(match =>
      parseImplementation(`\`\`\`openspec-implementation\n${match[1]}\n\`\`\``));
    expect(examples.map(value => value?.version)).toEqual([3, 3]);
    expect(examples[0]).not.toHaveProperty("archive");
    expect(examples[1]).toMatchObject({ archive: "openspec/changes/archive/2026-09-15-example-change/",
      acceptanceManifest: "openspec/changes/archive/2026-09-15-example-change/acceptance.md" });
    expect(docs).toContain("## Draft PR body");
    expect(docs).toContain("The first screen should separate purpose from delivery detail, not foreground CI mechanics");
    expect(docs).toContain("## Proposal");
    expect(docs).not.toContain("> Phase: Proposal");
    expect(docs).not.toContain("> Phase: Implementation");
    expect(docs).toContain("no lifecycle body edit or second workflow run is required");
    expect(docs).not.toContain("> Phase: Acceptance");
    expect(docs).toContain("derives `Archived`");
    expect(docs).toContain("## Implementation");
    expect(docs).toContain("## Automation");
    expect(docs).toContain("## Acceptance");
    expect(docs).toContain("plain bullets");
    expect(docs).toContain("Manual merge is the acceptance decision");
    expect(docs).toContain("acceptance PR, archive PR");
    expect(docs).toContain("standalone spec/docs PR retaining auto-merge");
    expect(docs).toContain("## Legacy delivery");
    expect(docs).toContain("Unit tests or API success alone are not live acceptance");
    expect(docs).toContain("exact-candidate `complete` operation");
    expect(docs).toContain("agents do not manually delete generated content");
  });

  it("updates canonical purpose text for atomic manual delivery", async () => {
    const runbook = await readFile("docs/ci-release-runbook.md", "utf8");
    expect(runbook).not.toContain("starts only after that specification merges");
    const spec = await readFile("openspec/specs/change-delivery-workflow/spec.md", "utf8");
    const purpose = spec.split("## Purpose")[1]?.split("## Requirements")[0];
    expect(purpose).toContain("same-PR implementation and finalization");
    expect(purpose).toContain("atomic specification/archive integration");
  });
});
