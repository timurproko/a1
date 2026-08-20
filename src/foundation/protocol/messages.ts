import { createHash } from "node:crypto";
import type { CommandResult, SupervisorCommand, SupervisorSnapshot } from "../lifecycle/index.js";
import { PRODUCT_IDENTITY } from "../../product-identity.js";

export const CONTROL_ENVELOPE = PRODUCT_IDENTITY.protocol.controlEnvelope;
export const CONTROL_ENVELOPE_REVISION = 1 as const;
export const REQUIRED_CONTROL_FEATURES = [
  "handshake.features.v1",
  "snapshot.revision.v1",
  "commands.request-identity.v1",
  "generation.lifecycle.v1",
  "terminal.foreground-lease.v1",
] as const;
export const OPTIONAL_CONTROL_FEATURES = [
  "messages.unknown-additive-ignore.v1",
  "snapshot.resynchronize.v1",
] as const;
export type ControlFeature = string;
export const GENERATED_CONTRACT_DIGEST = createHash("sha256").update(JSON.stringify({
  envelope: CONTROL_ENVELOPE,
  revision: CONTROL_ENVELOPE_REVISION,
  required: [...REQUIRED_CONTROL_FEATURES].sort(),
  optional: [...OPTIONAL_CONTROL_FEATURES].sort(),
})).digest("hex");
export const MAX_CONTROL_FRAME_BYTES = 4 * 1024 * 1024;

export interface ControlHello {
  readonly envelope: typeof CONTROL_ENVELOPE;
  readonly envelopeRevision: typeof CONTROL_ENVELOPE_REVISION;
  readonly requiredFeatures: readonly ControlFeature[];
  readonly optionalFeatures: readonly ControlFeature[];
  readonly contractDigest: string;
  readonly releaseId?: string;
}

export type ClientMessage =
  | { readonly type: "identity-probe" }
  | { readonly type: "release-idle-ownership"; readonly bootNonce: string; readonly candidateReleaseId: string }
  | { readonly type: "release-update-ownership"; readonly bootNonce: string; readonly targetVersion: string }
  | ({ readonly type: "client-hello"; readonly clientId: string } & ControlHello)
  | { readonly type: "command"; readonly command: SupervisorCommand };

export type ServerMessage =
  | { readonly type: "identity"; readonly supervisorId: string; readonly bootNonce: string; readonly pidStartIdentity: string; readonly releaseId: string }
  | { readonly type: "release-ownership-result"; readonly released: boolean; readonly reason: string; readonly liveGenerationIds: readonly string[] }
  | { readonly type: "release-update-result"; readonly accepted: boolean; readonly reason: string; readonly liveGenerationIds: readonly string[] }
  | ({ readonly type: "server-hello"; readonly supervisorId: string; readonly bootNonce: string; readonly pidStartIdentity: string; readonly negotiatedFeatures: readonly string[]; readonly snapshot: SupervisorSnapshot } & ControlHello)
  | { readonly type: "snapshot"; readonly snapshot: SupervisorSnapshot }
  | { readonly type: "command-result"; readonly result: CommandResult }
  | { readonly type: "protocol-error"; readonly code: string; readonly message: string; readonly diagnostics?: unknown };

export interface ControlNegotiation {
  readonly ok: boolean;
  readonly negotiatedFeatures: readonly string[];
  readonly missingFromClient: readonly string[];
  readonly missingFromServer: readonly string[];
  readonly diagnostic: string;
}

export function localControlHello(releaseId?: string): ControlHello {
  return {
    envelope: CONTROL_ENVELOPE,
    envelopeRevision: CONTROL_ENVELOPE_REVISION,
    requiredFeatures: REQUIRED_CONTROL_FEATURES,
    optionalFeatures: OPTIONAL_CONTROL_FEATURES,
    contractDigest: GENERATED_CONTRACT_DIGEST,
    ...(releaseId ? { releaseId } : {}),
  };
}

export function negotiateControlFeatures(client: ControlHello, server: ControlHello = localControlHello()): ControlNegotiation {
  if (client.envelope !== server.envelope || client.envelopeRevision !== server.envelopeRevision) {
    return {
      ok: false,
      negotiatedFeatures: [],
      missingFromClient: [],
      missingFromServer: [],
      diagnostic: `control envelope mismatch: client ${client.envelope}/${client.envelopeRevision}; server ${server.envelope}/${server.envelopeRevision}`,
    };
  }
  const clientFeatures = new Set([...client.requiredFeatures, ...client.optionalFeatures]);
  const serverFeatures = new Set([...server.requiredFeatures, ...server.optionalFeatures]);
  const missingFromClient = server.requiredFeatures.filter(feature => !clientFeatures.has(feature));
  const missingFromServer = client.requiredFeatures.filter(feature => !serverFeatures.has(feature));
  const negotiatedFeatures = [...clientFeatures].filter(feature => serverFeatures.has(feature)).sort();
  return {
    ok: missingFromClient.length === 0 && missingFromServer.length === 0,
    negotiatedFeatures,
    missingFromClient,
    missingFromServer,
    diagnostic: missingFromClient.length === 0 && missingFromServer.length === 0
      ? `control features negotiated (${negotiatedFeatures.join(", ")}); contract client=${client.contractDigest} server=${server.contractDigest}`
      : `required control features unavailable; client missing [${missingFromClient.join(", ")}], server missing [${missingFromServer.join(", ")}]; contract client=${client.contractDigest} server=${server.contractDigest}`,
  };
}

export function encodeFrame(message: ClientMessage | ServerMessage | Readonly<Record<string, unknown>>): string {
  return `${JSON.stringify(message)}\n`;
}

export class LineFrameDecoder {
  #buffer = "";

  push(chunk: Buffer | string): unknown[] {
    this.#buffer += typeof chunk === "string" ? chunk : chunk.toString("utf8");
    if (Buffer.byteLength(this.#buffer, "utf8") > MAX_CONTROL_FRAME_BYTES) {
      this.#buffer = "";
      throw new Error("control frame exceeds maximum size");
    }
    const messages: unknown[] = [];
    let newline = this.#buffer.indexOf("\n");
    while (newline >= 0) {
      const line = this.#buffer.slice(0, newline);
      this.#buffer = this.#buffer.slice(newline + 1);
      if (line.length > 0) messages.push(JSON.parse(line));
      newline = this.#buffer.indexOf("\n");
    }
    return messages;
  }
}

export function isControlHello(value: unknown): value is { readonly type: "client-hello"; readonly clientId: string } & ControlHello {
  if (!isRecord(value) || value.type !== "client-hello" || typeof value.clientId !== "string") return false;
  return value.envelope === CONTROL_ENVELOPE
    && value.envelopeRevision === CONTROL_ENVELOPE_REVISION
    && isStringArray(value.requiredFeatures)
    && isStringArray(value.optionalFeatures)
    && typeof value.contractDigest === "string"
    && (value.releaseId === undefined || typeof value.releaseId === "string");
}

export function isCommandMessage(value: unknown): value is Extract<ClientMessage, { type: "command" }> {
  return isRecord(value) && value.type === "command" && isRecord(value.command) && typeof value.command.type === "string";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every(item => typeof item === "string" && item.length > 0);
}
