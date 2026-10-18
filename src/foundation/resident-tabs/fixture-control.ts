import { existsSync } from "node:fs";
import { join } from "node:path";
import { PRODUCT_IDENTITY } from "../../product-identity.js";
import { residentProgressObserver } from "./progress-observation.js";

export type ResidentFixtureStoppedStage = "child-render-write";

export interface ResidentFixtureControlPort {
  stopped(stage: ResidentFixtureStoppedStage): boolean;
  fragmentChildWrite(data: string): readonly string[];
}

/** Returns the exact-artifact fixture control, or null for every ordinary resident child. */
export function residentFixtureControl(
  environment: NodeJS.ProcessEnv = process.env,
): ResidentFixtureControlPort | null {
  const directory = environment[PRODUCT_IDENTITY.environment.residentFixtureControlDir];
  if (environment === process.env) delete process.env[PRODUCT_IDENTITY.environment.residentFixtureControlDir];
  // Invariant: the launch context erases the bridge tab identity before UI composition, so the fixture
  // binds to the observed run identity, which the observer captures once per process in any call order.
  const tabId = residentProgressObserver(environment)?.tabId;
  if (!directory || !tabId || !/^[a-z0-9-]{1,128}$/iu.test(tabId)) return null;
  return {
    stopped: stage => existsSync(join(directory, `${tabId}.${stage}.stop`)),
    fragmentChildWrite: data => existsSync(join(directory, `${tabId}.child-render-fragments.enable`))
      ? boundedFragments(data)
      : [data],
  };
}

function boundedFragments(data: string): readonly string[] {
  const points = [...data];
  if (points.length <= 1) return [data];
  if (points.length <= 16) return points;
  const fragments = points.slice(0, 8);
  const middle = points.slice(8, -8);
  const chunkSize = Math.max(1, Math.ceil(middle.length / 48));
  for (let index = 0; index < middle.length; index += chunkSize) {
    fragments.push(middle.slice(index, index + chunkSize).join(""));
  }
  fragments.push(...points.slice(-8));
  return fragments;
}
