'use client'

import { useEffect } from 'react'
import toast from 'react-hot-toast'

import { useFocusStreak } from '@/features/dashboard/hooks/useFocusStreak'
import { DashboardStats as DashboardStatsType } from '@/features/dashboard/utils/types'
import { CheckSquare, Clock, Target, TrendingUp } from 'lucide-react'

import { formatDuration } from '@/lib/utils'
import { GlassCard } from '@/components/ui/glass-card'
import { StatCard } from '@/components/ui/stat-card'

interface DashboardStatsProps {
  stats?: DashboardStatsType
}

export function DashboardStats({ stats }: DashboardStatsProps) {
  const focusStreak = useFocusStreak()

  // Show motivational toast when within 5 minutes of daily goal
  useEffect(() => {
    if (focusStreak.showMotivation && focusStreak.motivationalMessage) {
      toast(focusStreak.motivationalMessage, {
        duration: 4000,
        icon: '🔥',
      })
    }
  }, [focusStreak.showMotivation, focusStreak.motivationalMessage])

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
      <GlassCard padded={false} className="flex flex-col gap-3 p-4">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Focus Streak</span>
          <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-yellow-200 bg-yellow-50 text-sm">
            🔥
          </span>
        </div>

        <div>
          <div className="flex items-baseline gap-2">
            <span className="text-xl leading-none">🔥</span>
            <span className="text-2xl font-bold tabular-nums text-[#f2cc0d]">{focusStreak.currentStreak}</span>
          </div>
          <div className="mt-1 text-xs text-zinc-500">
            {focusStreak.currentStreak >= 1 ? 'Current Streak' : 'New streak starts today'}
          </div>
        </div>

        <div className="space-y-2 text-xs text-zinc-500">
          <div>Best: {focusStreak.bestStreak} days</div>
          <div>
            {focusStreak.todayMinutesTracked} / {focusStreak.dailyGoalMinutes} min today
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-zinc-100">
            <div
              className="h-full rounded-full bg-[#f2cc0d] transition-[width] duration-300"
              style={{ width: `${focusStreak.todayProgressPercent}%` }}
            />
          </div>
        </div>
      </GlassCard>
      <StatCard
        label="Today's Focus"
        value={formatDuration(stats?.todayMinutes ?? 0)}
        icon={<Clock />}
        accent="brand"
      />
      <StatCard
        label="Weekly Total"
        value={formatDuration(stats?.weeklyMinutes ?? 0)}
        icon={<TrendingUp />}
        accent="neutral"
      />
      <StatCard label="Active Goals" value={stats?.activeGoals ?? 0} icon={<Target />} accent="success" />
      <StatCard label="Tasks Logged" value={stats?.tasksLogged ?? 0} icon={<CheckSquare />} accent="warning" />
    </div>
  )
}
