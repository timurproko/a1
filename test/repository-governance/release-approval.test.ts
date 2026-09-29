import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { assertAuthorizedApprovalActor, validateStableApproval } from "../../scripts/release/release-approval.mjs";

const version = "1.2.3";
const source = "a".repeat(40);
const body = "## [1.2.3] - 2026-09-28\n\n### Fixed\n\n- Reviewed.\n";
const release = { id: 17, tag_name: "v1.2.3", name: "v1.2.3", target_commitish: source, body, draft: true, prerelease: false };
const application = { name: "@fixture/a1", version: "1.2.3-dev" };
const lock = { version: "1.2.3-dev", packages: { "": { version: "1.2.3-dev" } } };
const installer = { name: "@fixture/a1-install", version: "1.2.3-dev" };
const valid = () => ({
  version, source, authoritativeSource: source, recovery: false, releases: [release], application, lock, installer,
  authoritativeApplication: application, authoritativeLock: lock, authoritativeInstaller: installer,
  existingApplication: null, existingInstaller: null,
});

describe("trusted stable approval validation", () => {
  it.each(["write", "maintain", "admin"])("accepts an authenticated human with %s permission", permission => {
    expect(assertAuthorizedApprovalActor({ login: "maintainer", type: "User" }, { permission }, "maintainer")).toBe("maintainer");
  });

  it.each([
    [{ login: "maintainer", type: "Bot" }, { permission: "admin" }, "maintainer"],
    [{ login: "other", type: "User" }, { permission: "admin" }, "maintainer"],
    [{ login: "maintainer", type: "User" }, { permission: "read" }, "maintainer"],
  ])("rejects non-human, mismatched, or unauthorized actors", (actor, permission, expected) => {
    expect(() => assertAuthorizedApprovalActor(actor, permission, expected)).toThrow(/authorized human/);
  });

  it("returns the exact normalized draft and digest", () => {
    const approval = validateStableApproval(valid());
    expect(approval.release).toBe(release);
    expect(approval.note.markdown).toBe(body);
    expect(approval.sha256).toBe(createHash("sha256").update(body).digest("hex"));
  });

  it("accepts an ancestor orphan-tag source while current develop preserves the open version", () => {
    const authoritativeSource = "b".repeat(40);
    expect(validateStableApproval({ ...valid(), authoritativeSource, recovery: true }).release).toBe(release);
  });

  it.each([
    ["missing", { releases: [] }],
    ["duplicate", { releases: [release, { ...release, id: 18 }] }],
    ["published", { releases: [{ ...release, draft: false }] }],
    ["stale source", { releases: [{ ...release, target_commitish: "b".repeat(40) }] }],
    ["unsafe body", { releases: [{ ...release, body: "<script>bad</script>" }] }],
    ["bad package versions", { installer: { ...installer, version: "1.2.2-dev" } }],
    ["existing application", { existingApplication: { version } }],
    ["existing installer", { existingInstaller: { version } }],
    ["normal source behind develop", { authoritativeSource: "b".repeat(40) }],
    ["recovery develop version changed", { authoritativeSource: "b".repeat(40), recovery: true,
      authoritativeApplication: { ...application, version: "1.2.4-dev" } }],
  ])("rejects %s approval authority", (_name, change) => {
    expect(() => validateStableApproval({ ...valid(), ...change })).toThrow();
  });
});
