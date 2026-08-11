interface Theme {
  fg(color: string, text: string): string;
  bold(text: string): string;
}

interface ExtensionContext {
  ui: {
    setTheme(name: string): { success: boolean; error?: string };
    setWidget(id: string, value: ((tui: unknown, theme: Theme) => Component) | undefined): void;
    setEditorText(value: string): void;
    notify(message: string, level: "info" | "warning" | "error"): void;
    custom<T>(factory: (tui: { requestRender(): void }, theme: Theme, keybindings: unknown, done: (value: T) => void) => Component, options: { overlay: boolean }): Promise<T | undefined>;
  };
  shutdown(): void;
}

interface Component {
  render(width: number): string[];
  handleInput?(data: string): void;
  invalidate(): void;
}

interface ExtensionApi {
  registerCommand(name: string, options: { description: string; handler(args: string, context: ExtensionContext): Promise<void> | void }): void;
  on(name: "session_shutdown", handler: () => void): void;
}

/** Hermetic public-API Native Pi extension used only by release parity gates. */
export default function baselineExtension(pi: ExtensionApi): void {
  pi.registerCommand("baseline", {
    description: "Exercise AddOne Native Pi extension parity",
    handler: async (_args, context) => {
      const changed = context.ui.setTheme("light");
      if (!changed.success) context.ui.notify(changed.error ?? "theme change failed", "error");
      context.ui.setWidget("addone-baseline", (_tui, theme) => ({
        render: width => [theme.fg("accent", theme.bold("EXTENSION CUSTOM COMPONENT")).slice(0, width)],
        invalidate() {},
      }));
      const result = await context.ui.custom<string>((tui, theme, _keybindings, done) => ({
        render: width => [
          theme.fg("accent", theme.bold("EXTENSION OVERLAY")),
          "Click inside this overlay or press Enter",
        ].map(line => line.slice(0, width)),
        handleInput(data) {
          if (/^\x1b\[<0;\d+;\d+M$/.test(data)) done("MOUSE");
          else if (data === "\r") done("ENTER");
          tui.requestRender();
        },
        invalidate() {},
      }), { overlay: true });
      const outcome = result ?? "CANCELLED";
      context.ui.setEditorText(`EXTENSION-EDITOR:${outcome}`);
      context.ui.notify(`EXTENSION-RESULT:${outcome}`, "info");
    },
  });

  pi.registerCommand("baseline-quit", {
    description: "Exercise extension-requested graceful shutdown",
    handler: (_args, context) => context.shutdown(),
  });

  pi.on("session_shutdown", () => {
    // Deliberately synchronous and idempotent: the release gate verifies that
    // Pi and AddOne both finish cleanup after this public lifecycle callback.
  });
}
