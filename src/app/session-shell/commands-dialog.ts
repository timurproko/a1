import type { OwnedUiShellComponents, OwnedUiShellEditorPort } from "../../contracts/owned-ui/index.js";
import type { OwnedUiSessionShellRoot } from "./session-shell-root.js";

/** What the Commands dialog reaches: the prompt it reads commands from and the shell that runs them. */
export interface CommandsDialogPorts {
  readonly root: Pick<OwnedUiSessionShellRoot, "setInputSurface"> & { readonly editor: Pick<OwnedUiShellEditorPort, "commandCatalog" | "setText"> };
  readonly dialogs: Pick<OwnedUiShellComponents["dialogs"], "commandsSelector">;
  readonly close: () => void;
  readonly requestRender: () => void;
  readonly submit: (text: string) => void;
}

/**
 * Opens the Commands dialog over every slash command the prompt menu offers. A command that takes
 * arguments is placed in the prompt for the user to finish; any other runs at once.
 */
export function openCommandsDialog(ports: CommandsDialogPorts): void {
  const commands = ports.root.editor.commandCatalog();
  const component = ports.dialogs.commandsSelector({
    skills: commands.map(command => ({ name: command.name, description: command.description ?? "" })),
    onSelect: name => {
      ports.close();
      const command = commands.find(candidate => candidate.name === name);
      if (command?.argumentHint !== undefined || (command?.argumentOptions?.length ?? 0) > 0) {
        ports.root.editor.setText(`/${name} `);
        ports.requestRender();
      } else {
        ports.submit(`/${name}`);
      }
    },
    onCancel: ports.close,
  });
  ports.root.setInputSurface(component);
  ports.requestRender();
}
