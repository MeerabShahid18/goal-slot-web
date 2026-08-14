'use client'

import { useCallback, useMemo, useRef } from 'react'
import { usePathname } from 'next/navigation'

import { AlertTriangle, Check, Loader2, Mic, MicOff, Square, X } from 'lucide-react'

import { cn } from '@/lib/utils'
import { useDismissable } from '@/lib/use-dismissable'
import { requestCoachSend } from '@/lib/coach-bridge'
import { useSpeechRecognition } from '@/hooks/use-speech-recognition'
import { Button } from '@/components/ui/button'

/**
 * Floating microphone, anchored in the bottom-right cluster next to the
 * Coach button on every authenticated page.
 *
 * It is an input device for the Coach and nothing more. A finished
 * transcript is dispatched on the `goalslot:coach-send` bridge, which the
 * Coach quick-chat popover (or the full Coach page) picks up and pushes
 * through the exact same `coachApi.streamChat` call the typed composer
 * uses. Everything after that — the proposal parsing, the proposal card,
 * the Apply button that hits `/coach/proposals/apply` — is the existing
 * pipeline, untouched. A spoken request and a typed one are the same
 * request by the time anything can change in the database.
 *
 * Renders nothing when the browser has no Web Speech API. A microphone
 * that cannot listen is worse than no microphone at all.
 */
export function FloatingVoiceButton() {
  const pathname = usePathname() ?? ''
  // Same gate as the Coach and Journal buttons. Unlike the Coach button we
  // stay mounted on /dashboard/coach too, because the Coach page's own chat
  // section listens on the bridge there.
  if (!pathname.startsWith('/dashboard')) return null
  return <FloatingVoiceButtonInner />
}

function FloatingVoiceButtonInner() {
  const buttonRef = useRef<HTMLButtonElement | null>(null)

  const handleTranscript = useCallback((transcript: string) => {
    const { delivered, reason } = requestCoachSend(transcript)
    if (!delivered) throw new Error(reason ?? 'the Coach chat did not respond')
  }, [])

  const {
    supported,
    status,
    interimTranscript,
    finalTranscript,
    errorMessage,
    start,
    stop,
    cancel,
    reset,
    retryAfterPermissionDenied,
  } = useSpeechRecognition({ onTranscript: handleTranscript })

  const listening = status === 'listening'
  const failed = status === 'error' || status === 'permission-denied'
  const panelOpen = listening || failed

  const dismissPanel = useCallback(() => {
    if (listening) cancel()
    else reset()
  }, [cancel, listening, reset])

  // Escape and outside-click close the panel; the trigger is excluded so its
  // own onClick does the toggling instead of racing the dismiss.
  const ignoreRefs = useMemo(() => [buttonRef], [])
  const panelRef = useDismissable<HTMLDivElement>(panelOpen, dismissPanel, ignoreRefs)

  if (!supported) return null

  const handleClick = () => {
    if (status === 'processing') return
    if (listening) {
      stop()
      return
    }
    if (failed) {
      // The failure panel is showing, so the press reads as "dismiss this".
      // Retrying is the explicit button inside the panel. After a denial the
      // hook keeps its latch set even though we are back at idle, so a later
      // press re-explains rather than firing a prompt the browser will not
      // show — which is what stops this becoming a permission loop.
      reset()
      return
    }
    start()
  }

  const label = (() => {
    switch (status) {
      case 'listening':
        return 'Stop listening and send to the Coach'
      case 'processing':
        return 'Sending your request to the Coach'
      case 'success':
        return 'Sent to the Coach'
      case 'permission-denied':
        return 'Microphone blocked. Dismiss this message'
      case 'error':
        return 'Voice input failed. Dismiss this message'
      default:
        return 'Speak a request to the Coach'
    }
  })()

  const politeAnnouncement = (() => {
    switch (status) {
      case 'listening':
        return 'Listening. Speak your request, then press the button again to send it.'
      case 'processing':
        return 'Sending your request to the Coach.'
      case 'success':
        return finalTranscript
          ? `Sent to the Coach: ${finalTranscript}. The Coach will reply with a proposed change for you to review and confirm.`
          : 'Sent to the Coach.'
      default:
        return ''
    }
  })()

  return (
    <>
      {/* Interim words are intentionally kept out of the live regions: a
          screen reader re-reading every partial guess is unusable. Only the
          discrete state changes and the final transcript are announced. */}
      <span className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {politeAnnouncement}
      </span>
      <span className="sr-only" role="alert" aria-live="assertive" aria-atomic="true">
        {failed && errorMessage ? errorMessage : ''}
      </span>

      <button
        ref={buttonRef}
        id="floating-voice-trigger"
        type="button"
        onClick={handleClick}
        aria-label={label}
        title={label}
        aria-pressed={listening}
        aria-expanded={panelOpen}
        aria-busy={status === 'processing'}
        className={cn(
          'group relative inline-flex h-12 w-12 items-center justify-center rounded-full border bg-white shadow-lg transition-all',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f2cc0d] focus-visible:ring-offset-2',
          'hover:-translate-y-0.5',
          status === 'idle' && 'border-zinc-200 text-zinc-700 hover:border-[#f2cc0d] hover:text-[#8a7307]',
          listening && 'border-[#f2cc0d] bg-[#fffbea] text-[#8a7307]',
          status === 'processing' && 'border-[#f2cc0d] text-[#8a7307]',
          status === 'success' && 'border-[#f2cc0d] bg-[#fffbea] text-[#8a7307]',
          failed && 'border-rose-300 bg-rose-50 text-rose-600 hover:border-rose-400',
        )}
      >
        {listening && (
          <>
            {/* Two decorative rings so "we are recording" is legible at a
                glance and not only through colour. Suppressed for users who
                asked for reduced motion. */}
            <span
              aria-hidden
              className="absolute inset-0 rounded-full bg-[#f2cc0d]/30 motion-safe:animate-ping"
            />
            <span
              aria-hidden
              className="absolute -inset-1 rounded-full border border-[#f2cc0d]/50 motion-safe:animate-pulse"
            />
          </>
        )}
        <span className="relative inline-flex">
          {status === 'processing' ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : status === 'success' ? (
            <Check className="h-5 w-5" />
          ) : status === 'permission-denied' ? (
            <MicOff className="h-5 w-5" />
          ) : status === 'error' ? (
            <AlertTriangle className="h-5 w-5" />
          ) : listening ? (
            <Square className="h-4 w-4 fill-current" />
          ) : (
            <Mic className="h-5 w-5" />
          )}
        </span>
      </button>

      {panelOpen && (
        <div
          ref={panelRef}
          role="dialog"
          aria-label={listening ? 'Voice input' : 'Voice input problem'}
          className="fixed bottom-20 right-4 z-50 w-[min(340px,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-2xl sm:right-6"
        >
          {listening ? (
            <>
              <header className="flex items-center justify-between gap-2 border-b border-zinc-200 bg-gradient-to-br from-[#fffbea] to-white px-3 py-2.5">
                <div className="flex items-center gap-2">
                  <span className="relative inline-flex h-2 w-2">
                    <span
                      aria-hidden
                      className="absolute inline-flex h-full w-full rounded-full bg-[#f2cc0d] motion-safe:animate-ping"
                    />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-[#f2cc0d]" />
                  </span>
                  <div className="text-sm font-semibold text-zinc-900">Listening…</div>
                </div>
                <button
                  type="button"
                  onClick={cancel}
                  aria-label="Cancel voice input"
                  title="Cancel"
                  className="inline-flex h-7 w-7 items-center justify-center rounded-md text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f2cc0d]"
                >
                  <X className="h-4 w-4" />
                </button>
              </header>
              <div className="px-3 py-3">
                <p className="min-h-[2.5rem] text-[13px] leading-relaxed text-zinc-900">
                  {finalTranscript || interimTranscript ? (
                    <>
                      <span>{finalTranscript}</span>
                      {finalTranscript && interimTranscript ? ' ' : ''}
                      <span className="text-zinc-400">{interimTranscript}</span>
                    </>
                  ) : (
                    <span className="text-zinc-400">
                      Try “add a task to call the bank” or “move my study block to 7pm”.
                    </span>
                  )}
                </p>
                <p className="mt-2 text-[11px] text-zinc-500">
                  Nothing changes yet. The Coach will show you the change and you confirm it.
                </p>
              </div>
              <div className="flex items-center justify-end gap-2 border-t border-zinc-100 bg-white px-3 py-2">
                <Button type="button" variant="secondary" size="sm" onClick={cancel}>
                  Cancel
                </Button>
                <Button type="button" variant="brand" size="sm" onClick={stop}>
                  <Square className="h-3.5 w-3.5 fill-current" />
                  Stop &amp; send
                </Button>
              </div>
            </>
          ) : (
            <>
              <header className="flex items-center justify-between gap-2 border-b border-rose-100 bg-rose-50 px-3 py-2.5">
                <div className="flex items-center gap-2 text-rose-700">
                  {status === 'permission-denied' ? (
                    <MicOff className="h-4 w-4" />
                  ) : (
                    <AlertTriangle className="h-4 w-4" />
                  )}
                  <div className="text-sm font-semibold">
                    {status === 'permission-denied' ? 'Microphone blocked' : 'Voice input failed'}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={reset}
                  aria-label="Dismiss"
                  title="Dismiss"
                  className="inline-flex h-7 w-7 items-center justify-center rounded-md text-rose-500 transition-colors hover:bg-rose-100 hover:text-rose-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f2cc0d]"
                >
                  <X className="h-4 w-4" />
                </button>
              </header>
              <div className="px-3 py-3">
                <p className="text-[13px] leading-relaxed text-zinc-700">{errorMessage}</p>
              </div>
              <div className="flex items-center justify-end gap-2 border-t border-zinc-100 bg-white px-3 py-2">
                <Button type="button" variant="secondary" size="sm" onClick={reset}>
                  Dismiss
                </Button>
                <Button
                  type="button"
                  variant="brand"
                  size="sm"
                  onClick={() => {
                    if (status === 'permission-denied') {
                      // Clears the latch only. The user still has to press the
                      // mic, so a still-blocked site costs one click, not a loop.
                      retryAfterPermissionDenied()
                    } else {
                      reset()
                      start()
                    }
                  }}
                >
                  {status === 'permission-denied' ? 'I have allowed it' : 'Try again'}
                </Button>
              </div>
            </>
          )}
        </div>
      )}
    </>
  )
}
