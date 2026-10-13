const TAB_ENVIRONMENT_NAMES = ["A1_TAB_ID", "A1_TAB_TOKEN", "A1_TAB_ENDPOINT"];

/** @param {string} reason */
export function formatResidentFallbackNotice(reason) {
  return `Resident tabs unavailable (${reason}); running a single agent.`;
}

/**
 * @param {Record<string, string | undefined>} environment
 * @param {string} name
 * @param {() => string} createId
 */
export function assignFreshSessionRuntimeId(environment, name, createId) {
  const id = createId();
  if (typeof id !== "string" || id.length === 0 || id.includes("\0")) throw new Error("Session runtime identity generation failed");
  environment[name] = id;
  return id;
}

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
  const dataArgument = uiArguments.indexOf("--tab-data-dir");
  const tabDataDir = dataArgument === -1 ? undefined : uiArguments[dataArgument + 1];
  if (dataArgument !== -1) uiArguments.splice(dataArgument, 2);
  const incarnationArgument = uiArguments.indexOf("--tab-incarnation");
  const tabIncarnation = incarnationArgument === -1 ? undefined : Number(uiArguments[incarnationArgument + 1]);
  if (incarnationArgument !== -1) uiArguments.splice(incarnationArgument, 2);
  const [tabId, token, endpoint] = TAB_ENVIRONMENT_NAMES.map(name => environment[name]);
  for (const name of TAB_ENVIRONMENT_NAMES) delete environment[name];
  if (!tabMode) return { uiArguments, tabCredentials: undefined };
  if (!tabId || !token || !endpoint || !tabDataDir || tabDataDir.includes("\0")
    || typeof tabIncarnation !== "number" || !Number.isSafeInteger(tabIncarnation) || tabIncarnation < 1) {
    throw new Error("A1 tab mode requires bridge credentials, recovery directory, and incarnation");
  }
  return { uiArguments, tabCredentials: { tabId, token, endpoint }, tabDataDir, tabIncarnation };
}
