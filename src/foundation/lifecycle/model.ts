import { PRODUCT_TEXT } from "../../product-identity.js";

export type LaunchProfileId = "a1" | "pi";

/** A process as session coordination records it: a pid plus the identity its writer observed. */
export interface ProcessIdentity {
  readonly pid: number;
  readonly startIdentity: string;
}

export function assertLaunchProfileId(value: unknown): asserts value is LaunchProfileId {
  if (value !== "a1" && value !== "pi") throw new TypeError(PRODUCT_TEXT.diagnostic(`launch profile is invalid: ${String(value)}`));
}
