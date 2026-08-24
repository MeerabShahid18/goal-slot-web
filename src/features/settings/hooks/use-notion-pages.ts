'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { integrationsApi } from '@/lib/api'

export const NOTION_INDEX_KEY = ['integrations', 'notion', 'index'] as const

export function useNotionIndex() {
  return useQuery({
    queryKey: NOTION_INDEX_KEY,
    queryFn: async () => {
      const res = await integrationsApi.getNotionIndex()
      return res.data
    },
    staleTime: 0, // always re-check; backend handles stale logic
  })
}

export function useRefreshNotionIndex() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => integrationsApi.refreshNotionIndex(),
    onSettled: () => {
      // Invalidate on both success and error to keep cache consistent
      queryClient.invalidateQueries({ queryKey: NOTION_INDEX_KEY })
    },
  })
}
