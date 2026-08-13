'use client'

import {
  useCompleteInstructionMutation,
  useInstructionsAssignedToMeQuery,
} from '@/features/instructions/hooks/use-instructions-queries'
import { CheckCircle2, Circle } from 'lucide-react'

import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { GlassCard } from '@/components/ui/glass-card'
import { SectionHeader } from '@/components/ui/section-header'

/**
 * Dashboard card for instructions a mentor assigned to the current user.
 * Mirrors ActivePracticeReminders: fetches its own data, renders nothing
 * while loading or when there is nothing to show so the dashboard doesn't
 * grow an empty section.
 *
 * PENDING instructions are what the recurring reminder nudges the mentee
 * about, so they sort first and carry the louder styling; DONE ones sink
 * to the bottom and are visually quiet, matching the completed-task
 * pattern used elsewhere (TaskCompleteButton / CompactTaskHeader).
 */
export function ReceivedInstructionsCard() {
  const { data: instructions, isPending } = useInstructionsAssignedToMeQuery()
  const completeMutation = useCompleteInstructionMutation()

  if (isPending || !instructions || instructions.length === 0) return null

  const pendingCount = instructions.filter((instruction) => instruction.status === 'PENDING').length

  const sorted = [...instructions].sort((a, b) => {
    if (a.status === b.status) return 0
    return a.status === 'PENDING' ? -1 : 1
  })

  return (
    <GlassCard padded>
      <SectionHeader
        title="From Your Mentor"
        action={
          pendingCount > 0 ? (
            <Badge variant="warning">
              {pendingCount} {pendingCount === 1 ? 'pending' : 'pending'}
            </Badge>
          ) : (
            <Badge variant="success">All done</Badge>
          )
        }
      />

      <ul className="space-y-2">
        {sorted.map((instruction) => {
          const isDone = instruction.status === 'DONE'

          return (
            <li
              key={instruction.id}
              className={cn(
                'flex flex-col gap-2 rounded-lg border px-3 py-2.5 transition-colors sm:flex-row sm:items-start sm:gap-3',
                isDone ? 'border-zinc-200 bg-white opacity-70' : 'border-amber-200 bg-amber-50/40',
              )}
            >
              <div className="mt-0.5 shrink-0">
                {isDone ? (
                  <CheckCircle2 className="h-4 w-4 text-gray-400 sm:h-5 sm:w-5" />
                ) : (
                  <Circle className="h-4 w-4 text-amber-500 sm:h-5 sm:w-5" />
                )}
              </div>

              <div className="min-w-0 flex-1">
                <p className={cn('text-sm font-semibold text-zinc-900', isDone && 'text-zinc-500 line-through')}>
                  {instruction.title}
                </p>
                {instruction.note && <p className="mt-0.5 text-xs text-zinc-500">{instruction.note}</p>}
                <p className="mt-1 text-xs text-zinc-400">From {instruction.assigner.name}</p>
              </div>

              <div className="shrink-0">
                {isDone ? (
                  <div className="text-accent-green flex items-center gap-2 rounded-md bg-emerald-50/10 px-3 py-2 text-xs font-bold uppercase">
                    <CheckCircle2 className="h-4 w-4" />
                    Done
                  </div>
                ) : (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => completeMutation.mutate(instruction.id)}
                    disabled={completeMutation.isPending}
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Done
                  </Button>
                )}
              </div>
            </li>
          )
        })}
      </ul>
    </GlassCard>
  )
}
