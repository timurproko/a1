import { mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { AgentSession } from "@earendil-works/pi-coding-agent";
import { describe, expect, it, onTestFinished, vi } from "vitest";
import { reserveUserExport } from "../../../../src/foundation/lifecycle/user-exports.js";
import { exportWorkflow } from "../../../../src/integrations/pi/engine/workflow-export.js";
import { resolveWorkflowHost } from "../../../../src/integrations/pi/engine/workflow-support.js";

async function fixture() {
  const home = await mkdtemp(join(tmpdir(), "a1-export-workflow-"));
  onTestFinished(() => rm(home, { recursive: true, force: true }));
  const html = vi.fn(async (path?: string) => { if (path) await writeFile(path, "<html>session</html>"); return path ?? "pinned.html"; });
  const jsonl = vi.fn(async (path?: string) => { if (path) await writeFile(path, "{\"type\":\"session\"}\n"); return path ?? "pinned.jsonl"; });
  const session = { sessionId: "session-1", exportToHtml: html, exportToJsonl: jsonl } as unknown as AgentSession;
  return { home, session, html, jsonl, reserve: (id: string, format: "html" | "jsonl") => reserveUserExport(id, format, home) };
}

describe("session export destinations", () => {
  it("fills partial storage services without losing prototype methods or their receiver", async () => {
    class Host {
      readonly #prefix = "custom:";
      copied = "";
      async copyText(text: string) { this.copied = this.#prefix + text; }
      async reserveExport(id: string, _format: "html" | "jsonl") { return { path: this.#prefix + id, failed: async () => {} }; }
    }
    const custom = new Host();
    const host = resolveWorkflowHost(custom);
    await host.copyText("text");
    expect(custom.copied).toBe("custom:text");
    expect((await host.reserveExport!("session", "html")).path).toBe("custom:session");
    expect(host.runCommand).toBeTypeOf("function");
    expect(host.readChangelog).toBeTypeOf("function");
  });

  it.each(["", "--html", "--jsonl"])("stores implicit %j exports in persistent user storage", async argument => {
    const { home, session, html, jsonl, reserve } = await fixture();
    const result = await exportWorkflow({ command: "export", argument }, session, true, reserve);
    const writer = argument === "--jsonl" ? jsonl : html;
    const path = writer.mock.calls[0]![0]!;
    expect(path.startsWith(join(home, ".a1", "exports"))).toBe(true);
    expect(await readFile(path, "utf8")).toContain("session");
    expect(result).toMatchObject({ outcome: "completed", message: `Session exported to: ${path}` });
    expect(await readdir(home)).toEqual([".a1"]);
  });

  it.each(["explicit.html", "explicit.jsonl", "explicit name.html"])("retains explicit destination %s", async filename => {
    const { home, session, html, jsonl, reserve } = await fixture();
    const path = join(home, filename);
    await exportWorkflow({ command: "export", argument: `"${path}"` }, session, true, reserve);
    expect((filename.endsWith(".jsonl") ? jsonl : html)).toHaveBeenCalledExactlyOnceWith(path);
    expect(await readdir(home)).toEqual([filename]);
  });

  it.each(["--html", "--jsonl"])("accepts %s with an explicit destination instead of treating the flag as a filename", async format => {
    const { home, session, html, jsonl, reserve } = await fixture();
    const path = join(home, "chosen-output");
    await exportWorkflow({ command: "export", argument: `${format} "${path}"` }, session, true, reserve);
    expect(format === "--jsonl" ? jsonl : html).toHaveBeenCalledExactlyOnceWith(path);
    expect(await readdir(home)).toEqual(["chosen-output"]);
  });

  it("fails safely if an implicit bare export has no product storage policy", async () => {
    const { home, session, html } = await fixture();
    await expect(exportWorkflow({ command: "export", argument: "" }, session, true)).rejects.toThrow("storage is unavailable");
    expect(html).not.toHaveBeenCalled();
    expect(await readdir(home)).toEqual([]);
  });

  it("retains explicit relative filenames and rejects malformed explicit destinations", async () => {
    const { home, session, html, reserve } = await fixture();
    html.mockImplementationOnce(async path => path!);
    await exportWorkflow({ command: "export", argument: "relative.html" }, session, true, reserve);
    expect(html).toHaveBeenCalledExactlyOnceWith("relative.html");
    await expect(exportWorkflow({ command: "export", argument: '--jsonl "unterminated' }, session, true, reserve)).rejects.toThrow("destination is invalid");
    expect(await readdir(home)).toEqual([]);
  });

  it("keeps comparison defaults unchanged", async () => {
    const { home, session, html } = await fixture();
    expect(await exportWorkflow({ command: "export", argument: "" }, session, false)).toMatchObject({ message: "Session exported to: pinned.html" });
    expect(html).toHaveBeenCalledExactlyOnceWith(undefined);
    expect(await readdir(home)).toEqual([]);
  });

  it("removes a failed default reservation without touching successful exports", async () => {
    const { home, session, html, reserve } = await fixture();
    await exportWorkflow({ command: "export", argument: "" }, session, true, reserve);
    const first = html.mock.calls[0]![0]!;
    html.mockRejectedValueOnce(new Error("disk full"));
    await expect(exportWorkflow({ command: "export", argument: "" }, session, true, reserve)).rejects.toThrow("disk full");
    expect(await readdir(join(home, ".a1", "exports"))).toHaveLength(1);
    expect(await readFile(first, "utf8")).toBe("<html>session</html>");
  });
});
