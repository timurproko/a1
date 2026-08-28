import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

const rootPath = "src/integrations/pi/session-ui/session-shell-root.ts";
const controllerPath = "src/integrations/pi/session-ui/session-viewport-controller.ts";

/** Structural guard for the behavior-preserving shell decomposition. */
describe("Pi session UI responsibility boundaries", () => {
  it("keeps stateful viewport input policy out of the shell render root", async () => {
    const [root, controller] = await Promise.all([
      readFile(rootPath, "utf8"),
      readFile(controllerPath, "utf8"),
    ]);

    for (const owner of [
      "#dragGrabOffset",
      "#dockPointerSuppressed",
      "#selectionAutoScrollTimer",
      "#selectionAutoScrollPointer",
      "#activityTimer",
      "routeMouseInput(",
      "scrollForTrackPage(",
      "scrollForThumbRow(",
    ]) {
      expect(root, `${owner} returned to ${rootPath}`).not.toContain(owner);
      expect(controller, `${owner} is absent from ${controllerPath}`).toContain(owner);
    }
    expect(root).toContain("new SessionViewportController(");
    expect(root).toContain("this.#viewportController.compose({");
  });

  it("declares app routes in the neutral app owner and only re-exports them from Pi", async () => {
    const [appContracts, compatibility] = await Promise.all([
      readFile("src/ui/apps/contracts.ts", "utf8"),
      readFile("src/integrations/pi/session-ui/route-host.ts", "utf8"),
    ]);
    expect(appContracts).toContain("export interface UiRouteHost");
    expect(appContracts).toContain("export interface UiRouteSurface");
    expect(compatibility).toContain("export type { UiRouteHost, UiRouteSurface }");
    expect(compatibility).not.toContain("export interface UiRouteHost");
  });
});
