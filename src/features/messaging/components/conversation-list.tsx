'use client'

import { useMemo } from 'react'
import Link from 'next/link'

import { ConversationListItem } from '@/features/messaging/components/conversation-list-item'
import { NewConversationPicker } from '@/features/messaging/components/new-conversation-picker'
import { messagingErrorMessage } from '@/features/messaging/utils/client'
import { hasUnreadMessages, sortConversationsByActivity } from '@/features/messaging/utils/helpers'
import { Conversation, MessagingPerson } from '@/features/messaging/utils/types'
import { MessagesSquare, Users } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { Skeleton } from '@/components/ui/skeleton'

interface ConversationListProps {
  conversations: Conversation[] | undefined
  currentUserId: string | undefined
  directory: Map<string, MessagingPerson>
  people: MessagingPerson[]
  selectedConversationId: string | null
  isLoading: boolean
  error: unknown
  onRetry: () => void
  onSelect: (conversationId: string) => void
}

export function ConversationList({
  conversations,
  currentUserId,
  directory,
  people,
  selectedConversationId,
  isLoading,
  error,
  onRetry,
  onSelect,
}: ConversationListProps) {
  const ordered = useMemo(() => sortConversationsByActivity(conversations ?? []), [conversations])

  const unreadCount = useMemo(
    () => ordered.filter((conversation) => hasUnreadMessages(conversation, currentUserId)).length,
    [currentUserId, ordered],
  )

  return (
    <>
      {/* Always visible, not just once a first conversation exists — this is
          the only way back to messaging someone new once the empty-state's
          own people list (below) is gone. */}
      <div className="flex items-center justify-between gap-2 border-b border-zinc-200 px-3 py-2.5">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
          Conversations{unreadCount > 0 ? ` · ${unreadCount} unread` : ''}
        </h2>
        <NewConversationPicker
          people={people}
          conversations={conversations}
          currentUserId={currentUserId}
          onOpenConversation={onSelect}
        />
      </div>

      {isLoading ? (
        <div className="space-y-2 p-2" aria-busy="true" aria-label="Loading conversations">
          {[0, 1, 2].map((index) => (
            <Skeleton key={index} className="h-14 w-full" />
          ))}
        </div>
      ) : error ? (
        <EmptyState
          icon={<MessagesSquare />}
          title="Could not load conversations"
          description={messagingErrorMessage(error)}
          action={
            <Button variant="secondary" onClick={onRetry}>
              Try again
            </Button>
          }
        />
      ) : ordered.length === 0 ? (
        <div className="p-2">
          <EmptyState
            icon={<MessagesSquare />}
            title="No conversations yet"
            description={
              people.length
                ? 'Search for someone above to start one.'
                : 'Once you share with someone, you can message them here.'
            }
            action={
              people.length ? undefined : (
                <Button asChild variant="secondary">
                  <Link href="/dashboard/sharing">
                    <Users className="h-4 w-4" />
                    Go to Sharing
                  </Link>
                </Button>
              )
            }
          />
        </div>
      ) : (
        <ul className="space-y-1 p-2">
          {ordered.map((conversation) => (
            <ConversationListItem
              key={conversation.id}
              conversation={conversation}
              currentUserId={currentUserId}
              directory={directory}
              isSelected={conversation.id === selectedConversationId}
              isUnread={hasUnreadMessages(conversation, currentUserId)}
              onSelect={() => onSelect(conversation.id)}
            />
          ))}
        </ul>
      )}
    </>
  )
}
