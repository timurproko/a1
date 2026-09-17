// Rationale: drives the packed startup artifact through Pi's public ModelRuntime so the
// OAuth flows and the bedrock API that pi-ai loads lazily are evaluated exactly as a
// release would evaluate them on login, token refresh, and the first bedrock request.
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const packageRoot = process.argv[2];
const { ModelRuntime } = await import(pathToFileURL(resolve(packageRoot, "dist", "integrations", "pi", "startup-public.js")).href);
const credentials = new Map();
const store = {
  async read(providerId) { return credentials.get(providerId); },
  async list() { return [...credentials.keys()].map(providerId => ({ providerId, type: "oauth" })); },
  async modify(providerId, fn) {
    const next = await fn(credentials.get(providerId));
    if (next) credentials.set(providerId, next);
    return next;
  },
  async delete(providerId) { credentials.delete(providerId); },
};
const runtime = await ModelRuntime.create({ credentials: store, refreshOnCreate: false, modelsPath: null });

const oauth = {};
for (const provider of runtime.getProviders()) {
  if (!provider.auth?.oauth) continue;
  credentials.set(provider.id, { type: "oauth", access: `access-${provider.id}`, refresh: "refresh", expires: Date.now() + 3_600_000 });
  try {
    const result = await runtime.getAuth(provider.id);
    oauth[provider.id] = { source: result?.source, derived: Boolean(result?.auth?.apiKey ?? result?.auth?.headers) };
  } catch (error) {
    oauth[provider.id] = { error: String(error?.cause?.message ?? error?.message ?? error) };
  }
}

const bedrockModel = runtime.getModels("amazon-bedrock")[0];
const controller = new AbortController();
setTimeout(() => controller.abort(), 0);
const stream = runtime.stream(bedrockModel, { messages: [] }, {
  signal: controller.signal,
  apiKey: "probe",
  env: { AWS_REGION: "us-east-1", AWS_ACCESS_KEY_ID: "probe", AWS_SECRET_ACCESS_KEY: "probe" },
});
const events = [];
for await (const event of stream) events.push(event);
const failure = events.find(event => event.type === "error");
const bedrock = { api: bedrockModel?.api, events: events.map(event => event.type), error: failure?.error?.errorMessage };

process.stdout.write(`${JSON.stringify({ oauth, bedrock })}\n`);
