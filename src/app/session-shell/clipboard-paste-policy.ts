/** Raw paste access is independent of text-copy destination; Herdr permits host images, not host text. */
export function nativePasteAccess(env: NodeJS.ProcessEnv): "content" | "image" | "denied" {
  if (env.SSH_CONNECTION || env.SSH_CLIENT || env.SSH_TTY || env.TMUX || env.STY || env.WSL_DISTRO_NAME) return "denied";
  // Policy: a raw Herdr key permits host-image acquisition, but does not prove viewer locality.
  return env.HC_TERMINAL_ID || env.TERM_PROGRAM === "herdr" ? "image" : "content";
}
