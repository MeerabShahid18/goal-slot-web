/**
 * Time entries can be started with nothing filled in — no task, no goal, no
 * category — so the title is resolved at save time rather than at start time.
 *
 * `taskName` is a required column on the backend and reports group/label by it
 * (`entry.taskName.trim()`), so an empty string would render as a blank row
 * everywhere instead of an honest "unattributed session". Everything that
 * persists a time entry should funnel its title through `resolveEntryTitle`.
 */
export const UNTITLED_ENTRY_TITLE = 'Untitled session'

export function resolveEntryTitle(...candidates: (string | null | undefined)[]): string {
  for (const candidate of candidates) {
    const trimmed = candidate?.trim()
    if (trimmed) return trimmed
  }
  return UNTITLED_ENTRY_TITLE
}
