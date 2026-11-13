import { inspectDeliveryBody } from "./check-delivery-body.mjs";

/** Report written/published completion separately from observed checks; inspection performs no readiness or integration mutation. */
export function describeImplementationProgress(body, { published = false, ci = "not-inspected", humanObservation = "not-observed" } = {}) {
  if (!["not-inspected", "pending", "success", "failure"].includes(ci)
    || !["not-observed", "passed", "failed"].includes(humanObservation)) throw new Error("delivery-progress-observation");
  const inspected = inspectDeliveryBody(body);
  return { bodyValid: inspected.ok, locallyComplete: inspected.ok && inspected.complete,
    publishedComplete: published && inspected.ok && inspected.complete, ci, humanObservation,
    ...(inspected.ok ? {} : { reason: inspected.reason }) };
}
