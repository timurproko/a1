import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { APPROVED_DELIVERY_HASHES } from "./delivery-contract.mjs";

const bytes = readFileSync(new URL("../../docs/delivery-adapters.json", import.meta.url));
if (createHash("sha256").update(bytes).digest("hex") !== APPROVED_DELIVERY_HASHES["delivery-adapters.json"]) throw new Error("delivery-adapter-drift");
const adapters = JSON.parse(bytes);
export const DELIVERY_HOLD_LABEL = adapters.shared.holdLabel;
export const DOCUMENTATION_OPT_OUT_LABEL = adapters.shared.documentationOptOutLabel;
export const DELIVERY_ADAPTER = Object.freeze(adapters.repositories.a1);

/** Mutation callers use a fresh REST snapshot; unavailable label state never silently means unheld. */
export function deliveryMutationBlocker(pull, { documentation = false } = {}) {
  if (!Array.isArray(pull?.labels)) return "delivery-labels-unverifiable";
  const names = pull.labels.map(label => typeof label === "string" ? label : label?.name);
  if (names.some(name => typeof name !== "string" || !name)) return "delivery-labels-unverifiable";
  if (names.includes(DELIVERY_HOLD_LABEL)) return "delivery-hold";
  if (documentation && names.includes(DOCUMENTATION_OPT_OUT_LABEL)) return "no-auto-merge";
  return null;
}

/** One final read owns the mutation gate; refusal performs no callback and carries no deferred action. */
export async function guardedDeliveryMutation({ read, expected, repository, mutate, documentation = false }) {
  const current = await read();
  const blocker = deliveryMutationBlocker(current, { documentation });
  if (blocker) return { performed: false, reason: blocker, current };
  if (!sameDeliverySnapshot(current, expected, repository, { documentation })) return { performed: false, reason: "delivery-snapshot-changed" };
  return { performed: true, value: await mutate(current) };
}

/** Match every candidate component and its hold immediately before a controller mutation. */
export function sameDeliverySnapshot(current, expected, repository, { head = expected?.head?.sha, documentation = false } = {}) {
  return deliveryMutationBlocker(current, { documentation }) === null
    && current?.number === expected?.number && current?.node_id === expected?.node_id
    && current?.state === "open" && current?.draft === expected?.draft
    && current?.body === expected?.body
    && current?.base?.ref === expected?.base?.ref && current?.base?.sha === expected?.base?.sha
    && current?.base?.repo?.full_name === repository
    && current?.head?.ref === expected?.head?.ref && current?.head?.sha === head
    && current?.head?.repo?.full_name === repository;
}
