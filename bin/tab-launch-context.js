const TAB_ENVIRONMENT_NAMES = ["A1_TAB_ID", "A1_TAB_TOKEN", "A1_TAB_ENDPOINT"];

/**
 * Security: consume bridge credentials into caller-private memory and erase their inheritable
 * environment entries before any extension-capable module loads.
 * @param {readonly string[]} arguments_
 * @param {Record<string, string | undefined>} environment
 */
export function consumeTabLaunchContext(arguments_, environment) {
  const uiArguments = [...arguments_];
  const tabArgument = uiArguments.indexOf("--tab");
  const tabMode = tabArgument !== -1;
  if (tabMode) uiArguments.splice(tabArgument, 1);
  const [tabId, token, endpoint] = TAB_ENVIRONMENT_NAMES.map(name => environment[name]);
  for (const name of TAB_ENVIRONMENT_NAMES) delete environment[name];
  if (!tabMode) return { uiArguments, tabCredentials: undefined };
  if (!tabId || !token || !endpoint) throw new Error("A1 tab mode requires bridge credentials");
  return { uiArguments, tabCredentials: { tabId, token, endpoint } };
}
