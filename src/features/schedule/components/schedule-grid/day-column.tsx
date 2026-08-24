'use client'

import { type PointerEvent } from 'react'

import { DAY_START_MIN, HOURS } from '@/features/schedule/utils/constants'
import { useDroppable } from '@dnd-kit/core'

type DayColumnProps = {
  dayOfWeek: number
  children: React.ReactNode
  // Density-derived pixel scale, computed once in ScheduleGrid via
  // getPxPerMin/getColumnHeight and passed down so this column's hour
  // gridlines line up with the blocks it renders and with the pointer
  // math in ScheduleGrid's handlePointerDown/Move.
  pxPerMin: number
  columnHeight: number
  onPointerDown: (day: number, event: PointerEvent<HTMLDivElement>) => void
  onPointerMove: (event: PointerEvent<HTMLDivElement>) => void
  onPointerUp: (event: PointerEvent<HTMLDivElement>) => void
}

export function DayColumn({
  dayOfWeek,
  children,
  pxPerMin,
  columnHeight,
  onPointerDown,
  onPointerMove,
  onPointerUp,
}: DayColumnProps) {
  const { setNodeRef } = useDroppable({
    id: `day-${dayOfWeek}`,
    data: { day: dayOfWeek },
  })

  return (
    <div
      ref={setNodeRef}
      className="relative border-l border-zinc-200 bg-white"
      style={{ height: columnHeight }}
      onPointerDown={(event) => onPointerDown(dayOfWeek, event)}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      data-day={dayOfWeek}
    >
      {HOURS.map((hour) => {
        const top = (hour * 60 - DAY_START_MIN) * pxPerMin
        return (
          <div key={hour} className="absolute left-0 right-0 border-t border-dashed border-zinc-100" style={{ top }} />
        )
      })}

      {children}
    </div>
  )
}
