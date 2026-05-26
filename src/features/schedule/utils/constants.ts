export const DAY_START_MIN = 0
export const DAY_END_MIN = 24 * 60
export const SLOT_MIN = 15
export const PX_PER_MIN = 1
export const MIN_DURATION = 30
export const HOURS = Array.from(
  { length: (DAY_END_MIN - DAY_START_MIN) / 60 },
  (_, i) => i + DAY_START_MIN / 60
)
export const COLUMN_HEIGHT = (DAY_END_MIN - DAY_START_MIN) * PX_PER_MIN
