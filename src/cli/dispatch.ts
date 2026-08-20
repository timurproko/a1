import { interactiveLaunchIntent, type InteractiveLaunchIntent, type LaunchProfileId } from "../features/launch/index.js";

export type UpdateChannel = "stable" | "next";

export interface CliHandlers {
  readonly launch: (intent: InteractiveLaunchIntent) => Promise<number>;
  readonly version: () => Promise<number>;
  readonly update: (channel: UpdateChannel) => Promise<number>;
}

export interface CliOutput {
  readonly stderr: (message: string) => void;
}

export const CLI_USAGE = "Usage: a1 | a1 pi | a1 sandbox | a1 version | a1 update | a1 update:next";

export async function dispatchCli(
  arguments_: readonly string[],
  handlers: CliHandlers,
  output: CliOutput,
): Promise<number> {
  const command = parseCliCommand(arguments_);
  if (command.kind === "error") {
    output.stderr(`${command.message}\n${CLI_USAGE}\n`);
    return 2;
  }
  if (command.kind === "launch") return await handlers.launch(interactiveLaunchIntent(command.profileId));
  if (command.kind === "version") return await handlers.version();
  return await handlers.update(command.channel);
}

export type CliCommand =
  | { readonly kind: "launch"; readonly profileId: LaunchProfileId }
  | { readonly kind: "version" }
  | { readonly kind: "update"; readonly channel: UpdateChannel }
  | { readonly kind: "error"; readonly message: string };

export function parseCliCommand(arguments_: readonly string[]): CliCommand {
  if (arguments_.length === 0) return { kind: "launch", profileId: "addone" };
  if (arguments_.length > 1) return { kind: "error", message: "A1 commands do not accept additional arguments." };
  const [command] = arguments_;
  if (command === "pi" || command === "sandbox") return { kind: "launch", profileId: command };
  if (command === "ui") return { kind: "error", message: "The ui subcommand was removed; run bare a1 for the owned UI." };
  if (command === "version") return { kind: "version" };
  if (command === "update") return { kind: "update", channel: "stable" };
  if (command === "update:next") return { kind: "update", channel: "next" };
  if (command === "agent") return { kind: "error", message: "Bare a1 is the A1 agent experience; there is no agent subcommand." };
  return { kind: "error", message: `Unknown A1 command: ${command ?? ""}` };
}
