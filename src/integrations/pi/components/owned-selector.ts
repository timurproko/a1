import { Container, SelectList, Spacer, Text, truncateToWidth } from "@earendil-works/pi-tui";
import { DynamicBorder, UserMessageSelectorComponent } from "../startup-public.js";
import { ownedDialogPort } from "./dialog-mouse.js";
import { PiOwnedSelectList } from "./dialog-select-list.js";
import { paintPiDialogText } from "./dialog-choice.js";
import { addPiModalHeader, addPiModalSelectFooter, adoptPiModalFrame } from "./modal-frame.js";
import { DIALOG_CLOSE_SHORTCUT_HINT, PINNED_PI_LAYOUT, getPiSelectListTheme, internalDialogTitle, paintPiBorder, piTheme, renderPiModalShortcutHints } from "./theme.js";
import type { PiShellSelectorOption, PiShellSelectorOptions } from "./shell-shared-facade.js";

/** Optional owned selector presentation stays outside first-prompt loading. */
export function createOwnedSelector(options: PiShellSelectorOptions) {
  const items = options.options.map(option => ({ value: option.id, label: option.label, ...(option.description === undefined ? {} : { description: option.description }) }));
  const maximum = options.maxVisible ?? Math.min(PINNED_PI_LAYOUT.selectorMaxVisible, Math.max(1, items.length));
  const list = new SelectList(items, maximum, getPiSelectListTheme());
  list.onSelect = item => options.onSelect?.(item.value);
  if (options.onCancel !== undefined) list.onCancel = options.onCancel;
  const container = new Container();
  if (options.title) container.addChild(new Text(piTheme().fg("accent", piTheme().bold(internalDialogTitle(options.title))), PINNED_PI_LAYOUT.contentPaddingX, 0));
  container.addChild(new PiOwnedSelectList(list, items, maximum));
  if (options.onCancel !== undefined) {
    container.addChild(new Spacer(1));
    container.addChild(new Text(renderPiModalShortcutHints([{ key: "↑↓", action: "navigate" }, { key: "enter", action: "select" }, DIALOG_CLOSE_SHORTCUT_HINT]), 0, 0));
  }
  return ownedDialogPort(container, options.onCancel, data => list.handleInput(data));
}

/** Owned confirmation chrome and its semantic list share the keyboard controller without pointer steering. */
export function createOwnedExtensionSelector(title: string, values: readonly string[], onSelect: (value: string) => void, onCancel: () => void) {
  const items = values.map(value => ({ value, label: value }));
  const list = new SelectList(items, 10, getPiSelectListTheme());
  list.onSelect = item => onSelect(item.value);
  list.onCancel = onCancel;
  const container = new Container();
  const header = addPiModalHeader(container, new DynamicBorder(paintPiBorder), new Text(piTheme().fg("accent", piTheme().bold(title)), 0, 0));
  container.addChild(new Spacer(1));
  container.addChild(new PiOwnedSelectList(list, items, 10));
  container.addChild(new Spacer(1));
  container.addChild(new Text(renderPiModalShortcutHints([{ key: "↑↓", action: "navigate" }, { key: "Enter", action: "select" }, DIALOG_CLOSE_SHORTCUT_HINT]), 0, 0));
  container.addChild(new DynamicBorder(paintPiBorder));
  adoptPiModalFrame(container, { topIndex: 0, bottomIndex: container.children.length - 1, header });
  return ownedDialogPort(container, onCancel, data => list.handleInput(data === "j" ? "\u001b[B" : data === "k" ? "\u001b[A" : data));
}

/** The message selector keeps public pinned chrome and history metadata, with owned semantic choices. */
export function createOwnedMessageSelector(messages: readonly PiShellSelectorOption[], onSelect: (id: string) => void, onCancel: () => void, initialSelectedId?: string) {
  const selector = new UserMessageSelectorComponent(messages.map(message => ({ id: message.id, text: message.label })), onSelect, onCancel, initialSelectedId);
  const list = selector.getMessageList();
  selector.children[1] = new Text(piTheme().fg("accent", piTheme().bold("Fork from Message")), 1, 0);
  const items = messages.map(message => ({ value: message.id, label: message.label }));
  const controller = new SelectList(items, 10, getPiSelectListTheme());
  const initial = messages.findIndex(message => message.id === initialSelectedId);
  controller.setSelectedIndex(initial < 0 ? Math.max(0, items.length - 1) : initial);
  controller.onSelect = item => onSelect(item.value);
  controller.onCancel = onCancel;
  selector.children[selector.children.indexOf(list)] = new PiOwnedSelectList(controller, items, 10,
    (item, selected, hovered, width) => `${selected ? piTheme().fg("accent", "→ ") : "  "}${paintPiDialogText(hovered, "text", truncateToWidth(item.label.replace(/\n/gu, " ").trim(), Math.max(0, width - 2)))}`,
    item => [new Text(piTheme().fg("muted", `  Message ${items.indexOf(item) + 1} of ${items.length}`), 0, 0), new Spacer(1)]);
  addPiModalSelectFooter(selector);
  adoptPiModalFrame(selector, { topIndex: 4, bottomIndex: selector.children.length - 1 });
  return ownedDialogPort(selector, onCancel, data => controller.handleInput(data));
}
