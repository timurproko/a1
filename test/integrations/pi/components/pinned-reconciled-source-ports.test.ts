import { beforeAll, describe, expect, it } from "vitest";
import { ensurePiTheme, getPiMarkdownTheme } from "../../../../src/integrations/pi/components/theme.js";
import { SkillInvocationMessageComponent } from "../../../../src/integrations/pi/components/upstream/components/skill-invocation-message.js";
import { stripTerminalSequences } from "@earendil-works/pi-tui";
import { createPiShellTranscriptComponent } from "../../../../src/integrations/pi/components/index.js";
import { EarendilAnnouncementComponent } from "../../../../src/integrations/pi/components/upstream/components/earendil-announcement.js";
import { createMermaidMarkdownTransformer } from "../../../../src/integrations/pi/components/upstream/components/mermaid.js";

beforeAll(() => { ensurePiTheme(); });

describe("reconciled pinned source ports", () => {
  it("preserves Mermaid mode, streaming, thinking, and width guards", () => {
    let mode: "off" | "final" | "streaming" = "off";
    const transform = createMermaidMarkdownTransformer({ getMode: () => mode, theme: ensurePiTheme() });
    const source = "```mermaid\nflowchart LR\nA --> B\n```\n";
    expect(transform(source, { messageType: "assistant", isStreaming: false, availableWidth: 80 })).toBe(source);
    mode = "final";
    expect(transform(source, { messageType: "assistant-thinking", isStreaming: false, availableWidth: 80 })).toBe(source);
    expect(transform(source, { messageType: "assistant", isStreaming: true, availableWidth: 80 })).toBe(source);
    expect(transform(source, { messageType: "assistant", isStreaming: false, availableWidth: 1 })).toBe(source);
    expect(transform(source, { messageType: "assistant", isStreaming: false, availableWidth: 80 })).not.toContain("```mermaid");
  });

  it("renders pie charts in summaries but leaves custom and thinking surfaces unchanged", () => {
    const transform = createMermaidMarkdownTransformer({ getMode: () => "final", theme: ensurePiTheme() });
    const source = '```mermaid\npie title Work\n"Done" : 75\n"Remaining" : 25\n```\n';
    const summary = transform(source, { messageType: "summary", isStreaming: false, availableWidth: 120 });
    expect(summary).not.toContain("```mermaid");
    expect(summary).toContain("Done");
    const component = createPiShellTranscriptComponent({
      id: "summary-1", revision: 1, kind: "compaction", text: source, status: "finalized", title: "Summary", payload: {},
    }, process.cwd(), undefined, undefined, 1, false, "final");
    component.setExpanded(true);
    const frame = stripTerminalSequences(component.render(120).join("\n"));
    expect(frame).toContain("Done");
    expect(frame).not.toContain("```mermaid");
    component.dispose?.();
    for (const messageType of ["custom", "assistant-thinking"] as const) {
      expect(transform(source, { messageType, isStreaming: false, availableWidth: 120 })).toBe(source);
    }
  });

  it("chains skill content transformers without transforming the header or losing content on errors", () => {
    const seen: string[] = [];
    const skill = new SkillInvocationMessageComponent({ name: "skill-title", content: "original-body" }, getPiMarkdownTheme(), 1, [
      markdown => { seen.push(markdown); throw new Error("extension failure"); },
      (markdown, context) => {
        expect(context).toMatchObject({ messageType: "custom", isStreaming: false, messageId: "skill-1", timestamp: "2026-11-10" });
        return markdown.replace("original-body", "transformed-body");
      },
    ], "skill-1", "2026-11-10");
    skill.setExpanded(true);
    const frame = stripTerminalSequences(skill.render(80).join("\n"));
    expect(seen).toEqual(["original-body"]);
    expect(frame).toContain("skill-title");
    expect(frame).toContain("transformed-body");
    expect(frame).not.toContain("original-body");
  });

  it("ports the Earendil announcement without package-private optional imagery", () => {
    const frame = new EarendilAnnouncementComponent().render(80).join("\n");
    expect(frame).toContain("pi has joined Earendil");
    expect(frame).toContain("https://mariozechner.at/posts/2026-04-08-ive-sold-out/");
  });
});
