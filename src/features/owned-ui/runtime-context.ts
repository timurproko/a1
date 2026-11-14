import { randomUUID } from "node:crypto";
import type { HerdrBindingReservation } from "./herdr-binding.js";

export interface OwnedRuntimeContext {
  readonly runtimeId: string;
  readonly herdrBinding?: HerdrBindingReservation;
}

/** Capture once before extension loading; all product APIs borrow this identity. */
export function createOwnedRuntimeContext(runtimeId: string = randomUUID(), herdrBinding?: HerdrBindingReservation): OwnedRuntimeContext {
  return Object.freeze({ runtimeId, ...(herdrBinding === undefined ? {} : { herdrBinding }) });
}
