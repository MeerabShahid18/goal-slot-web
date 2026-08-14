import type { QueryClient } from '@tanstack/react-query'

import { coachApi } from '@/lib/api'
import { escapeHtml } from '@/lib/escape-html'

/**
 * Shared by every producer of a short, unreviewed snippet destined for
 * today's journal entry — the quick-jot popover (FloatingJournalButton) and
 * the voice fast path's APPEND_JOURNAL action (use-voice-fast-path.ts) — so
 * "add this to my journal" appends the same way whether typed or spoken.
 */

function todayKey(): string {
  const d = new Date()
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

function textToParagraphs(text: string): string {
  return text
    .trim()
    .split(/\n{2,}/)
    .map((para) => `<p>${escapeHtml(para).replace(/\n/g, '<br />')}</p>`)
    .join('')
}

/**
 * Appends a snippet of plain text to today's journal entry as its own
 * timestamped block, creating the entry if none exists yet. Never
 * overwrites — `coachApi.getJournalEntry` 404s when there's no entry yet,
 * which just means the upsert below creates one instead of updating.
 */
export async function appendToTodayJournal(queryClient: QueryClient, snippet: string): Promise<void> {
  const date = todayKey()
  let existing = ''
  try {
    const res = await coachApi.getJournalEntry(date)
    existing = res.data?.content ?? ''
  } catch {
    // No entry yet; that's fine, the upsert below creates one.
  }
  const stamp = new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
  const newHtml = `${existing}<p><strong>${escapeHtml(stamp)}</strong></p>${textToParagraphs(snippet)}`
  if (!existing) {
    await coachApi.upsertJournalEntry({ date, content: newHtml })
  } else {
    await coachApi.updateJournalContent(date, newHtml)
  }
  queryClient.invalidateQueries({ queryKey: ['coach', 'journal', 'entries'] })
}
