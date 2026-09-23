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
    expect(config).toContain("no lifecycle body edit or second test run is required");
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
    expect(config).toContain("one to ten concise implementation-specific behavior-and-result bullets");
    expect(config).toContain("no acceptance, spec-only, or archive-only follow-up PR");
    expect(config).toContain("Standalone existing-spec/OpenSpec revisions and ordinary docs retain this route");
    expect(config).toContain("`local-worktree-cleanup.mjs complete`");
    expect(config).toContain("local-worktree-cleanup.mjs sweep --repo <primary>");
    expect(config).toContain("`local-worktree-cleanup.mjs handoff`");
    expect(config).toContain("never waits for the merge or starts a watcher");
    expect(config).toContain("prunes merged local topic branches by pull-request evidence");
    expect(config).toContain("requires an up-to-date base");
    expect(config).toContain("`retired-nothing-left`");
    expect(config).toContain("`forget --id --confirm-nothing-left`");
    expect(config).toContain("`discard --confirm-closed-unmerged`");
    expect(config).toContain("PR closure alone authorizes nothing");
    expect(config).toContain("Never choose disposable paths");
    expect(config).not.toContain("After the initial specification merges");
  });

  it("requires the owning session to link its exact worktree before delivery edits", async () => {
    const config = await readFile("openspec/config.yaml", "utf8");
    const skill = await readFile(".agents/skills/change-delivery/SKILL.md", "utf8");
    const structure = await readFile("docs/architecture/project-structure.md", "utf8");
    for (const guidance of [config, skill, structure]) {
      expect(guidance).toContain("`a1 session link-worktree <absolute-worktree>`");
      expect(guidance).toMatch(/before (?:changing |any )?(?:planning|planning or implementation)/i);
      expect(guidance).toMatch(/stop (?:feature |task )?edits? and report the blocker|report the blocker and stop feature edits/);
      expect(guidance).toMatch(/not tool cwd|does not change process or tool cwd/);
      expect(guidance).toMatch(/resuming or switching streams|resuming an existing delivery or switching streams/);
    }
    expect(config).toContain("Continue only when the command confirms that exact canonical worktree");
    expect(skill).toContain("continue only after it confirms the exact path");
    expect(structure).toContain("A successful link response confirming the exact canonical worktree is required");
    expect(structure).toContain("git worktree add -b <type>/<short-description>");
    expect(structure).toContain("Repository commands therefore keep an explicit worktree path");
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
    expect(skill).toContain("`local-worktree-cleanup.mjs sweep --repo <primary>`");
    expect(skill).toContain("`local-worktree-cleanup.mjs handoff`");
    expect(skill).toContain("A `BEHIND` PR: merge `origin/develop`, push, re-finalize, hand off again.");
    expect(skill).toContain("`discard --confirm-closed-unmerged`");
    expect(skill).toContain("PR closure alone authorizes nothing");
    expect(skill).toContain("never delete those ad hoc");
    expect(skill).not.toMatch(/version/i);
    expect(skill.split(/\s+/).length).toBeLessThan(600);
    for (const match of skill.matchAll(/\]\((\.\.\/[^)]+)\)/g)) await access(resolve(dirname(path), match[1]!));
  });

  it("documents the exact generated-artifact cleanup boundary", async () => {
    const cleanup = await readFile("docs/local-worktree-cleanup.md", "utf8");
    expect(cleanup).toContain("`.artifacts`, `native/process-guardian/target`");
    expect(cleanup).toContain("widened to the current policy on the next `complete`");
    expect(cleanup).toContain("near matches such as `.artifacts-user`, `artifacts`, or `pi-settings-metadata-user.json`");
    expect(cleanup).toContain("worktree-absent-unregistered");
    expect(cleanup).toContain("within five seconds of the pull request's `merged_at`");
    expect(cleanup).toContain("`native/process-guardian/target`");
    expect(cleanup).toContain("`native/terminal-host/target`");
    expect(cleanup).toContain("`src/integrations/pi/engine/pi-settings-metadata.json`");
    expect(cleanup).toContain("arbitrary `target` directories");
    expect(cleanup).toContain("bounded to 20,000 ordinary entries plus 100,000 entries beneath exact approved generated roots");
    expect(cleanup).toContain("exhausting either allowance never grants deletion authority");
    expect(cleanup).toContain("## Explicit closed-unmerged discard");
    expect(cleanup).toContain("--confirm-closed-unmerged");
    expect(cleanup).toContain("expected-SHA lease");
    expect(cleanup).toContain("never scans by age or name");
    expect(cleanup).toContain("## Hand-off and sweep: the ordinary agent path");
    expect(cleanup).toContain("local-worktree-cleanup.mjs handoff");
    expect(cleanup).toContain("local-worktree-cleanup.mjs sweep --repo D:/Git/a1");
    expect(cleanup).toContain("It needs no `enable` and starts no process");
    expect(cleanup).toContain("`awaiting-discard`");
    expect(cleanup).toContain("### Accepted ancestry");
    expect(cleanup).toContain("Ancestry of `develop` is never used, because the repository squash-merges");
    expect(cleanup).toContain("### Merged branch pruning");
    expect(cleanup).toContain("`branch-unmerged-commits`");
    expect(cleanup).toContain("a preview never prunes");
    expect(cleanup).toContain("### Nothing left to remove");
    expect(cleanup).toContain("forget --repo D:/Git/a1 --id REGISTRATION_ID --confirm-nothing-left");
    expect(cleanup).toContain("### Keep the base current before merge");
    expect(cleanup).toContain("requires the pull request head to be up to date with `develop`");
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
    expect(docs).toContain("## Automated finalization");
    expect(docs).toContain("Ready and automated finalization");
    expect(docs).toContain("Do not revert a finalization commit to make a fix");
    expect(docs).toContain("pull before pushing");
    expect(docs).toContain("`finalization-merge-conflict`");
    expect(docs).toContain("Base-controlled readiness defers a ready head that still holds the active change");
    expect(docs).toContain("Generated repair drafts run no Development test suites");
    const config = await readFile("openspec/config.yaml", "utf8");
    const skill = await readFile(".agents/skills/change-delivery/SKILL.md", "utf8");
    for (const text of [config, skill]) {
      expect(text).toContain("`OpenSpec finalization` workflow");
      expect(text).toContain("never revert a finalization commit");
      expect(text).toMatch(/[Pp]ull before pushing/);
    }
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
    expect(docs).toContain("local `discard` command");
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
