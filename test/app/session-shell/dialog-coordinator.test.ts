import { afterEach, describe, expect, it, vi } from "vitest";
import type { OwnedUiDialog } from "../../../src/contracts/owned-ui/index.js";
import type { UiRouteHost } from "../../../src/ui/apps/contracts.js";

const created = vi.hoisted(() => [] as { kind: string; onSelect: (value?: string) => void; onCancel: () => void }[]);
vi.mock("../../../src/integrations/pi/components/shell-selectors-dialogs.js", () => ({
  createPiShellSelector: (options: { onSelect: (id: string) => void; onCancel: () => void }) => {
    const component = { kind: "selector", onSelect: options.onSelect, onCancel: options.onCancel };
    created.push(component as never);
    return component;
  },
  createPiShellDialog: (_dialog: unknown, options: { onSelect: () => void; onCancel: () => void }) => {
    const component = { kind: "dialog", onSelect: options.onSelect, onCancel: options.onCancel };
    created.push(component);
    return component;
  },
}));

const { SessionDialogCoordinator } = await import("../../../src/app/session-shell/dialog-coordinator.js");

afterEach(() => {
  created.length = 0;
  vi.useRealTimers();
});

function harness(overrides: { routeHost?: UiRouteHost | null; startupRoute?: { route: string; onClosed?: () => void } } = {}) {
  const hidden: string[] = [];
  const routes: { id: string; closed: (rendered: boolean) => void; exit: () => void }[] = [];
  let overlay = false;
  let defaultSurface = true;
  const terminal = {
    running: true,
    hasOverlay: () => overlay,
    showOverlay: vi.fn((component: { kind: string }) => ({ hide: () => hidden.push(component.kind) })),
    openRoute: vi.fn((surface: { id: string }, callbacks: { closed(rendered: boolean): void; exit(): void }) => {
      routes.push({ id: surface.id, ...callbacks });
      return { hide: () => hidden.push(`route:${surface.id}`) };
    }),
    requestRender: vi.fn(),
  };
  const root = { dismissNotice: vi.fn(), setInputSurface: vi.fn(), usesDefaultInputSurface: () => defaultSurface };
  const routeHost = overrides.routeHost === undefined
    ? { open: (route: string) => ({ id: `${route}-surface` }), claims: (name: string) => name === "settings" } as unknown as UiRouteHost
    : overrides.routeHost;
  const exit = vi.fn();
  const routeClosed = vi.fn();
  const coordinator = new SessionDialogCoordinator({
    terminal: terminal as never,
    root: root as never,
    routeHost,
    disposed: () => false,
    exit,
    routeClosed,
    ...(overrides.startupRoute === undefined ? {} : { startupRoute: overrides.startupRoute }),
  });
  return {
    coordinator, terminal, root, hidden, routes, exit, routeClosed,
    setOverlay: (value: boolean) => { overlay = value; },
    setDefaultSurface: (value: boolean) => { defaultSurface = value; },
  };
}

const dialog = (id: string): OwnedUiDialog => ({ id, title: id } as unknown as OwnedUiDialog);

describe("SessionDialogCoordinator", () => {
  it("opens a route, hides the previous dialog, and reports a rendered close once", () => {
    const { coordinator, root, hidden, routes, routeClosed, exit } = harness();
    coordinator.showSelector("Pick", [], () => {});
    const onClosed = vi.fn();
    expect(coordinator.openRoute("settings", undefined, onClosed)).toEqual({ outcome: "completed", diagnostic: null });
    expect(root.dismissNotice).toHaveBeenCalledOnce();
    expect(hidden).toEqual(["selector"]);
    routes[0]!.exit();
    expect(exit).toHaveBeenCalledOnce();
    routes[0]!.closed(true);
    expect(onClosed).toHaveBeenCalledOnce();
    expect(routeClosed).toHaveBeenCalledWith("settings");
    coordinator.onSessionReplaced();
    expect(hidden).toEqual(["selector"]);
  });

  it("fails an unavailable route without touching the current dialog", () => {
    const { coordinator, hidden } = harness({ routeHost: null });
    coordinator.showSelector("Pick", [], () => {});
    expect(coordinator.openRoute("settings")).toEqual({ outcome: "failed", diagnostic: "route is unavailable: settings" });
    expect(coordinator.claimsRoute("settings")).toBe(false);
    expect(hidden).toEqual([]);
  });

  it("runs a local selector choice and clears its state so a later replacement hides nothing", () => {
    const { coordinator, hidden } = harness();
    const selected = vi.fn();
    coordinator.showSelector("Pick", [], selected);
    created[0]!.onSelect("one");
    expect(selected).toHaveBeenCalledWith("one");
    expect(hidden).toEqual(["selector"]);
    coordinator.onSessionReplaced();
    expect(hidden).toEqual(["selector"]);
  });

  it("mirrors backend dialogs by id and leaves local routes open when the backend has none", () => {
    const { coordinator, terminal, hidden } = harness();
    coordinator.syncBackend(dialog("a"));
    coordinator.syncBackend(dialog("a"));
    expect(terminal.showOverlay).toHaveBeenCalledOnce();
    coordinator.syncBackend(dialog("b"));
    expect(hidden).toEqual(["dialog"]);
    coordinator.syncBackend(null);
    expect(hidden).toEqual(["dialog", "dialog"]);
    coordinator.openRoute("settings");
    coordinator.syncBackend(null);
    expect(hidden).toEqual(["dialog", "dialog"]);
  });

  it("waits for a clear screen before presenting the startup route, and keeps the latest retained route", () => {
    vi.useFakeTimers();
    const { coordinator, terminal, setOverlay, setDefaultSurface } = harness({ startupRoute: { route: "changelog" } });
    coordinator.retainStartupRoute("settings");
    setOverlay(true);
    coordinator.presentStartupRoute();
    expect(terminal.openRoute).not.toHaveBeenCalled();
    setOverlay(false);
    setDefaultSurface(false);
    vi.advanceTimersByTime(25);
    expect(terminal.openRoute).not.toHaveBeenCalled();
    setDefaultSurface(true);
    vi.advanceTimersByTime(25);
    expect(terminal.openRoute).toHaveBeenCalledOnce();
    expect(terminal.openRoute.mock.calls[0]![0]).toEqual({ id: "settings-surface" });
    coordinator.presentStartupRoute();
    expect(terminal.openRoute).toHaveBeenCalledOnce();
  });

  it("stops a pending startup retry and hides the dialog on dispose", () => {
    vi.useFakeTimers();
    const { coordinator, terminal, hidden, setOverlay } = harness({ startupRoute: { route: "changelog" } });
    coordinator.syncBackend(dialog("a"));
    setOverlay(true);
    coordinator.presentStartupRoute();
    coordinator.dispose();
    setOverlay(false);
    vi.advanceTimersByTime(100);
    expect(terminal.openRoute).not.toHaveBeenCalled();
    expect(hidden).toEqual(["dialog"]);
  });

  it("closes a dock replacement surface with one shared action", () => {
    const { coordinator, root, terminal } = harness();
    const close = coordinator.closeInputSurface;
    close();
    expect(root.setInputSurface).toHaveBeenCalledWith(null);
    expect(terminal.requestRender).toHaveBeenCalledOnce();
  });
});
