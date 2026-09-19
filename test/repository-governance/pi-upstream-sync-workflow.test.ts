import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

/**
 * The re-run rules of the nightly Pi sync live in the workflow itself: a proposal branch with
 * commits the sync did not author is never replaced, a closed proposal with the skip label skips
 * its version, and a freeze date silences the schedule. These assertions keep each rule wired.
 */
describe("Pi upstream sync workflow", () => {
  const workflow = () => readFile(".github/workflows/pi-upstream-sync.yml", "utf8");

  it("never force-pushes over a proposal branch that carries commits the sync did not author", async () => {
    const source = await workflow();
    expect(source).toContain('git log --format=\'%ae\' "origin/develop..origin/$BRANCH" | grep -v -F -x "$BOT_EMAIL"');
    expect(source).toContain("steps.ownership.outputs.replace == 'true'");
    expect(source).toMatch(/if: steps\.propose\.outputs\.changed == 'true' && steps\.ownership\.outputs\.replace == 'true'\n[\s\S]*?git push --force-with-lease origin "\$BRANCH"/);
    expect(source).toContain('if [ "$REFRESH" = "true" ]; then\n            replace=false');
  });

  it("refreshes only the marked report section of the body and comments when it may not push", async () => {
    const source = await workflow();
    expect(source).toContain("node scripts/pi/refresh-pi-upgrade-body.mjs --existing .artifacts/pi-upgrade/existing-body.md --report .artifacts/pi-upgrade/report.json --output .artifacts/pi-upgrade/refreshed-body.md --comment .artifacts/pi-upgrade/comment.md");
    expect(source).toContain('gh pr edit "$existing" --body-file .artifacts/pi-upgrade/refreshed-body.md');
    expect(source).toContain('if [ "$REPLACED" != "true" ]; then\n            gh pr comment "$existing" --body-file .artifacts/pi-upgrade/comment.md');
    expect(source).not.toContain("--body-file .artifacts/pi-upgrade/body.md\n          fi");
  });

  it("skips the versions of closed proposals carrying the skip label unless a version is dispatched by name", async () => {
    const source = await workflow();
    const governance = JSON.parse(await readFile("config/github-repository-governance.json", "utf8")) as { labels: { name: string }[] };
    expect(governance.labels.map(label => label.name)).toContain("pi-upgrade-skipped");
    expect(source).toContain("SKIP_LABEL: pi-upgrade-skipped");
    expect(source).toContain('gh pr list --state closed --label "$SKIP_LABEL" --base develop');
    expect(source).toContain("select(.mergedAt == null)");
    expect(source).toContain('for version in $SKIPPED; do args+=(--skip "$version"); done');
    expect(source).toContain("if: steps.freeze.outputs.frozen != 'true' && inputs.refresh != true\n        id: skips");
  });

  it("honours a freeze date on the schedule and exposes the refresh dispatch", async () => {
    const source = await workflow();
    expect(source).toContain("FREEZE_UNTIL: ${{ vars.PI_UPGRADE_FREEZE_UNTIL }}");
    expect(source).toContain('if [ "$EVENT" = "schedule" ] && [ -n "$FREEZE_UNTIL" ]; then');
    expect(source).toContain("      refresh:\n        description:");
    expect(source).toContain('if [ "$REFRESH" = "true" ]; then args+=(--refresh); fi');
    expect(source).toContain('git checkout -B "chore/pi-$REQUESTED_VERSION" "origin/chore/pi-$REQUESTED_VERSION"');
  });
});
