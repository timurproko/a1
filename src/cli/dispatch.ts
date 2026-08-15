import { interactiveLaunchIntent, type InteractiveLaunchIntent, type LaunchProfileId } from "../features/launch/index.js";

export type UpdateChannel = "stable" | "next";

export interface CliHandlers {
  readonly launch: (intent: InteractiveLaunchIntent) => Promise<number>;
  readonly ownedUi: () => Promise<number>;
  readonly version: () => Promise<number>;
  readonly update: (channel: UpdateChannel) => Promise<number>;
}

export interface CliOutput {
  readonly stderr: (message: string) => void;
}

export const ADDONE_USAGE = "Usage: a1 | a1 pi | a1 sandbox | a1 ui | a1 version | a1 update | a1 update:next";

export async function dispatchAddOneCli(
  arguments_: readonly string[],
  handlers: CliHandlers,
  output: CliOutput,
): Promise<number> {
  const command = parseAddOneCommand(arguments_);
  if (command.kind === "error") {
    output.stderr(`${command.message}\n${ADDONE_USAGE}\n`);
    return 2;
  }
  if (command.kind === "owned-ui") return await handlers.ownedUi();
  if (command.kind === "launch") return await handlers.launch(interactiveLaunchIntent(command.profileId));
  if (command.kind === "version") return await handlers.version();
  return await handlers.update(command.channel);
}

export type AddOneCommand =
  | { readonly kind: "launch"; readonly profileId: LaunchProfileId }
  | { readonly kind: "owned-ui" }
  | { readonly kind: "version" }
  | { readonly kind: "update"; readonly channel: UpdateChannel }
  | { readonly kind: "error"; readonly message: string };

export function parseAddOneCommand(arguments_: readonly string[]): AddOneCommand {
  if (arguments_.length === 0) return { kind: "launch", profileId: "addone" };
  if (arguments_.length > 1) return { kind: "error", message: "AddOne commands do not accept additional arguments." };
  const [command] = arguments_;
  if (command === "pi" || command === "sandbox") return { kind: "launch", profileId: command };
  if (command === "ui") return { kind: "owned-ui" };
  if (command === "version") return { kind: "version" };
  if (command === "update") return { kind: "update", channel: "stable" };
  if (command === "update:next") return { kind: "update", channel: "next" };
  if (command === "agent") return { kind: "error", message: "Bare a1/addone is the AddOne agent experience; there is no agent subcommand." };
  return { kind: "error", message: `Unknown AddOne command: ${command ?? ""}` };
}
