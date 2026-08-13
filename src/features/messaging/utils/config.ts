/**
 * Messaging is an optional surface: it only exists when the deployment points
 * at a jiffy-messaging instance. Every entry point checks the flags below so
 * an unconfigured environment renders nothing instead of crashing a page.
 *
 * Next inlines `NEXT_PUBLIC_*` at build time only when the variable is written
 * out as a full literal, so both are read here once rather than looked up by
 * a computed key.
 */
const rawBaseUrl = process.env.NEXT_PUBLIC_MESSAGING_URL
const rawWsUrl = process.env.NEXT_PUBLIC_MESSAGING_WS_URL

const stripTrailingSlash = (value: string) => value.replace(/\/+$/, '')

const toWebSocketUrl = (httpUrl: string): string => {
  if (/^https:\/\//i.test(httpUrl)) return `wss://${httpUrl.slice('https://'.length)}`
  if (/^http:\/\//i.test(httpUrl)) return `ws://${httpUrl.slice('http://'.length)}`
  return httpUrl
}

const normalize = (value: string | undefined) => (value?.trim() ? stripTrailingSlash(value.trim()) : '')

export const messagingBaseUrl = normalize(rawBaseUrl)

// The WS URL is derivable from the HTTP one for the common single-origin
// deployment, so only set NEXT_PUBLIC_MESSAGING_WS_URL when they differ.
export const messagingWsUrl = normalize(rawWsUrl) || (messagingBaseUrl ? toWebSocketUrl(messagingBaseUrl) : '')

/** History, sending and read state all work with just this. */
export const isMessagingConfigured = messagingBaseUrl.length > 0

/** Live delivery is a bonus on top; the thread still works over REST without it. */
export const isMessagingRealtimeConfigured = isMessagingConfigured && messagingWsUrl.length > 0

export const MESSAGE_PAGE_SIZE = 50
