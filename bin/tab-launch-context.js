import { existsSync } from "node:fs";

const TAB_ENVIRONMENT_NAMES = ["A1_TAB_ID", "A1_TAB_TOKEN", "A1_TAB_ENDPOINT"];

/** @param {string} reason */
export function formatResidentFallbackNotice(reason) {
  // Protocol: a host of another generation is never replaced automatically; only the user stops it.
  if (reason === "incompatible generation") {
    return "A1 normal mode unavailable (running tabs use another version); running in single agent mode. Run `a1 tabs host stop` to restart them on this version.";
  }
  return `A1 normal mode unavailable (${reason}); running in single agent mode.`;
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
 * Keep the standby below the session/runtime boundary until its authenticated holder promotes it.
 * Platform: Windows ConPTY may drop the in-band marker, so the holder also creates the promotion
 * file inside the tab's private data directory; whichever arrives first promotes the standby.
 * @param {NodeJS.ReadStream} input
 * @param {string} [promotionFile]
 */
export function waitForStandbyPromotion(input, promotionFile) {
  return /** @type {Promise<void>} */ (new Promise((resolve, reject) => {
    const marker = Buffer.from("\x1b]a1;standby-promote\x07");
    let buffered = Buffer.alloc(0);
    /** @type {NodeJS.Timeout | undefined} */
    let poll;
    const cleanup = () => {
      if (poll !== undefined) clearInterval(poll);
      input.off("data", onData);
      input.off("error", onError);
      input.pause();
      if (input.isTTY) input.setRawMode(false);
    };
    /** @param {Error} error */
    const onError = error => { cleanup(); reject(error); };
    /** @param {Buffer | string} chunk */
    const onData = chunk => {
      const bytes = typeof chunk === "string" ? Buffer.from(chunk) : chunk;
      buffered = Buffer.concat([buffered, bytes]).subarray(-marker.length);
      if (buffered.equals(marker)) { cleanup(); resolve(undefined); }
    };
    if (input.isTTY) input.setRawMode(true);
    input.on("data", onData);
    input.on("error", onError);
    input.resume();
    if (promotionFile !== undefined) {
      poll = setInterval(() => {
        if (existsSync(promotionFile)) { cleanup(); resolve(undefined); }
      }, 10);
    }
  }));
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
  const standbyArgument = uiArguments.indexOf("--tab-standby");
  const tabStandby = standbyArgument !== -1;
  if (tabStandby) uiArguments.splice(standbyArgument, 1);
  const dataArgument = uiArguments.indexOf("--tab-data-dir");
  const tabDataDir = dataArgument === -1 ? undefined : uiArguments[dataArgument + 1];
  if (dataArgument !== -1) uiArguments.splice(dataArgument, 2);
  const incarnationArgument = uiArguments.indexOf("--tab-incarnation");
  const tabIncarnation = incarnationArgument === -1 ? undefined : Number(uiArguments[incarnationArgument + 1]);
  if (incarnationArgument !== -1) uiArguments.splice(incarnationArgument, 2);
  const [tabId, token, endpoint] = TAB_ENVIRONMENT_NAMES.map(name => environment[name]);
  for (const name of TAB_ENVIRONMENT_NAMES) delete environment[name];
  if (!tabMode) return { uiArguments, tabCredentials: undefined, tabStandby: false };
  if (!tabId || !token || !endpoint || !tabDataDir || tabDataDir.includes("\0")
    || typeof tabIncarnation !== "number" || !Number.isSafeInteger(tabIncarnation) || tabIncarnation < 1) {
    throw new Error("A1 tab mode requires bridge credentials, recovery directory, and incarnation");
  }
  return { uiArguments, tabCredentials: { tabId, token, endpoint }, tabDataDir, tabIncarnation, tabStandby };
}
