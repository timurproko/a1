export type TabsAction = "list" | "stop" | "stop-all" | "host-status" | "host-stop" | "doctor";

/** One parsed `a1 tabs` form. Parsing finishes before any host is contacted. */
export interface TabsRequest {
  readonly action: TabsAction;
  readonly tabId?: string;
  readonly json: boolean;
}
