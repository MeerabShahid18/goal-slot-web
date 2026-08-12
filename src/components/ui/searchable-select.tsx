'use client'

import { useEffect, useMemo, useRef, useState } from 'react'

import { Check, ChevronsUpDown, Search } from 'lucide-react'
import { RemoveScroll } from 'react-remove-scroll'

import { cn } from '@/lib/utils'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

export interface SearchableOption {
  value: string
  label: string
  /** Optional small caption shown under the label (e.g. "DEEP_WORK"). */
  hint?: string
  /** Optional 6-char hex color to render as a leading dot. */
  color?: string
}

interface SearchableSelectProps {
  options: SearchableOption[]
  value: string
  onChange: (next: string) => void
  placeholder?: string
  /** Shown when the option list itself is empty (nothing to choose from). */
  emptyMessage?: string
  /**
   * Extra sentence appended to the "no matches for X" state that explains what
   * was searched — e.g. "Searched all 24 goals." An empty dropdown should never
   * leave the user guessing whether something is being filtered out.
   */
  emptyHint?: string
  /**
   * Escape hatch offered next to "Clear search" when a search comes back empty.
   * Use it whenever the caller narrows `options` itself, so the user can undo
   * that narrowing from inside the dropdown.
   */
  emptyAction?: { label: string; onClick: () => void }
  /**
   * Rendered between the search box and the option list. Use it to make any
   * caller-side filtering or ordering visible rather than silently changing
   * what the user can find.
   */
  notice?: React.ReactNode
  disabled?: boolean
  className?: string
  triggerClassName?: string
  triggerStyle?: React.CSSProperties
}

/**
 * Type-to-filter dropdown built on Popover. No new deps (no cmdk yet).
 * Drop-in replacement for shadcn Select on long lists where the user
 * wants to type to narrow the choices (categories, goals, tasks, etc).
 */
export function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = 'Select...',
  emptyMessage = 'Nothing to choose from yet.',
  emptyHint,
  emptyAction,
  notice,
  disabled = false,
  className,
  triggerClassName,
  triggerStyle,
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [focusedIndex, setFocusedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement | null>(null)
  const listRef = useRef<HTMLUListElement | null>(null)

  const selected = options.find((o) => o.value === value)
  const trimmedQuery = query.trim()

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return options
    return options.filter(
      (o) =>
        o.label.toLowerCase().includes(q) ||
        o.value.toLowerCase().includes(q) ||
        o.hint?.toLowerCase().includes(q),
    )
  }, [options, query])

  // Reset keyboard selection index when filtered choices change or popover opens
  useEffect(() => {
    setFocusedIndex(0)
  }, [filtered, open])

  // Auto-focus the search input when the popover opens
  useEffect(() => {
    if (open) {
      setQuery('')
      requestAnimationFrame(() => inputRef.current?.focus())
    }
  }, [open])

  // Scroll active/highlighted item into view if needed
  useEffect(() => {
    if (open && listRef.current && focusedIndex >= 0) {
      const activeEl = listRef.current.children[focusedIndex] as HTMLElement
      if (activeEl) {
        activeEl.scrollIntoView({ block: 'nearest' })
      }
    }
  }, [focusedIndex, open])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (filtered.length === 0) return

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setFocusedIndex((prev) => (prev + 1) % filtered.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setFocusedIndex((prev) => (prev - 1 + filtered.length) % filtered.length)
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const option = filtered[focusedIndex]
      if (option) {
        onChange(option.value)
        setOpen(false)
      }
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  return (
    <div className={className}>
      <Popover open={open} onOpenChange={(o) => !disabled && setOpen(o)}>
        <PopoverTrigger asChild>
          <button
            type="button"
            disabled={disabled}
            className={cn(
              'flex h-10 w-full items-center justify-between gap-2 rounded-lg border border-zinc-200 bg-white px-3 text-left text-sm transition-colors hover:border-zinc-300 focus:border-[#f2cc0d] focus:outline-none focus:ring-1 focus:ring-[#f2cc0d] disabled:cursor-not-allowed disabled:opacity-50',
              triggerClassName,
            )}
            style={triggerStyle}
            aria-haspopup="listbox"
            aria-expanded={open}
          >
            <span className="flex min-w-0 items-center gap-2">
              {selected?.color && (
                <span
                  aria-hidden
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ background: selected.color }}
                />
              )}
              <span className={cn('truncate', !selected && 'text-zinc-400')}>
                {selected?.label ?? placeholder}
              </span>
            </span>
            <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 text-zinc-400" />
          </button>
        </PopoverTrigger>
        <PopoverContent
          className="z-50 w-[--radix-popover-trigger-width] p-0"
          align="start"
        >
          <div className="border-b border-zinc-100 p-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Search..."
                className="h-8 w-full rounded-md border border-zinc-200 bg-white pl-8 pr-2 text-xs text-zinc-900 placeholder:text-zinc-400 focus:border-[#f2cc0d] focus:outline-none focus:ring-1 focus:ring-[#f2cc0d]"
              />
            </div>
          </div>
          {notice && (
            /* A control in the notice usually unmounts the notice itself (it
               undoes the thing the notice is announcing). Pull focus back to
               the search box so it never lands on <body>, which would leave
               Escape unhandled and the popover stuck open. */
            <div
              className="border-b border-zinc-100 bg-zinc-50 px-3 py-1.5 text-[10px] leading-tight text-zinc-500"
              onClick={() => requestAnimationFrame(() => inputRef.current?.focus())}
            >
              {notice}
            </div>
          )}
          {/* RemoveScroll gives this list its own scroll-allow region. Without
              it, when the select is opened inside a Dialog (e.g. the schedule
              block editor), the Dialog's scroll lock blocks touch-scrolling the
              options on mobile — the list simply wouldn't scroll on a phone.
              This mirrors how Radix Select stays scrollable inside a dialog. */}
          <RemoveScroll allowPinchZoom removeScrollBar={false}>
            <ul ref={listRef} className="max-h-64 overflow-y-auto overscroll-contain py-1" role="listbox">
            {filtered.length === 0 ? (
              /* Never dead-end on a bare "No matches." — say what was searched
                 and give the user a way back to a non-empty list. */
              <li className="px-3 py-2.5">
                {trimmedQuery ? (
                  <div className="space-y-2">
                    <p className="text-xs text-zinc-600">
                      No matches for{' '}
                      <span className="font-semibold text-zinc-900">&ldquo;{trimmedQuery}&rdquo;</span>.
                      {emptyHint ? <span className="text-zinc-500"> {emptyHint}</span> : null}
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          setQuery('')
                          inputRef.current?.focus()
                        }}
                        className="rounded-md border border-zinc-200 bg-white px-2 py-1 text-[11px] font-medium text-zinc-700 transition-colors hover:border-zinc-300 hover:bg-zinc-50"
                      >
                        Clear search
                      </button>
                      {emptyAction && (
                        <button
                          type="button"
                          onClick={() => {
                            emptyAction.onClick()
                            setQuery('')
                            inputRef.current?.focus()
                          }}
                          className="rounded-md border border-zinc-200 bg-white px-2 py-1 text-[11px] font-medium text-zinc-700 transition-colors hover:border-zinc-300 hover:bg-zinc-50"
                        >
                          {emptyAction.label}
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-zinc-500">{emptyMessage}</p>
                )}
              </li>
            ) : (
              filtered.map((option, index) => {
                const isSel = option.value === value
                const isFocused = index === focusedIndex
                return (
                  <li key={option.value}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={isSel}
                      onClick={() => {
                        onChange(option.value)
                        setOpen(false)
                      }}
                      onMouseEnter={() => setFocusedIndex(index)}
                      className={cn(
                        'flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm transition-colors hover:bg-zinc-50',
                        isFocused && !isSel && 'bg-zinc-100',
                        isSel && 'bg-[#fff7d1]',
                      )}
                    >
                      {option.color && (
                        <span
                          aria-hidden
                          className="h-2 w-2 shrink-0 rounded-full"
                          style={{ background: option.color }}
                        />
                      )}
                      <span className="flex min-w-0 flex-1 flex-col leading-tight">
                        <span className="truncate text-zinc-900">{option.label}</span>
                        {option.hint && (
                          <span className="truncate text-[10px] text-zinc-400">
                            {option.hint}
                          </span>
                        )}
                      </span>
                      {isSel && <Check className="h-3.5 w-3.5 shrink-0 text-[#8a7307]" />}
                    </button>
                  </li>
                )
              })
            )}
            </ul>
          </RemoveScroll>
        </PopoverContent>
      </Popover>
    </div>
  )
}
