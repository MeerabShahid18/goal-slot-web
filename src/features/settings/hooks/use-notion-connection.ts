'use client'

import { useCallback } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { integrationsApi, type NotionStatusDto } from '@/lib/api'

const QUERY_KEY = ['integrations', 'notion'] as const

export function useNotionConnection() {
  const queryClient = useQueryClient()

  const query = useQuery<NotionStatusDto>({
    queryKey: QUERY_KEY,
    queryFn: async () => {
      const res = await integrationsApi.getNotionStatus()
      return res.data
    },
  })

  const disconnectMutation = useMutation({
    mutationFn: async () => {
      await integrationsApi.disconnectNotion()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY })
    },
    onError: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY })
    },
  })

  const disconnect = useCallback(() => {
    return disconnectMutation.mutateAsync()
  }, [disconnectMutation])

  return {
    status: query.data ?? { connected: false, workspaceName: null, workspaceIcon: null, connectedAt: null },
    isLoading: query.isLoading,
    isPending: disconnectMutation.isPending,
    disconnect,
  }
}
