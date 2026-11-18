import type { Component } from "@earendil-works/pi-tui";
import { clearPiDialogHover } from "./dialog-hover.js";
import { componentPort, type PiShellComponentPort } from "./shell-shared-facade.js";

/** Opt an owned composed dialog into native child/input hit testing and explicit outside cancellation. */
export function ownedDialogPort(component: Component, cancel: (() => void) | undefined, handleInput?: (data: string) => void): PiShellComponentPort {
  const base = componentPort(component, handleInput);
  let width = 0;
  let height = 0;
  let painted = false;
  let disposed = false;
  return {
    ...base,
    render(columns) {
      if (disposed) return [];
      const rows = base.render(columns);
      width = columns;
      height = rows.length;
      painted = true;
      return rows;
    },
    handleInput(data) {
      if (disposed) return;
      clearPiDialogHover(component);
      painted = false;
      base.handleInput?.(data);
    },
    handleLocalMouse(event) {
      if (!painted) return;
      clearPiDialogHover(component);
      component.handleMouse?.({
        type: event.kind === "motion" ? event.button === 3 ? "move" : "drag"
          : event.kind === "wheel-up" || event.kind === "wheel-down" ? "wheel" : event.kind,
        button: event.button === 0 ? "left" : event.button === 1 ? "middle" : event.button === 2 ? "right" : "none",
        x: event.column - 1, y: event.row - 1, screenX: event.column - 1, screenY: event.row - 1,
        width, height, shift: false, alt: false, ctrl: false,
        ...(event.kind === "wheel-up" || event.kind === "wheel-down" ? { wheelDelta: event.kind === "wheel-up" ? -1 : 1 } : {}),
      });
    },
    clearMouseHover: () => clearPiDialogHover(component),
    ...(cancel === undefined ? {} : { cancelDialog: () => { if (!disposed) cancel(); } }),
    invalidate() { painted = false; base.invalidate(); },
    dispose() {
      if (disposed) return;
      disposed = true; painted = false;
      clearPiDialogHover(component);
      base.dispose?.();
    },
  };
}
