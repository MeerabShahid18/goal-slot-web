'use client'

/**
 * Window-event bridge for pushing a message into the Coach chat from
 * anywhere in the app, without threading callbacks through the layout or
 * reaching for a new store.
 *
 * This follows the pattern already used for `goalslot:open-coach`,
 * `goalslot:start-tracking` and `goalslot:open-checkin`: the producer
 * dispatches, whichever Coach surface is currently mounted consumes.
 *
 * The point of the bridge is that voice never gets its own execution path.
 * A transcript is handed to the same `handleSend` the typed composer calls,
 * so it goes through `coachApi.streamChat`, gets parsed by
 * `extractCoachProposals`, renders as a `CoachProposalCard`, and only
 * touches data when the user presses Apply and the card posts to
 * `/coach/proposals/apply`. Spoken and typed requests are indistinguishable
 * from the moment the text exists.
 */

export const COACH_OPEN_EVENT = 'goalslot:open-coach'
export const COACH_SEND_EVENT = 'goalslot:coach-send'

export interface CoachSendEventDetail {
  content: string
  /**
   * Written by a listener that is mounted but cannot take the message right
   * now (no scope key yet, a reply already streaming). Lets the caller tell
   * the user *why* rather than a generic failure.
   */
  declineReason?: string
}

export type CoachSendEvent = CustomEvent<CoachSendEventDetail>

export interface CoachSendResult {
  delivered: boolean
  /** Present when `delivered` is false. Reads as the tail of a sentence. */
  reason?: string
}

/**
 * Exactly one Coach chat surface is mounted at a time, which is what makes
 * the bridge safe to broadcast on:
 *  - `/dashboard/coach` renders the full `ChatSection`, and
 *    `FloatingCoachButton` deliberately returns null on that route, so the
 *    quick-chat popover does not exist there;
 *  - everywhere else under `/dashboard` it is the popover and only the
 *    popover.
 *
 * A listener that took the message acknowledges by calling
 * `preventDefault()`. If nothing does — e.g. the user is on the Coach page
 * but the chat is gated behind missing AI settings — this reports
 * `delivered: false` so the caller can tell the user their words went
 * nowhere instead of dropping them silently.
 */
export function requestCoachSend(content: string): CoachSendResult {
  const trimmed = content.trim()
  if (!trimmed || typeof window === 'undefined') {
    return { delivered: false, reason: 'there was nothing to send' }
  }

  // Open the quick chat first so the streamed reply and the proposal card
  // are on screen by the time they arrive. No-op on the Coach page.
  window.dispatchEvent(new CustomEvent(COACH_OPEN_EVENT))

  const detail: CoachSendEventDetail = { content: trimmed }
  const event: CoachSendEvent = new CustomEvent(COACH_SEND_EVENT, {
    detail,
    cancelable: true,
  })
  // dispatchEvent returns false once a handler has called preventDefault().
  const unhandled = window.dispatchEvent(event)
  if (!unhandled) return { delivered: true }
  return {
    delivered: false,
    reason: detail.declineReason ?? 'the Coach chat is not available on this page',
  }
}

/**
 * Subscribe a Coach chat surface to the bridge.
 *
 * Return nothing to accept the transcript. Return a short reason string to
 * decline it — the caller surfaces that reason to the user, and the message
 * is not counted as delivered.
 */
export function onCoachSendRequest(
  handler: (content: string) => string | void,
): () => void {
  if (typeof window === 'undefined') return () => {}
  const listener = (event: Event) => {
    const detail = (event as CoachSendEvent).detail
    const content = detail?.content?.trim()
    if (!content) return
    const declineReason = handler(content)
    if (typeof declineReason === 'string' && declineReason) {
      detail.declineReason = declineReason
      return
    }
    event.preventDefault()
  }
  window.addEventListener(COACH_SEND_EVENT, listener)
  return () => window.removeEventListener(COACH_SEND_EVENT, listener)
}
