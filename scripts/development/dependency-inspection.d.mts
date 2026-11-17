import type { DependencyObservation } from "./environment-prerequisites.mjs";
export function inspectDependencies(root: string, manifest: { dependencies?: Record<string, string>; devDependencies?: Record<string, string> }): DependencyObservation;
