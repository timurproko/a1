/** The owned screens the server opens in a utility tab; each names its tab id stem, `<route>-…`. */
export type ResidentTabRoute = "settings" | "changelog";

export const RESIDENT_TAB_ROUTES: readonly ResidentTabRoute[] = ["settings", "changelog"];

/** The utility route whose screen is the resident tab `tabId`, or `null` for an Agent tab. */
export function residentUtilityRoute(tabId: string): ResidentTabRoute | null {
  return RESIDENT_TAB_ROUTES.find(route => tabId.startsWith(`${route}-`)) ?? null;
}
