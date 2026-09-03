import rawIdentity from "./product-identity.json" with { type: "json" };

const ENVIRONMENT_KEYS = [
  "certificationTarball",
  "configDir",
  "dataDir",
  "databasePath",
  "developmentInstanceId",
  "developmentRoot",
  "endpoint",
  "fixture",
  "fixtureInput",
  "fixtureToken",
  "inputAcknowledgement",
  "immutableWarmup",
  "internalPackaging",
  "launchProfile",
  "nativePi",
  "paneId",
  "piParityIntentionalMutation",
  "piPortRoot",
  "piSourceLedgerPath",
  "piSourceScanRoot",
  "probeTrace",
  "processGuardianPath",
  "profileHome",
  "protocolVersion",
  "releaseDigest",
  "releaseId",
  "releaseLayers",
  "releaseRoot",
  "releaseRunnerLabel",
  "runtimeDir",
  "structuredFlowLimits",
  "startupTrace",
  "terminalArgumentsJson",
  "terminalExecutable",
  "terminalSessionId",
] as const;
const FILESYSTEM_KEYS = ["slug", "windowsDirectory", "unixDirectory", "temporaryPrefix"] as const;
const STATE_KEYS = ["windowsControlDirectory", "unixControlDirectory", "developmentDirectory", "piAgentProfile", "piVanillaProfile"] as const;
const ENDPOINT_KEYS = ["windowsPipeStem", "unixSocketFilename", "metadataFilename", "supervisorLogFilename", "databaseFilename"] as const;
const MANIFEST_KEYS = ["releaseFilename", "packageFilename"] as const;
const PROTOCOL_KEYS = ["namespace", "controlEnvelope", "supervisorSchema", "nativeHostSchema", "structuredAgentSchema", "controlStoreSchema", "releaseCohortSchema", "updateJournalSchema"] as const;
const EVIDENCE_KEYS = ["nativeSpikeSchema", "terminalProvenanceSchema", "terminalProofSchema", "stableReleaseSchema", "previewReleaseSchema", "releaseCertificationSchema", "previewPlatformVerdictSchema", "piSourceLedgerSchema", "piComponentParitySchema", "piEventFrameParitySchema", "startupTraceSchema", "dependencyLayerSchema", "dependencyLayerCertificationSchema", "runtimePayloadSchema"] as const;
const ARTIFACT_KEYS = ["cliEntry", "supervisorEntry", "guardianEntry", "uiEntry", "nativeExecutable", "nativeCrate", "processGuardianExecutable", "releaseTarballStem", "diagnosticStem"] as const;
const ROOT_KEYS = ["schema", "displayName", "commandName", "packageName", "filesystem", "environment", "state", "endpoint", "manifest", "protocol", "evidence", "artifacts"] as const;

type StringRecord<Keys extends readonly string[]> = { readonly [Key in Keys[number]]: string };

export interface ProductIdentity {
  readonly schema: string;
  readonly displayName: string;
  readonly commandName: string;
  readonly packageName: string;
  readonly filesystem: StringRecord<typeof FILESYSTEM_KEYS>;
  readonly environment: StringRecord<typeof ENVIRONMENT_KEYS>;
  readonly state: StringRecord<typeof STATE_KEYS>;
  readonly endpoint: StringRecord<typeof ENDPOINT_KEYS>;
  readonly manifest: StringRecord<typeof MANIFEST_KEYS>;
  readonly protocol: StringRecord<typeof PROTOCOL_KEYS>;
  readonly evidence: StringRecord<typeof EVIDENCE_KEYS>;
  readonly artifacts: StringRecord<typeof ARTIFACT_KEYS>;
}

export function validateProductIdentity(value: unknown): ProductIdentity {
  const root = exactObject(value, ROOT_KEYS, "product identity");
  const schema = stringValue(root.schema, "product identity schema");
  const displayName = stringValue(root.displayName, "product display name");
  const commandName = stringValue(root.commandName, "product command name");
  const packageName = stringValue(root.packageName, "product package name");
  const filesystem = stringObject(root.filesystem, FILESYSTEM_KEYS, "filesystem identity");
  const environment = stringObject(root.environment, ENVIRONMENT_KEYS, "environment identity");
  const state = stringObject(root.state, STATE_KEYS, "state identity");
  const endpoint = stringObject(root.endpoint, ENDPOINT_KEYS, "endpoint identity");
  const manifest = stringObject(root.manifest, MANIFEST_KEYS, "manifest identity");
  const protocol = stringObject(root.protocol, PROTOCOL_KEYS, "protocol identity");
  const evidence = stringObject(root.evidence, EVIDENCE_KEYS, "evidence identity");
  const artifacts = stringObject(root.artifacts, ARTIFACT_KEYS, "artifact identity");

  if (!/^[a-z][a-z0-9-]*$/.test(commandName)) throw new TypeError("product command name must be a lowercase command slug");
  if (!/^@[a-z0-9-]+\/[a-z0-9-]+$/.test(packageName)) throw new TypeError("product package name must be a lowercase scoped npm package");
  if (displayName.trim() !== displayName || displayName.length === 0) throw new TypeError("product display name must be non-empty without surrounding whitespace");
  if (schema !== `${commandName}-product-identity-v1`) throw new TypeError("product identity schema must derive from the command name");
  if (filesystem.slug !== commandName || filesystem.unixDirectory !== filesystem.slug || filesystem.windowsDirectory !== filesystem.slug) {
    throw new TypeError("product filesystem identity must derive from the command name");
  }
  if (filesystem.temporaryPrefix !== `${filesystem.slug}-`) throw new TypeError("product temporary prefix must derive from the filesystem slug");
  if (state.windowsControlDirectory !== filesystem.windowsDirectory || state.unixControlDirectory !== filesystem.unixDirectory) {
    throw new TypeError("product state directories must match the filesystem identity");
  }
  if (endpoint.windowsPipeStem !== filesystem.slug) throw new TypeError("product endpoint stem must match the filesystem slug");
  if (protocol.namespace !== commandName) throw new TypeError("product protocol namespace must match the command name");
  if (artifacts.diagnosticStem !== filesystem.slug) throw new TypeError("product diagnostic stem must match the filesystem slug");

  const environmentPrefix = `${commandName.toUpperCase()}_`;
  const environmentValues = Object.values(environment);
  if (new Set(environmentValues).size !== environmentValues.length) throw new TypeError("product environment keys must be unique");
  for (const key of environmentValues) {
    if (!key.startsWith(environmentPrefix) || !/^[A-Z][A-Z0-9_]+$/.test(key)) {
      throw new TypeError(`product environment key must use ${environmentPrefix}: ${key}`);
    }
  }
  for (const [name, identifier] of Object.entries(protocol)) {
    if (name !== "namespace" && !identifier.startsWith(`${protocol.namespace}-`)) {
      throw new TypeError(`product protocol identifier must use ${protocol.namespace}: ${identifier}`);
    }
  }
  for (const identifier of Object.values(evidence)) {
    if (!identifier.startsWith(`${protocol.namespace}-`)) throw new TypeError(`product evidence identifier must use ${protocol.namespace}: ${identifier}`);
  }

  return deepFreeze({
    schema,
    displayName,
    commandName,
    packageName,
    filesystem,
    environment,
    state,
    endpoint,
    manifest,
    protocol,
    evidence,
    artifacts,
  });
}

export interface ProductIdentityText {
  readonly displayName: string;
  readonly commandName: string;
  readonly packageName: string;
  readonly diagnostic: (message: string) => string;
  readonly usage: (forms: readonly string[]) => string;
}

export function createProductIdentityText(
  identity: Pick<ProductIdentity, "displayName" | "commandName" | "packageName">,
): ProductIdentityText {
  return Object.freeze({
    displayName: identity.displayName,
    commandName: identity.commandName,
    packageName: identity.packageName,
    diagnostic: (message: string) => `${identity.displayName} ${message}`,
    usage: (forms: readonly string[]) => `Usage: ${forms.map(form => `${identity.commandName}${form ? ` ${form}` : ""}`).join(" | ")}`,
  });
}

export const PRODUCT_IDENTITY: ProductIdentity = validateProductIdentity(rawIdentity);
export const PRODUCT_TEXT: ProductIdentityText = createProductIdentityText(PRODUCT_IDENTITY);

function exactObject<const Keys extends readonly string[]>(value: unknown, keys: Keys, name: string): Record<Keys[number], unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) throw new TypeError(`${name} must be an object`);
  const actualKeys = Object.keys(value).sort();
  const expectedKeys = [...keys].sort();
  if (actualKeys.length !== expectedKeys.length || actualKeys.some((key, index) => key !== expectedKeys[index])) {
    throw new TypeError(`${name} must contain exactly: ${expectedKeys.join(", ")}`);
  }
  return value as Record<Keys[number], unknown>;
}

function stringObject<const Keys extends readonly string[]>(value: unknown, keys: Keys, name: string): StringRecord<Keys> {
  const object = exactObject(value, keys, name);
  return Object.fromEntries(keys.map((key: Keys[number]) => [key, stringValue(object[key], `${name}.${key}`)])) as StringRecord<Keys>;
}

function stringValue(value: unknown, name: string): string {
  if (typeof value !== "string" || value.length === 0) throw new TypeError(`${name} must be a non-empty string`);
  return value;
}

function deepFreeze<T>(value: T): T {
  if (typeof value !== "object" || value === null || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}
