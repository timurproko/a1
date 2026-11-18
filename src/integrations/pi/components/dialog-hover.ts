import { Container, type Component } from "@earendil-works/pi-tui";

/** Clear hover through public composition rather than guessing semantic rows from rendered text. */
export function clearPiDialogHover(component: Component): void {
  (component as Component & { clearMouseHover?(): void }).clearMouseHover?.();
  if (component instanceof Container) for (const child of component.children) clearPiDialogHover(child);
}
