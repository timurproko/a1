import type { TUI } from "@earendil-works/pi-tui";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { ensurePiTheme } from "../../../../src/integrations/pi/components/theme.js";
import { DaxnutsComponent } from "../../../../src/integrations/pi/components/upstream/components/daxnuts.js";
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

  it("ports animated Daxnuts rendering and disposal without global renderer mutation", () => {
    vi.useFakeTimers();
    const requestRender = vi.fn();
    const component = new DaxnutsComponent({ requestRender } as unknown as TUI);
    expect(component.render(80)).toHaveLength(25);
    vi.advanceTimersByTime(160);
    expect(requestRender).toHaveBeenCalledTimes(2);
    component.dispose();
    vi.advanceTimersByTime(160);
    expect(requestRender).toHaveBeenCalledTimes(2);
    vi.useRealTimers();
  });

  it("ports the Earendil announcement without package-private optional imagery", () => {
    const frame = new EarendilAnnouncementComponent().render(80).join("\n");
    expect(frame).toContain("pi has joined Earendil");
    expect(frame).toContain("https://mariozechner.at/posts/2026-04-08-ive-sold-out/");
  });
});
