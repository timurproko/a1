import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { inspectDeliveryBody, main } from "../../scripts/governance/check-delivery-body.mjs";

const body = ({ first = "x", acceptance = "- Using the example preserves the updated observable behavior." } = {}) => `## Proposal\n\nDeliver the example behavior.\n\n## Implementation\n\n- [${first}] Implement the updated example behavior and its focused fixture evidence.\n- [x] Reconcile the detailed example tasks and delivery documentation.\n\n${acceptance ? `## Acceptance\n\n${acceptance}\n\n` : ""}## Automation\n\n<details>\n<summary>Used by CI to link this PR to its OpenSpec change</summary>\n\n\`\`\`openspec-implementation\n{\n  "version": 3,\n  "change": "example"\n}\n\`\`\`\n\n</details>\n`;

describe("delivery body check", () => {
  it("accepts a complete valid body", () => {
    expect(inspectDeliveryBody(body())).toEqual({ ok: true, complete: true });
  });

  it("reports the finalization reason for rejected acceptance content", () => {
    for (const acceptance of ["- Jobs are listed as `Develop / <job>` after the rename.", "- See https://example.test for the expected behavior.", "- Ask @maintainer to confirm the observable behavior."]) {
      expect(inspectDeliveryBody(body({ acceptance }))).toEqual({ ok: false, complete: true, reason: "draft-acceptance-checklist-item" });
    }
  });

  it("leaves an unfinished body alone unless the final form is requested", () => {
    const unfinished = body({ first: " ", acceptance: "" });
    expect(inspectDeliveryBody(unfinished)).toEqual({ ok: true, complete: false });
    expect(inspectDeliveryBody(unfinished, { final: true })).toEqual({ ok: false, complete: false, reason: "draft-acceptance-layout-sections" });
    expect(inspectDeliveryBody(body({ acceptance: "" }))).toMatchObject({ ok: false, reason: expect.stringMatching(/^draft-acceptance-/) });
  });

  it("validates the final form before the last item is checked", () => {
    expect(inspectDeliveryBody(body({ first: " " }), { final: true })).toEqual({ ok: true, complete: false });
    expect(inspectDeliveryBody(body({ first: " ", acceptance: "- [ ] Using the example preserves the updated behavior." }), { final: true }))
      .toEqual({ ok: false, complete: false, reason: "draft-acceptance-checklist-item" });
  });

  it("rejects bodies without a version-3 association", () => {
    expect(inspectDeliveryBody("## Proposal\n\nNo automation.\n")).toEqual({ ok: false, complete: false, reason: "draft-unassociated" });
  });

  it("reads a body file or a pull request body", async () => {
    const root = await mkdtemp(join(tmpdir(), "a1-delivery-body-"));
    try {
      await writeFile(join(root, "body.md"), body({ acceptance: "- Rows render as <job> placeholders in the list." }));
      await expect(main(["--body-file", join(root, "body.md")])).resolves.toMatchObject({ ok: false, reason: "draft-acceptance-checklist-item" });
      await expect(main(["--pr", "773"], { readPullBody: async number => { expect(number).toBe("773"); return body(); } }))
        .resolves.toEqual({ ok: true, complete: true });
      await expect(main([])).rejects.toThrow("exactly one");
    } finally { await rm(root, { recursive: true, force: true }); }
  });
});
