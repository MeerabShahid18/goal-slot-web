import { useMemo } from 'react'
import { useCategoriesQuery } from '@/features/categories'
import { Goal } from '@/features/time-tracker/utils/types'
import { useTimerStore } from '@/lib/use-timer-store'

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { SearchableSelect } from '@/components/ui/searchable-select'
import { X, Clock } from 'lucide-react'

interface TimerSettingsProps {
  /** Every goal the user has. This list is never narrowed by the selected
      category — see the goal field below for why. */
  goals: Goal[]
  currentCategory: string
  currentGoalId: string
  timerState: 'STOPPED' | 'RUNNING' | 'PAUSED'
  isTaskSelected?: boolean
  onCategoryChange: (category: string) => void
  onGoalIdChange: (goalId: string) => void
}

const LABEL_CLASS = 'block text-[10px] font-semibold uppercase tracking-wider text-zinc-500'
const SELECT_TRIGGER_CLASS =
  'h-9 w-full rounded-lg border border-zinc-200 bg-white px-2.5 text-xs text-zinc-900 transition-colors hover:border-zinc-300 focus:border-[#f2cc0d] focus:outline-none focus:ring-1 focus:ring-[#f2cc0d] disabled:cursor-not-allowed disabled:opacity-50 data-[state=open]:border-[#f2cc0d]'
const HINT_CLASS = 'ml-1 text-[10px] font-normal normal-case text-zinc-400'

export function TimerSettings({
  goals,
  currentCategory,
  currentGoalId,
  timerState,
  isTaskSelected = false,
  onCategoryChange,
  onGoalIdChange,
}: TimerSettingsProps) {
  const { data: categories = [] } = useCategoriesQuery()

  const categoryOptions = useMemo(() => [
    { value: 'no_category', label: 'No Category' },
    ...categories.map((cat) => ({
      value: cat.value,
      label: cat.name,
      color: cat.color,
    }))
  ], [categories])

  const categoryNameByValue = useMemo(
    () => new Map(categories.map((cat) => [cat.value, cat.name])),
    [categories],
  )

  const selectedCategoryName = currentCategory
    ? categoryNameByValue.get(currentCategory) ?? currentCategory
    : ''

  /**
   * The goal list is deliberately NOT filtered by the selected category.
   * Filtering it used to hide goals from search entirely: pick "Learning",
   * type "deen", get "No matches", and the only way out was to notice that
   * an unrelated field was the culprit. Instead every goal stays searchable
   * and the category only influences ORDER — goals in the selected category
   * float to the top, and each option carries its own category as a hint so
   * the grouping is visible rather than implied.
   */
  const goalOptions = useMemo(() => {
    const ranked = [...goals].sort((a, b) => {
      if (!currentCategory) return 0
      const aMatch = a.category === currentCategory ? 0 : 1
      const bMatch = b.category === currentCategory ? 0 : 1
      return aMatch - bMatch
    })

    return [
      { value: 'no_goal', label: 'No Goal' },
      ...ranked.map((goal) => ({
        value: goal.id,
        label: goal.title,
        color: goal.color,
        hint: goal.category ? categoryNameByValue.get(goal.category) ?? goal.category : undefined,
      })),
    ]
  }, [goals, currentCategory, categoryNameByValue])

  const REMINDER_OPTIONS = [5, 10, 15, 20, 30, 45, 60]
  const { reminderInterval, setReminderInterval } = useTimerStore((state) => ({
    reminderInterval: state.reminderInterval || 15,
    setReminderInterval: state.setReminderInterval,
  }))

  const canClearAll = !!currentGoalId || !!currentCategory

  // The category shown is the one the selected goal carries, so label it as
  // derived instead of letting the user wonder where it came from.
  const selectedGoalCategory = goals.find((goal) => goal.id === currentGoalId)?.category
  const categoryCameFromGoal = !!currentCategory && currentCategory === selectedGoalCategory

  return (
    <div className="mx-auto mb-4 max-w-lg space-y-3 text-left">
      <div>
        <label className={`${LABEL_CLASS} mb-1`}>Reminder</label>
        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={reminderInterval.toString()}
            onValueChange={(val) => setReminderInterval(Number(val))}
            disabled={timerState === 'RUNNING'}
          >
            <SelectTrigger className={`${SELECT_TRIGGER_CLASS} sm:w-56`}>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-zinc-500" />
                <SelectValue />
              </div>
            </SelectTrigger>
            <SelectContent>
              {REMINDER_OPTIONS.map((min) => (
                <SelectItem key={min} value={min.toString()}>
                  Every {min} minutes
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {canClearAll && (
            <button
              type="button"
              onClick={() => {
                onGoalIdChange('')
                onCategoryChange('')
              }}
              className="inline-flex h-9 items-center gap-1.5 rounded-md border border-zinc-200 bg-white px-2.5 text-xs font-medium text-zinc-600 transition-colors hover:border-zinc-300 hover:text-zinc-900"
            >
              <X className="h-3.5 w-3.5" />
              Clear goal & category
            </button>
          )}
        </div>
      </div>

      {/* Goal sits above Category. The goal is the primary choice — it is the
          thing the user actually has in mind — and picking one fills in the
          category for them. Category is the derived, secondary field. */}
      <div className="space-y-3">
        <div>
          <div className="mb-1.5 flex items-baseline justify-between gap-2">
            <label className={LABEL_CLASS}>
              Link to goal
              {isTaskSelected && currentGoalId && <span className={HINT_CLASS}>(from task)</span>}
            </label>
          </div>
          <div className="relative">
            {currentGoalId && (
              <button
                type="button"
                onClick={() => onGoalIdChange('')}
                className="absolute right-2 top-1/2 z-10 -translate-y-1/2 rounded-full p-1 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-700"
                aria-label="Clear goal"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
            <SearchableSelect
              value={currentGoalId || 'no_goal'}
              onChange={(val) => onGoalIdChange(val === 'no_goal' ? '' : val)}
              options={goalOptions}
              placeholder="Select goal"
              triggerClassName="pr-8"
              emptyMessage="No goals yet — create one from the Goals page."
              emptyHint={`Searched all ${goals.length} ${goals.length === 1 ? 'goal' : 'goals'}, not just ${
                selectedCategoryName || 'the selected category'
              }.`}
              notice={
                selectedCategoryName ? (
                  <span className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
                    <span>
                      All goals searchable · <strong className="font-semibold text-zinc-700">{selectedCategoryName}</strong>{' '}
                      shown first
                    </span>
                    <button
                      type="button"
                      onClick={() => onCategoryChange('')}
                      className="font-semibold text-zinc-600 underline underline-offset-2 hover:text-zinc-900"
                    >
                      Clear category
                    </button>
                  </span>
                ) : undefined
              }
            />
          </div>
        </div>

        <div>
          <div className="mb-1.5 flex items-baseline justify-between gap-2">
            <label className={LABEL_CLASS}>
              Category
              {categoryCameFromGoal ? (
                <span className={HINT_CLASS}>(from goal)</span>
              ) : (
                isTaskSelected && currentCategory && <span className={HINT_CLASS}>(from task)</span>
              )}
            </label>
          </div>
          <div className="relative">
            {currentCategory && (
              <button
                type="button"
                onClick={() => onCategoryChange('')}
                className="absolute right-2 top-1/2 z-10 -translate-y-1/2 rounded-full p-1 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-700"
                aria-label="Clear category"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
            <SearchableSelect
              value={currentCategory || 'no_category'}
              onChange={(val) => onCategoryChange(val === 'no_category' ? '' : val)}
              options={categoryOptions}
              placeholder="Select category"
              triggerClassName="pr-8"
              emptyMessage="No categories yet — add one in Settings."
            />
          </div>
        </div>
      </div>
    </div>
  )
}
