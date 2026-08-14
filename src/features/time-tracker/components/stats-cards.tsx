import { memo, useMemo } from 'react'

import { TimeEntry } from '@/features/time-tracker/utils/types'
import { History, Target, Timer } from 'lucide-react'

import { formatDuration } from '@/lib/utils'
import { StatCard } from '@/components/ui/stat-card'

interface StatsCardsProps {
  recentEntries: TimeEntry[]
}

// This card lives on the time-tracker page, which re-renders every second
// while a timer is running. `recentEntries` is a react-query result that
// keeps a stable reference between ticks (structural sharing), so memo
// skips re-rendering this component on ticks where it's unchanged, and
// useMemo skips recomputing the filter/reduce below on the renders where
// it does run for an unrelated reason.
function StatsCardsImpl({ recentEntries }: StatsCardsProps) {
  const { todayEntries, todayTotalMinutes } = useMemo(() => {
    const today = new Date().toISOString().split('T')[0]
    const normalizeDate = (date: string) => date.split('T')[0]
    const entries = recentEntries.filter((e) => normalizeDate(e.date) === today)
    return { todayEntries: entries, todayTotalMinutes: entries.reduce((sum, e) => sum + e.duration, 0) }
  }, [recentEntries])

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
      <StatCard label="Today's Total" value={formatDuration(todayTotalMinutes)} icon={<Timer />} accent="neutral" />
      <StatCard label="Tasks Today" value={todayEntries.length} icon={<Target />} accent="brand" />
      <StatCard label="Last 7 Days" value={recentEntries.length} icon={<History />} accent="neutral" />
    </div>
  )
}

export const StatsCards = memo(StatsCardsImpl)
