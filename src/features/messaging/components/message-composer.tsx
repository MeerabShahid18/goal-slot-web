'use client'

import { FormEvent, KeyboardEvent, useCallback, useEffect, useRef, useState } from 'react'

import { Send } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'

const MAX_MESSAGE_LENGTH = 4000
const MAX_COMPOSER_HEIGHT_PX = 128

interface MessageComposerProps {
  conversationName: string
  disabled?: boolean
  disabledReason?: string
  isSending?: boolean
  /** Resolves false when the send failed, so the draft can be handed back. */
  onSend: (body: string) => Promise<boolean>
}

export function MessageComposer({
  conversationName,
  disabled = false,
  disabledReason,
  isSending = false,
  onSend,
}: MessageComposerProps) {
  const [value, setValue] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Grow with the content up to a cap, then scroll inside the field.
  const resize = useCallback(() => {
    const element = textareaRef.current
    if (!element) return
    element.style.height = 'auto'
    element.style.height = `${Math.min(element.scrollHeight, MAX_COMPOSER_HEIGHT_PX)}px`
  }, [])

  useEffect(() => {
    resize()
  }, [resize, value])

  const submit = useCallback(async () => {
    const body = value.trim()
    if (!body || disabled || isSending) return

    setValue('')
    const sent = await onSend(body)
    // Rollback is handled in the cache by the mutation; here we just give the
    // user their text back so a failed send is not lost work.
    if (!sent) setValue(body)
    textareaRef.current?.focus()
  }, [disabled, isSending, onSend, value])

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    void submit()
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    // Enter sends, Shift+Enter inserts a newline. IME composition must not be
    // interrupted mid-word.
    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault()
      void submit()
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-end gap-2 border-t border-zinc-200 bg-white p-3">
      <label htmlFor="message-composer" className="sr-only">
        Message {conversationName}
      </label>

      <div className="min-w-0 flex-1">
        <Textarea
          id="message-composer"
          ref={textareaRef}
          rows={1}
          value={value}
          maxLength={MAX_MESSAGE_LENGTH}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          placeholder={disabled ? disabledReason || 'Messaging unavailable' : `Message ${conversationName}...`}
          aria-describedby="message-composer-hint"
          // text-base on mobile stops iOS Safari zooming the page on focus.
          className="max-h-32 min-h-[38px] py-2 text-base sm:text-sm"
        />
      </div>

      <Button type="submit" variant="brand" disabled={disabled || isSending || !value.trim()} className="shrink-0 px-3">
        <Send className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Send</span>
        <span className="sr-only sm:hidden">Send message</span>
      </Button>

      <p id="message-composer-hint" className="sr-only">
        Press Enter to send, Shift plus Enter for a new line.
      </p>
    </form>
  )
}
