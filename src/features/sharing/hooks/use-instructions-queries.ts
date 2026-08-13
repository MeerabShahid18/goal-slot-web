import { AssignInstructionParams, Instruction } from '@/features/sharing/utils/types'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'react-hot-toast'

import { api } from '@/lib/api'

export const instructionsQueries = {
  all: ['instructions'] as const,
  assignedByMe: () => [...instructionsQueries.all, 'assigned-by-me'] as const,
}

const fetchInstructionsAssignedByMe = async (): Promise<Instruction[]> => {
  const res = await api.get('/instructions/assigned-by-me')
  return Array.isArray(res.data) ? res.data : []
}

export function useInstructionsAssignedByMeQuery() {
  return useQuery({
    queryKey: instructionsQueries.assignedByMe(),
    queryFn: fetchInstructionsAssignedByMe,
  })
}

export function useAssignInstructionMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: AssignInstructionParams) => {
      const res = await api.post('/instructions', data)
      return res.data as Instruction
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: instructionsQueries.all })
      toast.success('Instruction assigned')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to assign instruction')
    },
  })
}

// Fires once per mentee selection to record that the mentor glanced at the
// report — the design spec treats any view as sufficient, so this is a
// fire-and-forget signal rather than a user-facing action. No toast either
// way: surfacing success/failure here would distract from the report the
// mentor is actually trying to look at.
export function useMarkSharedReportViewedMutation() {
  return useMutation({
    mutationFn: async (sharedAccessId: string) => {
      await api.post(`/sharing/${sharedAccessId}/mark-viewed`)
    },
  })
}
