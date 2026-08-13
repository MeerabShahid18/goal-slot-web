'use client'

import { useMemo } from 'react'
import Link from 'next/link'

import { ConversationListItem } from '@/features/messaging/components/conversation-list-item'
import { StartConversationButton } from '@/features/messaging/components/start-conversation-button'
import { messagingErrorMessage } from '@/features/messaging/utils/client'
import { displayName, hasUnreadMessages, sortConversationsByActivity } from '@/features/messaging/utils/helpers'
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

  if (isLoading) {
    return (
      <div className="space-y-2 p-2" aria-busy="true" aria-label="Loading conversations">
        {[0, 1, 2].map((index) => (
          <Skeleton key={index} className="h-14 w-full" />
        ))}
      </div>
    )
  }

  if (error) {
    return (
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
    )
  }

  if (ordered.length === 0) {
    return (
      <div className="p-2">
        <EmptyState
          icon={<MessagesSquare />}
          title="No conversations yet"
          description={
            people.length
              ? 'Start one with someone you already share with.'
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

        {people.length > 0 && (
          <ul className="space-y-1.5 px-2 pb-2">
            {people.map((person) => (
              <li
                key={person.id}
                className="flex items-center justify-between gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-2"
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium text-zinc-800">
                    {displayName(person, person.id)}
                  </span>
                  {person.email && <span className="block truncate text-xs text-zinc-500">{person.email}</span>}
                </span>
                <StartConversationButton userId={person.id} name={displayName(person, person.id)} />
              </li>
            ))}
          </ul>
        )}
      </div>
    )
  }

  return (
    <>
      <h2 className="sr-only">Conversations{unreadCount > 0 ? `, ${unreadCount} unread` : ''}</h2>
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
    </>
  )
}
