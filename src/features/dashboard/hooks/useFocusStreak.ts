'use client'

import { TimeEntry } from '@/features/time-tracker/utils/types'
import { useQuery } from '@tanstack/react-query'

import { timeEntriesApi } from '@/lib/api'

export const DAILY_STREAK_GOAL = 30

const STREAK_LOOKBACK_DAYS = 366

type StreakTimeEntry = TimeEntry & {
  durationMinutes?: number
}

interface FocusStreakResult {
  currentStreak: number
  bestStreak: number
  todayMinutesTracked: number
  dailyGoalMinutes: number
  todayProgressPercent: number
  minutesRemainingToday: number
  showMotivation: boolean
  motivationalMessage?: string
  isPending: boolean
  isError: boolean
}

const toDateKey = (date: Date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const addDays = (date: Date, days: number) => {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

const entryDateKey = (date: string) => date.slice(0, 10)

const entryMinutes = (entry: StreakTimeEntry) => {
  if (typeof entry.durationMinutes === 'number' && Number.isFinite(entry.durationMinutes)) {
    return entry.durationMinutes
  }

  return Number.isFinite(entry.duration) ? entry.duration : 0
}

const buildDailyTotals = (entries: StreakTimeEntry[]) => {
  const dailyTotals = new Map<string, number>()

  for (const entry of entries) {
    if (!entry.date) continue

    const key = entryDateKey(entry.date)
    dailyTotals.set(key, (dailyTotals.get(key) ?? 0) + entryMinutes(entry))
  }

  return dailyTotals
}

const calculateCurrentStreak = (successfulDays: Set<string>, today: Date) => {
  let streak = 0
  let cursor = new Date(today)

  // Check if today is a successful day and count it
  if (successfulDays.has(toDateKey(cursor))) {
    streak = 1
    cursor = addDays(cursor, -1)
  } else {
    // Today is not successful yet, start counting from yesterday
    cursor = addDays(cursor, -1)
  }

  // Count consecutive successful days backwards
  while (successfulDays.has(toDateKey(cursor))) {
    streak += 1
    cursor = addDays(cursor, -1)
  }

  return streak
}

const calculateBestStreak = (successfulDays: Set<string>) => {
  let bestStreak = 0
  let currentStreak = 0
  const sortedDays = Array.from(successfulDays).sort()
  let previousDay: Date | null = null

  for (const dayKey of sortedDays) {
    const currentDay = new Date(`${dayKey}T00:00:00`)
    const expectedPreviousKey = previousDay ? toDateKey(addDays(previousDay, 1)) : null

    currentStreak = expectedPreviousKey === dayKey ? currentStreak + 1 : 1
    bestStreak = Math.max(bestStreak, currentStreak)
    previousDay = currentDay
  }

  return bestStreak
}

const fetchFocusStreakEntries = async (): Promise<StreakTimeEntry[]> => {
  const today = new Date()
  const startDate = toDateKey(addDays(today, -STREAK_LOOKBACK_DAYS))
  const endDate = toDateKey(today)
  const res = await timeEntriesApi.getByRange(startDate, endDate)

  return Array.isArray(res.data) ? res.data : []
}

export function useFocusStreak(): FocusStreakResult {
  const query = useQuery({
    queryKey: ['dashboard', 'focus-streak'],
    queryFn: fetchFocusStreakEntries,
    staleTime: 2 * 60 * 1000,
    placeholderData: (previousData) => previousData,
  })

  const today = new Date()
  const todayKey = toDateKey(today)
  const entries = query.data ?? []
  const dailyTotals = buildDailyTotals(entries)
  const successfulDays = new Set(
    Array.from(dailyTotals.entries())
      .filter(([, minutes]) => minutes >= DAILY_STREAK_GOAL)
      .map(([date]) => date),
  )

  const todayMinutesTracked = dailyTotals.get(todayKey) ?? 0
  const minutesRemainingToday = Math.max(DAILY_STREAK_GOAL - todayMinutesTracked, 0)
  const showMotivation = minutesRemainingToday > 0 && minutesRemainingToday <= 5

  return {
    currentStreak: calculateCurrentStreak(successfulDays, today),
    bestStreak: calculateBestStreak(successfulDays),
    todayMinutesTracked,
    dailyGoalMinutes: DAILY_STREAK_GOAL,
    todayProgressPercent: Math.min((todayMinutesTracked / DAILY_STREAK_GOAL) * 100, 100),
    minutesRemainingToday,
    showMotivation,
    motivationalMessage: showMotivation
      ? `Only ${minutesRemainingToday} minutes left to keep your streak alive 🔥`
      : undefined,
    isPending: query.isPending,
    isError: query.isError,
  }
}
