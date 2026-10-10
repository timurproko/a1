import { beforeAll, describe, expect, it } from "vitest";
import { ensurePiTheme } from "../../../../src/integrations/pi/components/theme.js";
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

  it("ports the Earendil announcement without package-private optional imagery", () => {
    const frame = new EarendilAnnouncementComponent().render(80).join("\n");
    expect(frame).toContain("pi has joined Earendil");
    expect(frame).toContain("https://mariozechner.at/posts/2026-04-08-ive-sold-out/");
  });
});
