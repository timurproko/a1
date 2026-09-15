import type { IntegrationImpactOwner } from "./integration-impact.mjs";
/** Loads the one reviewed registry and checks every declared path in the checkout. */
export function loadIntegrationOwners(repository?: string): Promise<IntegrationImpactOwner[]>;
