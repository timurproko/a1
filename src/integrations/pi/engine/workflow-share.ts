/**
 * Pinned Pi's `/share` workflow: the Radius artifact route with a gist fallback. The runner loads
 * this module on the first `/share`, so its network clients stay off the startup path.
 */
import { randomUUID } from "node:crypto";
import { readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PRODUCT_IDENTITY } from "../../../product-identity.js";
import { isRecord, requireCapability, stringProperty } from "./message-values.js";
import { commandMissing, errorMessage, isAbortError, workflowResult } from "./workflow-support.js";
import type { AgentSession, AgentSessionRuntime } from "../startup-public.js";
import type { PiWorkflowHost, PiWorkflowRequest, PiWorkflowResult } from "./workflows.js";

// Provenance: the pinned engine's modes/interactive/session-share.ts Radius route and the model
// runtime's DEFAULT_RADIUS_GATEWAY; neither is in the public API, so each upgrade re-checks them.
const RADIUS_SHARE_GATEWAY = "https://radius.pi.dev";
const RADIUS_AUTH_MIN_VALIDITY_MS = 5 * 60_000;

export interface PiShareCall {
  readonly request: PiWorkflowRequest;
  readonly session: AgentSession;
  readonly runtime: AgentSessionRuntime;
  readonly host: PiWorkflowHost;
}

export async function runShareWorkflow({ request, session, runtime, host }: PiShareCall): Promise<PiWorkflowResult> {
  const signal = request.signal;
  if (signal?.aborted) return shareCancelled(request);
  const destination = runtime.services.settingsManager?.getSessionShareDestination?.() ?? "auto";
  if (destination !== "gist") {
    const radius = await shareViaRadius({ request, session, runtime, host });
    if (radius !== undefined) return radius;
    if (destination === "radius") return workflowResult(request.command, "failed", "Radius authentication is not configured. Run '/login radius' first.");
  }
  request.onProgress?.("Creating gist…");
  try {
    await host.runCommand("gh", ["auth", "status"], signal === undefined ? undefined : { signal });
  } catch (error) {
    if (signal?.aborted || isAbortError(error)) return shareCancelled(request);
    const message = commandMissing(error)
      ? "GitHub CLI (gh) is not installed. Install it from https://cli.github.com/"
      : "GitHub CLI is not logged in. Run 'gh auth login' first.";
    return workflowResult(request.command, "failed", message);
  }
  const temporary = join(tmpdir(), `${PRODUCT_IDENTITY.filesystem.temporaryPrefix}pi-session-${process.pid}.html`);
  try {
    try {
      await requireCapability(session.exportToHtml, "exportToHtml").call(session, temporary);
    } catch (error) {
      return workflowResult(request.command, "failed", `Failed to export session: ${errorMessage(error, "Unknown error")}`);
    }
    if (signal?.aborted) return shareCancelled(request);
    let gist: { readonly stdout: string; readonly stderr: string };
    try {
      gist = await host.runCommand("gh", ["gist", "create", "--public=false", temporary], signal === undefined ? undefined : { signal });
    } catch (error) {
      if (signal?.aborted || isAbortError(error)) return shareCancelled(request);
      return workflowResult(request.command, "failed", `Failed to create gist: ${shareCommandFailureDetail(error)}`);
    }
    if (signal?.aborted) return shareCancelled(request);
    const gistUrl = gist.stdout.trim();
    const gistId = gistUrl.split("/").at(-1);
    if (!gistId) return workflowResult(request.command, "failed", "Failed to parse gist ID from gh output");
    return workflowResult(request.command, "completed", `Share URL: ${shareViewerUrl(gistId)}`, gistUrl);
  } finally {
    await rm(temporary, { force: true });
  }
}

function shareCancelled(request: PiWorkflowRequest): PiWorkflowResult {
  return workflowResult(request.command, "cancelled", "Share cancelled", undefined, "status");
}

// Protocol: the pinned Radius `/share` route. Undefined means Radius has no provider or credential,
// so the caller may fall back to a gist; any other outcome, including an upload failure, is final.
async function shareViaRadius({ request, session, runtime, host }: PiShareCall): Promise<PiWorkflowResult | undefined> {
  const signal = request.signal;
  const models = runtime.services.modelRuntime;
  if (models.getProvider?.("radius") === undefined) return undefined;
  const token = radiusAuthCredential(await models.getAuth("radius", { minOAuthValidityMs: RADIUS_AUTH_MIN_VALIDITY_MS }));
  if (!token) return undefined;
  if (signal?.aborted) return shareCancelled(request);
  request.onProgress?.("Uploading to Radius…");
  const temporary = join(tmpdir(), `${PRODUCT_IDENTITY.filesystem.temporaryPrefix}pi-session-${process.pid}.jsonl`);
  let body: string;
  try {
    requireCapability(session.exportToJsonl, "exportToJsonl").call(session, temporary);
    body = withRadiusShareTrailingEntry(await readFile(temporary, "utf8"), (session as Partial<Pick<AgentSession, "state">>).state ?? {}, randomUUID().slice(0, 8));
  } catch (error) {
    return workflowResult(request.command, "failed", `Failed to export session: ${errorMessage(error, "Unknown error")}`);
  } finally {
    await rm(temporary, { force: true });
  }
  const url = new URL("/v1/artifacts", RADIUS_SHARE_GATEWAY);
  url.searchParams.set("visibility", "organization");
  url.searchParams.set("title", "Pi session");
  try {
    const response = await (host.fetch ?? fetch)(url, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/x-ndjson" },
      body,
      ...(signal === undefined ? {} : { signal }),
    });
    const json: unknown = await response.json().catch(() => null);
    if (signal?.aborted) return shareCancelled(request);
    const artifact = isRecord(json) && isRecord(json.artifact) ? json.artifact : undefined;
    const shareUrl = artifact === undefined ? undefined : stringProperty(artifact, "canonical_url");
    if (!response.ok || shareUrl === undefined) {
      const detail = (isRecord(json) ? stringProperty(json, "error") : undefined) || response.statusText || String(response.status);
      return workflowResult(request.command, "failed", `Failed to upload Radius artifact: ${detail}`);
    }
    return workflowResult(request.command, "completed", `Share URL: ${shareUrl}`);
  } catch (error) {
    if (signal?.aborted || isAbortError(error)) return shareCancelled(request);
    return workflowResult(request.command, "failed", `Failed to upload Radius artifact: ${errorMessage(error, "Unknown error")}`);
  }
}

function shareCommandFailureDetail(error: unknown): string {
  // Compatibility: Pi reports a failed child's stderr, not execFile's command wrapper.
  if (isRecord(error) && (typeof error.code === "number" || typeof error.signal === "string") && typeof error.stderr === "string") {
    return error.stderr.trim() || "Unknown error";
  }
  return errorMessage(error, "Unknown error");
}

function shareViewerUrl(gistId: string): string {
  const baseUrl = process.env.PI_SHARE_VIEWER_URL || "https://pi.dev/session/";
  return `${baseUrl}#${gistId}`;
}

/** The bearer token in a model-runtime auth result: an API key or an `Authorization: Bearer` header. */
function radiusAuthCredential(auth: unknown): string | undefined {
  const resolved = isRecord(auth) && isRecord(auth.auth) ? auth.auth : undefined;
  if (resolved === undefined) return undefined;
  if (typeof resolved.apiKey === "string" && resolved.apiKey) return resolved.apiKey;
  const headers = isRecord(resolved.headers) ? resolved.headers : {};
  const authorization = Object.entries(headers).find(([name]) => name.toLowerCase() === "authorization")?.[1];
  return typeof authorization === "string" ? /^Bearer\s+(.+)$/iu.exec(authorization)?.[1] : undefined;
}

/**
 * Append the pinned `pi.share` trailing entry (system prompt and tool schemas for the session viewer)
 * to a branch JSONL export. It chains to the last exported entry and reuses the header timestamp.
 */
function withRadiusShareTrailingEntry(
  jsonl: string,
  state: { readonly systemPrompt?: unknown; readonly tools?: readonly unknown[] },
  id: string,
): string {
  const lines = jsonl.split("\n").filter(line => line.length > 0);
  const header: unknown = lines[0] === undefined ? undefined : JSON.parse(lines[0]);
  const last: unknown = lines.length > 1 ? JSON.parse(lines.at(-1)!) : undefined;
  const entry = {
    type: "custom",
    customType: "pi.share",
    id,
    parentId: isRecord(last) && typeof last.id === "string" ? last.id : null,
    timestamp: isRecord(header) && typeof header.timestamp === "string" ? header.timestamp : new Date().toISOString(),
    data: {
      systemPrompt: state.systemPrompt,
      tools: (state.tools ?? []).filter(isRecord).map(tool => ({ name: tool.name, description: tool.description, parameters: tool.parameters })),
    },
  };
  return `${[...lines, JSON.stringify(entry)].join("\n")}\n`;
}
