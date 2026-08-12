'use client'


import { useEffect, useMemo, useState } from 'react'

import { useSearchParams } from 'next/navigation'
import { useCategoriesQuery } from '@/features/categories'
import { ManualEntryModal } from '@/features/time-tracker/components/manual-entry-modal'
import { RecentEntries } from '@/features/time-tracker/components/recent-entries'
import { StatsCards } from '@/features/time-tracker/components/stats-cards'
import { StopTimerModal } from '@/features/time-tracker/components/stop-timer-modal'
import { TaskSelector } from '@/features/time-tracker/components/task-selector'
import { TimerControls } from '@/features/time-tracker/components/timer-controls'
import { TimerDisplay } from '@/features/time-tracker/components/timer-display'
import { TimerSettings } from '@/features/time-tracker/components/timer-settings'
import { useCreateTimeEntry } from '@/features/time-tracker/hooks/use-time-tracker-mutations'
import { useTimeTrackerData } from '@/features/time-tracker/hooks/use-time-tracker-queries'
import { useTimer } from '@/features/time-tracker/hooks/use-timer'
import { resolveEntryTitle } from '@/features/time-tracker/utils/entry-title'
import { findScheduleBlockForDateTime } from '@/features/time-tracker/utils/schedule'
import {
  getCategoryFromGoal,
  sortTasksBySelection,
} from '@/features/time-tracker/utils/selection-helpers'
import { Goal, Task } from '@/features/time-tracker/utils/types'
import { useUpdateTaskMutation } from '@/features/tasks/hooks/use-tasks-mutations'
import { useQueryClient } from '@tanstack/react-query'
import { Plus } from 'lucide-react'
import { toast } from 'react-hot-toast'

import { tasksApi } from '@/lib/api'
import { formatDuration, getLocalDateString } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { GlassCard } from '@/components/ui/glass-card'
import { PageHeader } from '@/components/ui/page-header'
import { PageShell } from '@/components/ui/page-shell'

export function TimeTrackerPage() {
  const {
    timerState,
    elapsedTime,
    currentTask,
    currentTaskId,
    currentCategory,
    currentGoalId,
    currentScheduleBlockId,
    setTask,
    setTaskId,
    setCategory,
    setGoalId,
    setScheduleBlockId,
    start,
    pause,
    resume,
    reset,
    setElapsedTime,
    startTimestamp,
  } = useTimer()

  const { goals, tasks, recentEntries, weeklySchedule } = useTimeTrackerData()
  const { data: categories = [] } = useCategoriesQuery()
  const createEntry = useCreateTimeEntry()
  const updateTask = useUpdateTaskMutation()
  const queryClient = useQueryClient()
  const [showManualEntry, setShowManualEntry] = useState(false)
  const [showStopModal, setShowStopModal] = useState(false)
  const [manualCategory, setManualCategory] = useState(false)
  const [manualGoal, setManualGoal] = useState(false)
  const [manualSchedule, setManualSchedule] = useState(false)

  // Open the Manual Entry modal directly when the user clicked "+ Log time"
  // from the persistent header shortcut (which navigates here with ?action=manual).
  const searchParams = useSearchParams()
  useEffect(() => {
    if (searchParams?.get('action') === 'manual') {
      setShowManualEntry(true)
    }
  }, [searchParams])

  useEffect(() => {
    if (!weeklySchedule) return

    const now = new Date()
    const activeBlock = findScheduleBlockForDateTime(weeklySchedule, now)

    if (!activeBlock) {
      if (timerState === 'STOPPED') {
        setScheduleBlockId('')
      }
      return
    }

    if (!manualSchedule && (!currentScheduleBlockId || timerState === 'STOPPED')) {
      setScheduleBlockId(activeBlock.id)
    }

    if (
      !manualGoal &&
      (timerState === 'STOPPED' || !currentGoalId) &&
      activeBlock.goalId &&
      currentGoalId !== activeBlock.goalId
    ) {
      setGoalId(activeBlock.goalId)
      setManualGoal(false)
    }

    if (
      !manualCategory &&
      (timerState === 'STOPPED' || !currentCategory) &&
      activeBlock.category &&
      currentCategory !== activeBlock.category
    ) {
      setCategory(activeBlock.category)
      setManualCategory(false)
    }
  }, [
    weeklySchedule,
    timerState,
    currentScheduleBlockId,
    currentGoalId,
    currentCategory,
    manualSchedule,
    manualGoal,
    manualCategory,
    setScheduleBlockId,
    setGoalId,
    setCategory,
  ])

  const handleCreateTask = async (title: string): Promise<Task | null> => {
    try {
      // Only pre-link to a goal/category when the user has explicitly chosen
      // them. The schedule-block auto-bind sets currentGoalId silently from
      // whatever block is active right now, and inheriting that into a new
      // task created mid-session is what produces "I picked an OloStep task
      // but it's showing Core Engineering Study as the goal" later. Manual
      // picks are tracked via manualGoal / manualCategory.
      const response = await tasksApi.create({
        title,
        goalId: manualGoal && currentGoalId ? currentGoalId : undefined,
        category: manualCategory && currentCategory ? currentCategory : undefined,
      })

      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      queryClient.invalidateQueries({ queryKey: ['time-tracker'] })

      toast.success(`Task "${title}" created!`)

      if (response.data.goalId) {
        setGoalId(response.data.goalId)
      }

      return response.data as Task
    } catch {
      toast.error('Failed to create task')
      return null
    }
  }

  const handleTaskChange = (taskId: string) => {
    setTaskId(taskId)
    if (taskId) {
      const task = tasks.find((t: Task) => t.id === taskId)
      if (task) {
        setTask(task.title)
        // Only pull goal / category from the task when the user hasn't
        // already chosen one. Otherwise the user's explicit pick wins, and
        // picking a task is just about setting the title. This fixes the
        // "I picked goal X, then I picked task Y which was linked to goal Z,
        // and the goal silently changed to Z" trap.
        if (!manualGoal && !currentGoalId && task.goalId) {
          setGoalId(task.goalId)
          setManualGoal(true)
        }
        if (!manualCategory && !currentCategory && task.category) {
          setCategory(task.category)
          setManualCategory(true)
        }
        if (task.scheduleBlockId) {
          setScheduleBlockId(task.scheduleBlockId)
          setManualSchedule(true)
        }
      }
    } else {
      setTask('')
    }
  }

  // Once a session is over, the schedule block is allowed to suggest again.
  // Without this the flags stay latched for the rest of the page's life and
  // the next session starts with no suggestions at all.
  const clearManualOverrides = () => {
    setManualGoal(false)
    setManualCategory(false)
    setManualSchedule(false)
  }

  const handleCategoryChange = (category: string) => {
    setCategory(category)
    setManualCategory(true)
  }

  // The goal is the primary attribution choice, so it fills in the category
  // for you. The reverse never happens: a category must never decide which
  // goals you are allowed to see or pick.
  const handleGoalChange = (goalId: string) => {
    setGoalId(goalId)
    setManualGoal(true)
    if (goalId) {
      const goalCategory = getCategoryFromGoal(goalId, goals)
      if (goalCategory) {
        setCategory(goalCategory)
        setManualCategory(true)
      }
    } else {
      // Only drop the category we derived from that goal. What the user is
      // working on is independent of attribution and must survive clearing.
      setCategory('')
      setManualCategory(true)
    }
  }


  const hasAttribution = !!(currentTaskId || currentTask.trim() || currentGoalId || currentCategory)

  // Sort tasks - prioritize tasks matching current goal/category but show all tasks
  const orderedTasks = useMemo(
    () => sortTasksBySelection(tasks, currentGoalId || undefined, currentCategory || undefined),
    [tasks, currentGoalId, currentCategory],
  )

  const startTimer = () => {
    const selectedTask = currentTaskId ? tasks.find((t: Task) => t.id === currentTaskId) : undefined
    // Everything here is optional. Starting with nothing filled in is the
    // supported path — the session can be labelled and attributed while it
    // runs, or in the stop dialog, or never.
    const selectedTaskTitle = (currentTaskId ? selectedTask?.title : currentTask)?.trim() ?? ''

    setTask(selectedTaskTitle)
    setElapsedTime(0)
    const blockForStart = currentScheduleBlockId || findScheduleBlockForDateTime(weeklySchedule, new Date())?.id || ''
    setScheduleBlockId(blockForStart)
    start(selectedTaskTitle, currentTaskId, currentCategory, currentGoalId, blockForStart)

    if (selectedTask && selectedTask.status === 'BACKLOG') {
      updateTask.mutate(
        { taskId: selectedTask.id, data: { status: 'DOING' } },
        {
          onError: (error) => {
            toast.error('Could not update task status, but timer started successfully')
          },
        },
      )
    }
  }

  const pauseTimer = () => {
    pause(elapsedTime)
  }

  const resumeTimer = () => {
    resume()
  }

  const stopTimer = async () => {
    setShowStopModal(true)
  }

  const handleStopConfirm = ({
    notes,
    goalId,
    category,
    taskTitle,
    taskId,
  }: {
    notes: string
    goalId: string
    category: string
    taskTitle: string
    taskId: string | null
  }) => {
    const duration = Math.max(1, Math.floor(elapsedTime / 60))
    const resolvedTitle = resolveEntryTitle(taskTitle, currentTask)

    // Persist any goal / category / task override the user made in
    // the stop modal back to the timer state so the next session
    // starts from the corrected values, not the stale ones.
    if (goalId !== currentGoalId) setGoalId(goalId)
    if (category !== currentCategory) setCategory(category)
    if ((taskId ?? '') !== currentTaskId) setTaskId(taskId ?? '')

    createEntry.mutate(
      {
        taskName: resolvedTitle,
        taskId: taskId || undefined,
        taskTitle: resolvedTitle,
        duration,
        date: getLocalDateString(),
        notes: notes || undefined,
        goalId: goalId || undefined,
        startedAt: startTimestamp ? new Date(startTimestamp).toISOString() : undefined,
        scheduleBlockId: currentScheduleBlockId || undefined,
      },
      {
        onSuccess: () => {
          toast.success(`Logged ${formatDuration(duration)}!`)
          setElapsedTime(0)
          reset()
          clearManualOverrides()
          setShowStopModal(false)
        },
      },
    )
  }

  const resetTimer = () => {
    setElapsedTime(0)
    reset()
    clearManualOverrides()
  }

  return (
    <PageShell>
      <PageHeader
        eyebrow="Focus"
        title="Time Tracker"
        description="Track time with precision"
        actions={
          <Button onClick={() => setShowManualEntry(true)} variant="brand" size="sm">
            <Plus className="h-3.5 w-3.5" />
            Manual Entry
          </Button>
        }
      />

      {/* Hero wrapper. Two soft brand-yellow glow blobs + a faint
          tabular-numbers grid sit behind the GlassCard so the timer
          surface reads as the warm centerpiece of the page. Decorations
          are pointer-events-none + aria-hidden — purely visual. */}
      <div className="relative">
        <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
          <div className="absolute -left-16 -top-12 h-56 w-56 rounded-full bg-[#f2cc0d]/30 blur-3xl" />
          <div className="absolute -bottom-12 -right-16 h-64 w-64 rounded-full bg-[#fff3a8]/40 blur-3xl" />
          <div
            className="absolute inset-x-0 top-0 h-px"
            style={{
              background:
                'linear-gradient(90deg, transparent, rgba(242,204,13,0.4) 35%, rgba(242,204,13,0.4) 65%, transparent)',
            }}
          />
          {/* Subtle dot grid */}
          <div
            className="absolute inset-0 opacity-[0.08]"
            style={{
              backgroundImage:
                'radial-gradient(circle at 1px 1px, rgba(82,82,91,1) 1px, transparent 0)',
              backgroundSize: '22px 22px',
            }}
          />
        </div>
      <GlassCard className="timer-glow p-6 text-center sm:p-8 md:p-10">
        {/* Hero timer, then the controls. Start is the primary action and it
            works with nothing filled in — the form is deliberately below the
            fold of the button so it never reads as a prerequisite. */}
        <TimerDisplay elapsedTime={elapsedTime} timerState={timerState} />
        <TimerControls
          timerState={timerState}
          isStopLoading={createEntry.isPending}
          onStart={startTimer}
          onPause={pauseTimer}
          onResume={resumeTimer}
          onStop={stopTimer}
          onReset={resetTimer}
        />
        {timerState === 'STOPPED' && !hasAttribution && (
          <p className="mt-3 text-xs text-zinc-500">
            No task, goal or category needed — start now and fill this in later.
          </p>
        )}

        <div className="mx-auto mt-7 max-w-lg border-t border-zinc-200 pt-5 text-left">
          <p className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
            {timerState === 'STOPPED' ? 'Details — all optional' : 'Attach to this session'}
          </p>
          <TaskSelector
            tasks={orderedTasks}
            currentTaskId={currentTaskId}
            currentTask={currentTask}
            onTaskIdChange={handleTaskChange}
            onTaskTitleChange={setTask}
            onCreateTask={handleCreateTask}
            variant="light"
          />
          <TimerSettings
            goals={goals}
            currentCategory={currentCategory}
            currentGoalId={currentGoalId}
            timerState={timerState}
            isTaskSelected={!!currentTaskId}
            onCategoryChange={handleCategoryChange}
            onGoalIdChange={handleGoalChange}
          />
        </div>
      </GlassCard>
      </div>

      <StatsCards recentEntries={recentEntries} />

      <RecentEntries />

      <ManualEntryModal
        isOpen={showManualEntry}
        onClose={() => setShowManualEntry(false)}
        goals={goals}
        tasks={tasks}
        weeklySchedule={weeklySchedule}
      />

      <StopTimerModal
        isOpen={showStopModal}
        onClose={() => setShowStopModal(false)}
        onConfirm={handleStopConfirm}
        taskName={currentTask}
        duration={Math.max(1, Math.floor(elapsedTime / 60))}
        isLoading={createEntry.isPending}
        goals={goals.map((g: Goal) => ({ id: g.id, title: g.title }))}
        categories={categories.map((c: any) => ({ value: c.value, name: c.name }))}
        tasks={tasks.map((t: Task) => ({ id: t.id, title: t.title }))}
        defaultGoalId={currentGoalId}
        defaultCategory={currentCategory}
        defaultTaskId={currentTaskId}
      />
    </PageShell>
  )
}
