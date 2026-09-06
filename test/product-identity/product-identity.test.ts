import { describe, expect, it } from "vitest";
import { createProductIdentityText, PRODUCT_IDENTITY, validateProductIdentity } from "../../src/product-identity.js";

describe("product identity authority", () => {
  it("loads the exact A1 identity as a deeply immutable value", () => {
    expect(PRODUCT_IDENTITY).toMatchObject({
      schema: "a1-product-identity-v1",
      displayName: "A1",
      commandName: "a1",
      packageName: "@timurproko/a1", runtimePackageName: "@timurproko/a1-runtime",
      filesystem: { slug: "a1", windowsDirectory: "a1", unixDirectory: "a1" },
      environment: {
        configDir: "A1_CONFIG_DIR",
        dataDir: "A1_DATA_DIR",
        runtimeDir: "A1_RUNTIME_DIR",
        databasePath: "A1_DATABASE_PATH",
        endpoint: "A1_ENDPOINT",
      },
      state: {
        piAgentProfile: ".a1/agent",
        piVanillaProfile: ".pi/agent",
      },
      artifacts: { cliEntry: "bin/cli.js", nativeExecutable: "terminal-host" },
    });
    expect(allObjectsFrozen(PRODUCT_IDENTITY)).toBe(true);
    expect(() => { (PRODUCT_IDENTITY as { displayName: string }).displayName = "changed"; }).toThrow(TypeError);
  });

  it("formats diagnostics and command usage from an injected identity boundary", () => {
    const text = createProductIdentityText({ displayName: "Z1", commandName: "z1", packageName: "@example/z1" });

    expect(text.diagnostic("could not start")).toBe("Z1 could not start");
    expect(text.usage(["", "--version", "update --develop"])).toBe("Usage: z1 | z1 --version | z1 update --develop");
    expect(text).toMatchObject({ displayName: "Z1", commandName: "z1", packageName: "@example/z1" });
    expect(Object.isFrozen(text)).toBe(true);
  });

  it("validates and freezes an alternate coherent identity", () => {
    const candidate = structuredClone(PRODUCT_IDENTITY) as unknown as MutableIdentity;
    candidate.schema = "z1-product-identity-v1";
    candidate.displayName = "Z1";
    candidate.commandName = "z1";
    candidate.packageName = "@example/z1"; candidate.runtimePackageName = "@example/z1-runtime";
    candidate.filesystem.slug = "z1";
    candidate.filesystem.windowsDirectory = "z1";
    candidate.filesystem.unixDirectory = "z1";
    candidate.filesystem.temporaryPrefix = "z1-";
    candidate.state.windowsControlDirectory = "z1";
    candidate.state.unixControlDirectory = "z1";
    candidate.endpoint.windowsPipeStem = "z1";
    candidate.protocol = replaceValues(candidate.protocol, /^a1(?=-|$)/, "z1");
    candidate.evidence = replaceValues(candidate.evidence, /^a1-/, "z1-");
    candidate.environment = replaceValues(candidate.environment, /^A1_/, "Z1_");
    candidate.artifacts.diagnosticStem = "z1";

    const identity = validateProductIdentity(candidate);
    expect(identity.displayName).toBe("Z1");
    expect(identity.environment.configDir).toBe("Z1_CONFIG_DIR");
    expect(allObjectsFrozen(identity)).toBe(true);
  });

  it.each([
    ["non-object", null, /must be an object/],
    ["missing root key", without(structuredClone(PRODUCT_IDENTITY), "evidence"), /must contain exactly/],
    ["unknown root key", { ...structuredClone(PRODUCT_IDENTITY), duplicate: "A1" }, /must contain exactly/],
    ["unknown nested key", { ...structuredClone(PRODUCT_IDENTITY), endpoint: { ...PRODUCT_IDENTITY.endpoint, duplicate: "a1" } }, /must contain exactly/],
    ["legacy environment prefix", withEnvironment("configDir", "ADDONE_CONFIG_DIR"), /must use A1_/],
    ["duplicate environment key", withEnvironment("dataDir", PRODUCT_IDENTITY.environment.configDir), /must be unique/],
    ["divergent namespace", { ...structuredClone(PRODUCT_IDENTITY), protocol: { ...PRODUCT_IDENTITY.protocol, namespace: "other" } }, /must match the command name/],
  ])("rejects %s", (_name, candidate, expected) => {
    expect(() => validateProductIdentity(candidate)).toThrow(expected);
  });
});

type MutableStringRecord = Record<string, string>;
interface MutableIdentity extends Record<string, unknown> {
  schema: string;
  displayName: string;
  commandName: string;
  packageName: string;
  runtimePackageName: string;
  filesystem: MutableStringRecord;
  environment: MutableStringRecord;
  state: MutableStringRecord;
  endpoint: MutableStringRecord;
  protocol: MutableStringRecord;
  evidence: MutableStringRecord;
  artifacts: MutableStringRecord;
}

function allObjectsFrozen(value: unknown): boolean {
  if (typeof value !== "object" || value === null) return true;
  return Object.isFrozen(value) && Object.values(value).every(allObjectsFrozen);
}

function replaceValues(record: MutableStringRecord, pattern: RegExp, replacement: string): MutableStringRecord {
  return Object.fromEntries(Object.entries(record).map(([key, value]) => [key, value.replace(pattern, replacement)]));
}

function without(value: object, key: string): object {
  const candidate = value as Record<string, unknown>;
  delete candidate[key];
  return candidate;
}

function withEnvironment(key: string, value: string): object {
  const candidate = structuredClone(PRODUCT_IDENTITY) as unknown as MutableIdentity;
  candidate.environment[key] = value;
  return candidate;
}
