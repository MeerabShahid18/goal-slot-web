'use client'

import { useQuery } from '@tanstack/react-query'
import { integrationsApi } from '@/lib/api'

export const NOTION_PAGE_CONTENT_KEY = (pageId: string | null) =>
  ['integrations', 'notion', 'page', pageId] as const

export function useNotionPageContent(pageId: string | null) {
  return useQuery({
    queryKey: NOTION_PAGE_CONTENT_KEY(pageId),
    queryFn: async () => {
      if (!pageId) throw new Error('No page ID provided')
      const res = await integrationsApi.getNotionPageContent(pageId)
      return res.data
    },
    enabled: !!pageId,
    staleTime: 2 * 60 * 1000, // cache page content for 2 minutes
    gcTime: 5 * 60 * 1000,
  })
}
