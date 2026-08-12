'use client'

import { useCallback } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'

import { ConversationList } from '@/features/messaging/components/conversation-list'
import { MessageThread } from '@/features/messaging/components/message-thread'
import {
  useConversationsQuery,
  useMessageablePeople,
  useMessagingDirectory,
} from '@/features/messaging/hooks/use-messaging-queries'
import { useMessagingSocket } from '@/features/messaging/hooks/use-messaging-socket'
import { useMessagingTokenQuery, useMessagingTokenRecovery } from '@/features/messaging/hooks/use-messaging-token'
import { messagingErrorMessage } from '@/features/messaging/utils/client'
import { isMessagingConfigured, isMessagingRealtimeConfigured } from '@/features/messaging/utils/config'
import { MessagesSquare, WifiOff } from 'lucide-react'

import { useAuthStore } from '@/lib/store'
import { cn } from '@/lib/utils'
import { useOnlineStatus } from '@/hooks/use-online-status'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { PageHeader } from '@/components/ui/page-header'
import { PageShell } from '@/components/ui/page-shell'

/** Query param carrying the open conversation, so a thread is linkable. */
export const CONVERSATION_PARAM = 'c'

/**
 * Reads `?c=<conversationId>`, so every caller must render this inside a
 * <Suspense> boundary or the Next 16 production prerender fails.
 */
export function MessagingPage() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const isOnline = useOnlineStatus()
  const currentUserId = useAuthStore((state) => state.user?.id)

  const selectedConversationId = searchParams.get(CONVERSATION_PARAM)

  const tokenQuery = useMessagingTokenQuery()
  const conversationsQuery = useConversationsQuery()
  const directory = useMessagingDirectory()
  const people = useMessageablePeople()
  const connectionStatus = useMessagingSocket()

  useMessagingTokenRecovery(tokenQuery.data, [conversationsQuery.error])

  const selectConversation = useCallback(
    (conversationId: string | null) => {
      const params = new URLSearchParams(searchParams.toString())
      if (conversationId) {
        params.set(CONVERSATION_PARAM, conversationId)
      } else {
        params.delete(CONVERSATION_PARAM)
      }
      const query = params.toString()
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false })
    },
    [pathname, router, searchParams],
  )

  if (!isMessagingConfigured) {
    return (
      <PageShell>
        <PageHeader eyebrow="Collaboration" title="Messages" description="Talk to the people you share with" />
        <div className="rounded-xl border border-zinc-200 bg-white shadow-sm">
          <EmptyState
            icon={<MessagesSquare />}
            title="Messaging is not enabled"
            description="This environment has no messaging service configured. Set NEXT_PUBLIC_MESSAGING_URL to turn it on."
          />
        </div>
      </PageShell>
    )
  }

  const tokenError = tokenQuery.error
  const isBootstrapping = tokenQuery.isLoading

  return (
    <PageShell>
      <PageHeader
        eyebrow="Collaboration"
        title="Messages"
        description="Talk to the people you share with"
        live={connectionStatus === 'open' ? { label: 'Live' } : undefined}
        actions={
          isMessagingRealtimeConfigured && connectionStatus === 'reconnecting' ? (
            <span className="text-xs text-zinc-500" role="status">
              Reconnecting...
            </span>
          ) : undefined
        }
      />

      {!isOnline && (
        <p
          role="status"
          className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800"
        >
          <WifiOff className="h-3.5 w-3.5 shrink-0" />
          You are offline. Conversations are shown from your last visit and sending is paused.
        </p>
      )}

      {tokenError ? (
        <div className="rounded-xl border border-zinc-200 bg-white shadow-sm">
          <EmptyState
            icon={<MessagesSquare />}
            title="Could not connect to messaging"
            description={messagingErrorMessage(tokenError)}
            action={
              <Button variant="secondary" onClick={() => void tokenQuery.refetch()}>
                Try again
              </Button>
            }
          />
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-[19rem_minmax(0,1fr)]">
          <aside
            aria-label="Conversations"
            className={cn(
              'rounded-xl border border-zinc-200 bg-white shadow-sm',
              // On phones the thread takes over the whole screen.
              selectedConversationId ? 'hidden md:block' : 'block',
            )}
          >
            <ConversationList
              conversations={conversationsQuery.data}
              currentUserId={currentUserId}
              directory={directory}
              people={people}
              selectedConversationId={selectedConversationId}
              isLoading={isBootstrapping || conversationsQuery.isLoading}
              error={conversationsQuery.error}
              onRetry={() => void conversationsQuery.refetch()}
              onSelect={selectConversation}
            />
          </aside>

          {selectedConversationId ? (
            <MessageThread
              // Remount per conversation so scroll, focus and read state
              // never leak from the previous thread.
              key={selectedConversationId}
              conversationId={selectedConversationId}
              directory={directory}
              onBack={() => selectConversation(null)}
            />
          ) : (
            <div className="hidden rounded-xl border border-zinc-200 bg-white shadow-sm md:block">
              <EmptyState
                icon={<MessagesSquare />}
                title="Pick a conversation"
                description="Choose someone on the left, or start a new conversation from the Sharing screen."
              />
            </div>
          )}
        </div>
      )}
    </PageShell>
  )
}
