import type { AgentSession } from "../startup-public.js";
import { requireCapability } from "./message-values.js";
import { pathArgument, workflowResult } from "./workflow-support.js";
import type { PiWorkflowHost, PiWorkflowRequest, PiWorkflowResult } from "./workflows.js";

/** Explicit paths and comparison defaults stay pinned; only bare-A1 implicit exports use persistent user storage. */
export async function exportWorkflow(request: PiWorkflowRequest, session: AgentSession, bare: boolean, reserve?: PiWorkflowHost["reserveExport"]): Promise<PiWorkflowResult> {
  const argument = request.argument.trim();
  const flag = bare ? /^(--jsonl|--html)(?:\s+([\s\S]+))?$/u.exec(argument) : null;
  const explicit = pathArgument(flag ? flag[2] ?? "" : argument);
  if (bare && (flag?.[2] || argument && !flag) && explicit === undefined) throw new Error("Export destination is invalid");
  const format = flag ? flag[1] === "--jsonl" ? "jsonl" : "html" : explicit?.toLowerCase().endsWith(".jsonl") ? "jsonl" : "html";
  if (bare && explicit === undefined && reserve === undefined) throw new Error("Session export storage is unavailable");
  const reserved = bare && explicit === undefined ? await reserve!(session.sessionId ?? "session", format) : undefined;
  const path = reserved?.path ?? explicit;
  try {
    const file = format === "jsonl"
      ? await requireCapability(session.exportToJsonl, "exportToJsonl").call(session, path)
      : await requireCapability(session.exportToHtml, "exportToHtml").call(session, path);
    return workflowResult(request.command, "completed", `Session exported to: ${String(file)}`);
  } catch (error) {
    await reserved?.failed();
    throw error;
  }
}
