export { INTEGRATION_VERSION, INTEGRATION_LIMIT, EXIT_BLOCKERS, parseIntegrationRequest, integrationResponse, assertIntegrationResponse, integrationFailure } from "./protocol.js";
export type { ExitBlocker, IntegrationOperation, IntegrationRequest, IntegrationResponse, IntegrationTarget, SessionLifecycleSnapshot } from "./protocol.js";
export { executeIntegrationRequest, applyIntegrationSettings, applySessionLifecycle } from "./service.js";
export type { IntegrationServices, SessionLifecycleServices } from "./service.js";
export { applySessionName } from "./session-names.js";
