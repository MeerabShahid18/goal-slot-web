'use client'

import { useState } from 'react'
import { RefreshCw, Settings2 } from 'lucide-react'
import { toast } from 'react-hot-toast'

import { Button } from '@/components/ui/button'
import { SectionHeader } from '@/components/ui/section-header'
import { integrationsApi } from '@/lib/api'
import { useRefreshNotionIndex } from '@/features/settings/hooks/use-notion-pages'

export function NotionTargetPicker() {
  const refreshMutation = useRefreshNotionIndex()
  const [isManaging, setIsManaging] = useState(false)

  const handleRefresh = async () => {
    try {
      await refreshMutation.mutateAsync()
      toast.success('Notion page index refreshed successfully')
    } catch {
      toast.error('Failed to refresh page index. Please try again.')
    }
  }

  const handleManagePages = async () => {
    setIsManaging(true)
    try {
      const res = await integrationsApi.getNotionConnectUrl()
      window.location.href = res.data.url
    } catch {
      toast.error('Failed to initiate page management. Please try again.')
    } finally {
      setIsManaging(false)
    }
  }

  return (
    <div className="mt-4 space-y-4 border-t border-zinc-200 pt-4">
      <SectionHeader
        title="Reference Search"
        action={
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshMutation.isPending}
            className="h-7 gap-1.5 text-xs text-zinc-500 hover:text-zinc-900"
          >
            <RefreshCw
              className={`h-3 w-3 ${refreshMutation.isPending ? 'animate-spin' : ''}`}
            />
            Refresh Sync
          </Button>
        }
      />

      <div className="rounded-lg border border-zinc-200 bg-white p-3.5 shadow-sm">
        <p className="text-xs leading-relaxed text-zinc-600">
          All pages and databases permitted during your Notion connection are automatically made available in your <kbd className="rounded border border-zinc-200 bg-zinc-50 px-1 py-0.5 font-mono text-[10px] font-semibold text-zinc-500">Cmd+K</kbd> reference search.
        </p>
      </div>

      <div className="pt-1">
        <Button
          variant="secondary"
          size="sm"
          className="w-full gap-2 text-xs font-semibold"
          onClick={handleManagePages}
          disabled={isManaging}
        >
          <Settings2 className="h-3.5 w-3.5" />
          {isManaging ? 'Redirecting...' : 'Manage Permitted Pages'}
        </Button>
      </div>
    </div>
  )
}
