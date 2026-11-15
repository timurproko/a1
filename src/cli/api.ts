import { ApplicationSettings } from "../app/settings/index.js";
import { executeIntegrationRequest, assertIntegrationResponse, integrationFailure, integrationResponse, INTEGRATION_LIMIT } from "../features/integration-api/index.js";
import { resolveLaunchProfilePaths } from "../features/launch/index.js";
import { requestSessionControl, resolveProductPaths } from "../foundation/lifecycle/index.js";

interface ApiCommandOptions {
  readonly environment?: NodeJS.ProcessEnv;
  readonly stdout?: (message: string) => void;
}

/** Public process boundary: one JSON argument and one bounded correlated LF-terminated response. */
export async function runApiCommand(arguments_: readonly string[], options: ApiCommandOptions = {}): Promise<number> {
  const stdout = options.stdout ?? (message => process.stdout.write(message));
  const environment = options.environment ?? process.env;
  let input: unknown;
  let response;
  try {
    if (arguments_.length !== 1 || Buffer.byteLength(arguments_[0] ?? "") > 4096) throw integrationFailure("invalid-request", "Use a1 api followed by one bounded JSON request argument.");
    try { input = JSON.parse(arguments_[0]!); } catch { throw integrationFailure("invalid-request", "Request is not valid JSON."); }
    response = await executeIntegrationRequest(input, {
      profile: () => new ApplicationSettings({ profileDir: resolveLaunchProfilePaths({ environment }).agentProfile, profileId: "a1" }),
      session: async request => {
        if (request.target?.scope !== "session") throw integrationFailure("invalid-target", "Expected a session target.");
        const result = await requestSessionControl({ runtimeDir: resolveProductPaths(environment).runtimeDir,
          sessionId: request.target.sessionId, runtimeId: request.target.runtimeId, payload: request });
        assertIntegrationResponse(result, request);
        return result;
      },
    });
    if (Buffer.byteLength(JSON.stringify(response)) > INTEGRATION_LIMIT) throw integrationFailure("response-limit", "Integration response exceeds its limit.");
  } catch (error) { response = integrationResponse(input, undefined, error); }
  stdout(`${JSON.stringify(response)}\n`);
  return response.success ? 0 : 1;
}
