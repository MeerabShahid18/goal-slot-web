import type { CoachVoiceIntentResponse } from '@/lib/api'
import type { TimerState } from '@/lib/use-timer-store'

/**
 * Pure decision logic for the voice fast path.
 *
 * `useVoiceFastPath` (src/hooks/use-voice-fast-path.ts) calls the backend
 * classifier and then hands the result here, with the client-side state the
 * classifier's answer alone can't verify (what the timer is actually doing
 * right now, which goals/tasks the client can actually resolve an id
 * against). This file decides what — if anything — is safe to run directly,
 * with no I/O of its own, so the judgment calls live in one place that can
 * be read (and, if this repo grows a test runner, tested) without a
 * microphone or a network call.
 *
 * Every branch that isn't confidently actionable resolves to
 * `fallback-to-coach` — never a guess. The full Coach conversation is always
 * there to catch anything this can't.
 */

export interface VoiceCandidateGoal {
  id: string
  title: string
}

export interface VoiceCandidateTask {
  id: string
  title: string
  goalId?: string
}

export type VoiceActionPlan =
  | { kind: 'start-timer'; task: string; taskId: string; goalId: string }
  | { kind: 'stop-timer' }
  | { kind: 'pause-timer' }
  | { kind: 'resume-timer' }
  | { kind: 'append-note'; targetKind: 'goal' | 'task'; targetId: string; text: string }
  | { kind: 'append-journal'; text: string }
  | { kind: 'create-task'; title: string; goalId?: string }
  | { kind: 'fallback-to-coach' }

export interface PlanVoiceActionInput {
  response: CoachVoiceIntentResponse
  timerState: TimerState
  goals: readonly VoiceCandidateGoal[]
  tasks: readonly VoiceCandidateTask[]
}

const FALLBACK: VoiceActionPlan = { kind: 'fallback-to-coach' }

export function planVoiceAction({ response, timerState, goals, tasks }: PlanVoiceActionInput): VoiceActionPlan {
  // A low-confidence read is exactly what the full Coach conversation is
  // for — it can ask a clarifying question, the fast path can't.
  if (response.confidence !== 'high') return FALLBACK

  const resolveGoal = (id: string) => goals.find((g) => g.id === id)
  const resolveTask = (id: string) => tasks.find((t) => t.id === id)

  switch (response.intent) {
    case 'START_TRACKING': {
      // Already running/paused: "start tracking" now reads as ambiguous
      // (switch sessions? the user misspoke?) rather than a clean start.
      // Let Coach sort out what they actually mean.
      if (timerState !== 'STOPPED') return FALLBACK
      if (response.target?.kind === 'task') {
        const task = resolveTask(response.target.id)
        // The classifier named a task id the client can't see (stale
        // context, hallucination) — don't start a session attributed to
        // nothing when it was supposed to be attributed to something.
        if (!task) return FALLBACK
        return { kind: 'start-timer', task: task.title, taskId: task.id, goalId: task.goalId ?? '' }
      }
      if (response.target?.kind === 'goal') {
        const goal = resolveGoal(response.target.id)
        if (!goal) return FALLBACK
        return { kind: 'start-timer', task: '', taskId: '', goalId: goal.id }
      }
      // No target at all is fine — an unattributed session is the normal
      // "just start now" path the Time Tracker page itself supports.
      return { kind: 'start-timer', task: '', taskId: '', goalId: '' }
    }

    case 'STOP_TRACKING':
      // Nothing running to stop reads the same way as START_TRACKING with
      // something already running: let the full conversation figure out
      // what the user actually meant instead of silently no-op'ing.
      return timerState === 'STOPPED' ? FALLBACK : { kind: 'stop-timer' }

    case 'PAUSE':
      return timerState === 'RUNNING' ? { kind: 'pause-timer' } : FALLBACK

    case 'RESUME':
      return timerState === 'PAUSED' ? { kind: 'resume-timer' } : FALLBACK

    case 'APPEND_NOTE': {
      const text = response.text?.trim()
      if (!text || !response.target) return FALLBACK
      if (response.target.kind === 'goal' && !resolveGoal(response.target.id)) return FALLBACK
      if (response.target.kind === 'task' && !resolveTask(response.target.id)) return FALLBACK
      return { kind: 'append-note', targetKind: response.target.kind, targetId: response.target.id, text }
    }

    case 'APPEND_JOURNAL': {
      const text = response.text?.trim()
      if (!text) return FALLBACK
      return { kind: 'append-journal', text }
    }

    case 'CREATE_TASK': {
      const title = response.text?.trim()
      if (!title) return FALLBACK
      const goalId =
        response.target?.kind === 'goal' && resolveGoal(response.target.id) ? response.target.id : undefined
      return { kind: 'create-task', title, goalId }
    }

    // CREATE_GOAL needs structured fields (category, target hours, ...) this
    // classifier's response doesn't carry, and a goal is a heavier object to
    // get wrong than a task — better handled by the full Coach proposal,
    // which can ask or infer those fields with the whole conversation to
    // draw on. DAY_QUERY / CHAT / UNKNOWN are exactly what that full
    // conversation is for by definition.
    case 'CREATE_GOAL':
    case 'DAY_QUERY':
    case 'CHAT':
    case 'UNKNOWN':
    default:
      return FALLBACK
  }
}
