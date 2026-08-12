'use client'

import { useMemo } from 'react'

import { useInstructionsAssignedByMeQuery } from '@/features/sharing/hooks/use-instructions-queries'
import { format } from 'date-fns'
import { ClipboardList } from 'lucide-react'

import { Badge } from '@/components/ui/badge'

interface SentInstructionsListProps {
  assigneeId: string
}

export function SentInstructionsList({ assigneeId }: SentInstructionsListProps) {
  const instructionsQuery = useInstructionsAssignedByMeQuery()

  const instructions = useMemo(
    () => (instructionsQuery.data ?? []).filter((instruction) => instruction.assignee.id === assigneeId),
    [instructionsQuery.data, assigneeId],
  )

  if (instructionsQuery.isLoading) {
    return <div className="rounded-xl border border-zinc-200 bg-white p-4 text-sm text-zinc-500 shadow-sm">Loading instructions...</div>
  }

  if (instructions.length === 0) {
    return (
      <div className="rounded-xl border border-zinc-200 bg-white p-4 text-center shadow-sm">
        <ClipboardList className="mx-auto mb-2 h-8 w-8 text-zinc-300" />
        <p className="font-mono text-xs text-gray-600 sm:text-sm">No instructions assigned yet.</p>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
      <h3 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase text-zinc-900">
        <ClipboardList className="h-4 w-4" />
        Instructions Sent
      </h3>
      <ul className="space-y-2">
        {instructions.map((instruction) => (
          <li
            key={instruction.id}
            className="flex items-start justify-between gap-3 rounded-lg border border-zinc-200 bg-zinc-50 p-3"
          >
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-zinc-900">{instruction.title}</p>
              {instruction.note && <p className="mt-0.5 font-mono text-xs text-gray-600">{instruction.note}</p>}
              <p className="mt-1 font-mono text-[11px] text-zinc-400">
                Sent {format(new Date(instruction.createdAt), 'MMM d, yyyy')}
              </p>
            </div>
            {instruction.status === 'DONE' ? (
              <div className="flex flex-col items-end gap-1">
                <Badge variant="success">Done</Badge>
                {instruction.completedAt && (
                  <span className="whitespace-nowrap font-mono text-[10px] text-zinc-400">
                    {format(new Date(instruction.completedAt), 'MMM d, yyyy')}
                  </span>
                )}
              </div>
            ) : (
              <Badge variant="warning">Pending</Badge>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
