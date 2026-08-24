import { DAY_START_MIN } from '@/features/schedule/utils/constants'
import { DraftSelection } from '@/features/schedule/utils/types'

type DraftBlockProps = {
  selection: DraftSelection
  // Density-derived pixel scale from ScheduleGrid (getPxPerMin), so this
  // live drag-preview always tracks the same scale as the real blocks and
  // the pointer math that produced `selection`.
  pxPerMin: number
}

export function DraftBlock({ selection, pxPerMin }: DraftBlockProps) {
  const top = (selection.start - DAY_START_MIN) * pxPerMin
  const height = (selection.end - selection.start) * pxPerMin
  return (
    <div
      className="pointer-events-none absolute left-2 right-2 rounded-sm border-2 border-dashed border-secondary bg-primary/30"
      style={{ top, height }}
    />
  )
}
