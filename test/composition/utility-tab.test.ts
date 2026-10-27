import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { composeUtilityTab } from "../../src/composition/utility-tab.js";
import { OwnedSettingsManager } from "../../src/ui/settings/manager.js";
import type { UiRouteHost, UiRouteSurface } from "../../src/ui/apps/contracts.js";
import { TestPresentationTerminal } from "../features/owned-ui/neutral-port-doubles.js";

const roots: string[] = [];
afterEach(async () => Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true }))));

type BridgeCommand = { type: string; route?: "settings" | "changelog"; deadlineMs?: number };

function bridge(tabId: string, replay?: BridgeCommand) {
  let command: ((value: BridgeCommand) => void) | undefined;
  return {
    tabId,
    available: true,
    start: vi.fn(async () => true),
    status: vi.fn(),
    accent: vi.fn(),
    shortcuts: vi.fn(),
    captureAttachment: vi.fn(() => ({ clientId: "client", controllerRevision: 1 })),
    requestAction: vi.fn(async () => true),
    requestClose: vi.fn(async () => true),
    requestDetach: vi.fn(async () => true),
    consumeControllerBoundaryInput: vi.fn((data: string) => data),
    onCommand: vi.fn((listener: typeof command) => {
      command = listener;
      if (replay !== undefined) listener?.(replay);
      return vi.fn();
    }),
    close: vi.fn(),
    command: (value: BridgeCommand) => command?.(value),
  };
}

async function settings(): Promise<OwnedSettingsManager> {
  const root = await mkdtemp(join(tmpdir(), "a1-utility-tab-"));
  roots.push(root);
  return new OwnedSettingsManager({ profileDir: root, profileId: "a1" });
}

describe("slim utility tab composition", () => {
  it.each([
    { route: "settings" as const, tabId: "settings-one", expected: "Settings" },
    { route: "changelog" as const, tabId: "changelog-one", expected: "1.2.3" },
  ])("presents the pinned $route route and reports bridge state", async ({ route, tabId, expected }) => {
    const terminal = new TestPresentationTerminal();
    const tabBridge = bridge(tabId, { type: "route", route });
    const composition = await composeUtilityTab({
      route,
      bridge: tabBridge as never,
      terminal,
      settings: await settings(),
      releaseNotes: {
        releases: [{ version: "1.2.3", markdown: "## [1.2.3] - 2026-10-27\n\nSlim utility tabs." }],
        completeMarkdown: "## [1.2.3] - 2026-10-27\n\nSlim utility tabs.",
        current: version => version === "1.2.3" ? { version, markdown: "Slim utility tabs." } : null,
      },
    });
    await composition.settings.load();
    composition.application.start();
    await vi.waitFor(() => expect(terminal.writes.join("")) .toContain(expected));
    expect(tabBridge.start).toHaveBeenCalledOnce();
    expect(tabBridge.status.mock.calls.map(call => call[0])).toEqual(["starting", "idle"]);
    expect(tabBridge.accent).toHaveBeenCalled();
    expect(tabBridge.shortcuts).toHaveBeenCalled();

    tabBridge.command({ type: "stop", deadlineMs: 1000 });
    await composition.application.waitUntilStopped();
    await composition.application.dispose();
    expect(tabBridge.close).toHaveBeenCalledOnce();
  });

  it("detaches and restores its pinned route, then closes the tab when the screen closes", async () => {
    const terminal = new TestPresentationTerminal();
    const tabBridge = bridge("settings-one");
    const surfaces: Array<UiRouteSurface & { requestExit(): void }> = [];
    const routeHost: UiRouteHost = {
      claims: route => route === "settings",
      open: route => {
        if (route !== "settings") return null;
        let closed = false;
        let exit = () => {};
        const surface: UiRouteSurface & { requestExit(): void } = {
          id: "settings",
          render: (_width, height) => Array.from({ length: height }, () => "settings"),
          handleInput: data => { if (data === "x") closed = true; return true; },
          handleMouse: () => true,
          isClosed: () => closed,
          close: () => { closed = true; },
          onRenderRequested: () => {},
          onExitRequested: listener => { exit = listener; },
          requestExit: () => exit(),
        };
        surfaces.push(surface);
        return surface;
      },
    };
    const composition = await composeUtilityTab({
      route: "settings",
      bridge: tabBridge as never,
      terminal,
      settings: await settings(),
      routeHost,
    });
    await composition.settings.load();
    composition.application.start();
    await vi.waitFor(() => expect(surfaces).toHaveLength(1));

    surfaces[0]!.requestExit();
    await vi.waitFor(() => expect(tabBridge.requestDetach).toHaveBeenCalledOnce());
    await vi.waitFor(() => expect(surfaces).toHaveLength(2));
    expect(tabBridge.requestClose).not.toHaveBeenCalled();

    terminal.input("x");
    await vi.waitFor(() => expect(tabBridge.requestClose).toHaveBeenCalledOnce());
    await composition.application.dispose();
  });
});
