import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'react-hot-toast'

import { api } from '@/lib/api'

export type InstructionStatus = 'PENDING' | 'DONE'

export interface InstructionAssigner {
  id: string
  name: string
  email: string
}

export interface ReceivedInstruction {
  id: string
  title: string
  note: string | null
  status: InstructionStatus
  completedAt: string | null
  createdAt: string
  assigner: InstructionAssigner
}

export const instructionsQueries = {
  all: ['instructions'] as const,
  assignedToMe: () => [...instructionsQueries.all, 'assigned-to-me'] as const,
}

const fetchInstructionsAssignedToMe = async (): Promise<ReceivedInstruction[]> => {
  const res = await api.get('/instructions/assigned-to-me')
  return res.data
}

export function useInstructionsAssignedToMeQuery() {
  return useQuery({
    queryKey: instructionsQueries.assignedToMe(),
    queryFn: fetchInstructionsAssignedToMe,
  })
}

// Optimistic complete: flips the row to DONE in the cache immediately so the
// button feels instant, then reconciles with the server. Rolls back to the
// pre-mutation snapshot if the request fails. Shape matches the plain
// useMutation + onMutate/onError/onSettled pattern used for single-item
// status flips elsewhere (see useRestoreTaskMutation / useReorderTasksMutation
// in src/features/tasks/hooks/use-tasks-mutations.ts).
export function useCompleteInstructionMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (instructionId: string) => api.patch(`/instructions/${instructionId}/complete`),
    onMutate: async (instructionId: string) => {
      await queryClient.cancelQueries({ queryKey: instructionsQueries.assignedToMe() })

      const previous = queryClient.getQueryData<ReceivedInstruction[]>(instructionsQueries.assignedToMe())

      queryClient.setQueryData<ReceivedInstruction[]>(instructionsQueries.assignedToMe(), (current) =>
        current?.map((instruction) =>
          instruction.id === instructionId
            ? { ...instruction, status: 'DONE', completedAt: new Date().toISOString() }
            : instruction,
        ),
      )

      return { previous }
    },
    onError: (_err, _instructionId, context) => {
      if (context?.previous) {
        queryClient.setQueryData(instructionsQueries.assignedToMe(), context.previous)
      }
      toast.error('Failed to mark instruction as done')
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: instructionsQueries.assignedToMe() })
    },
  })
}
