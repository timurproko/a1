import { readFile, readdir } from "node:fs/promises";
import { describe, expect, it } from "vitest";

const rootPath = "src/app/session-shell/session-shell-root.ts";
const controllerPath = "src/app/session-shell/session-viewport-controller.ts";

/** Structural guard for the behavior-preserving shell decomposition. */
describe("session shell responsibility boundaries", () => {
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

  it("declares app routes in the neutral app owner and nowhere in the Pi shell", async () => {
    const appContracts = await readFile("src/ui/apps/contracts.ts", "utf8");
    expect(appContracts).toContain("export interface UiRouteHost");
    expect(appContracts).toContain("export interface UiRouteSurface");
    const shellFiles = (await readdir("src/app/session-shell")).filter(name => name.endsWith(".ts"));
    for (const name of shellFiles) {
      const source = await readFile(`src/app/session-shell/${name}`, "utf8");
      expect(source, name).not.toMatch(/export (?:interface|type) UiRoute(?:Host|Surface)\b/);
      expect(source, name).not.toMatch(/export type \{[^}]*UiRoute(?:Host|Surface)/);
    }
  });
});
