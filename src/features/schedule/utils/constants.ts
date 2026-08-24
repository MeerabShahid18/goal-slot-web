import { ScheduleDensity } from '@/features/schedule/utils/types'

export const DAY_START_MIN = 0
export const DAY_END_MIN = 24 * 60
export const SLOT_MIN = 15
// Allow 15-min blocks (smallest the slot grid supports). Used to be 30 which
// prevented short transitional blocks like a 15-min midday walk from being
// rendered without overlapping the next adjacent block.
export const MIN_DURATION = 15
export const HOURS = Array.from({ length: 24 }, (_, i) => i)

// Per-minute pixel scale, keyed by grid density. This is the ONE place that
// maps density -> scale: every consumer that renders block position/height
// or converts pointer pixels back to minutes-of-day (drag-to-create,
// drag-to-move, resize) must read through getPxPerMin() rather than
// hardcoding its own multiplier. If any consumer drifts from this scale,
// dragging/resizing will visually desync from where a block actually gets
// created or moved to.
//
// 'compact' keeps the original 1:1 scale (a 15-min block renders 15px
// tall) — unchanged from before density existed. 'comfortable' scales up
// 1.5x, giving short blocks meaningfully more vertical room for their
// title/task-list content without ballooning the column's total scroll
// height (24h is ~1440px at compact, ~2160px at comfortable — not a
// doubling).
const PX_PER_MIN_COMPACT = 1
const PX_PER_MIN_COMFORTABLE = 1.5

export function getPxPerMin(density: ScheduleDensity): number {
  return density === 'comfortable' ? PX_PER_MIN_COMFORTABLE : PX_PER_MIN_COMPACT
}

// Total scrollable height of a day column for the full 24h day, scaled to
// the active density's per-minute pixel scale.
export function getColumnHeight(density: ScheduleDensity): number {
  return (DAY_END_MIN - DAY_START_MIN) * getPxPerMin(density)
}
