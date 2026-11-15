export { INTEGRATION_VERSION, INTEGRATION_LIMIT, parseIntegrationRequest, integrationResponse, assertIntegrationResponse, integrationFailure } from "./protocol.js";
export type { IntegrationOperation, IntegrationRequest, IntegrationResponse, IntegrationTarget } from "./protocol.js";
export { executeIntegrationRequest, applyIntegrationSettings } from "./service.js";
export type { IntegrationServices } from "./service.js";
