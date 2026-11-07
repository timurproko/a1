import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { main } from "../../scripts/governance/reconcile-openspec-archive.mjs";

describe("archive reconciliation tool root", () => {
  it("restricts the isolated tool override to candidate validation", async () => {
    await expect(main(["--dry-run", "--tool-root", "unused"])).rejects.toThrow("tool-root-mode");
    await expect(main(["--validate-candidate", "--pr", "1", "--tool-root", ""])).rejects.toThrow("tool-root-mode");
  });

  it("uses the explicit tool root rather than falling back to checkout dependencies", async () => {
    const root = await mkdtemp(join(tmpdir(), "archive-validation-tool-"));
    try {
      await expect(main(["--validate-candidate", "--pr", "1", "--tool-root", root])).rejects.toMatchObject({ code: "ENOENT" });
    } finally { await rm(root, { recursive: true, force: true }); }
  });
});
