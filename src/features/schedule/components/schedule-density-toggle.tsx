'use client'

import { ScheduleDensity } from '@/features/schedule/utils/types'
import { Columns2, Columns3 } from 'lucide-react'

import { cn } from '@/lib/utils'

const DENSITY_OPTIONS: Array<{ value: ScheduleDensity; label: string; icon: typeof Columns2 }> = [
  { value: 'comfortable', label: 'Comfortable', icon: Columns2 },
  { value: 'compact', label: 'Compact', icon: Columns3 },
]

export interface ScheduleDensityToggleProps {
  value: ScheduleDensity
  onChange: (value: ScheduleDensity) => void
  className?: string
}

// Small segmented control for the schedule grid's column-width preference.
// Mirrors the ViewGranularityTabs pill pattern (bg-zinc-100 track, white
// pill on the active option) but sized to h-8 so it sits flush with the
// other sm-size controls in the schedule page's header actions row.
export function ScheduleDensityToggle({ value, onChange, className }: ScheduleDensityToggleProps) {
  return (
    <div
      role="group"
      aria-label="Schedule grid density"
      className={cn('flex h-8 items-center gap-0.5 rounded-lg bg-zinc-100 p-0.5', className)}
    >
      {DENSITY_OPTIONS.map((option) => {
        const Icon = option.icon
        const isActive = value === option.value
        return (
          <button
            key={option.value}
            type="button"
            title={option.label}
            aria-pressed={isActive}
            onClick={() => onChange(option.value)}
            className={cn(
              'flex h-full items-center gap-1 rounded-md px-2 text-xs font-semibold transition-all',
              isActive ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-900',
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{option.label}</span>
          </button>
        )
      })}
    </div>
  )
}
