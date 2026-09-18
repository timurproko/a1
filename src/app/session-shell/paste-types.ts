/** Paste classification results shared by text preparation and path chip presentation. */
export interface ClipboardPath { readonly fullPath: string; readonly kind: "folder" | "file" }
export type PreparedPasteText =
  | { readonly kind: "text"; readonly text: string; readonly label?: string }
  | { readonly kind: "url"; readonly url: string; readonly label: string }
  | { readonly kind: "paths"; readonly paths: readonly ClipboardPath[] };
