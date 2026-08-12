'use client'

import { useMemo } from 'react'

import { useMessagingTokenQuery } from '@/features/messaging/hooks/use-messaging-token'
import { isMessagingConfigured } from '@/features/messaging/utils/config'
import {
  fetchConversation,
  fetchConversations,
  fetchMessages,
  messagingQueries,
} from '@/features/messaging/utils/queries'
import { Conversation, MessagingPerson, ThreadMessage } from '@/features/messaging/utils/types'
import { useMySharesQuery, useSharedWithMeQuery } from '@/features/sharing/hooks/use-sharing-queries'
import { DataShare, SharedWithMeUser } from '@/features/sharing/utils/types'
import { useQuery } from '@tanstack/react-query'

export function useConversationsQuery() {
  const tokenQuery = useMessagingTokenQuery()
  const token = tokenQuery.data

  return useQuery({
    queryKey: messagingQueries.conversations(),
    queryFn: () => fetchConversations(token as string),
    enabled: isMessagingConfigured && !!token,
  })
}

export function useConversationQuery(conversationId: string | null) {
  const tokenQuery = useMessagingTokenQuery()
  const token = tokenQuery.data

  return useQuery({
    queryKey: messagingQueries.conversation(conversationId ?? ''),
    queryFn: () => fetchConversation(token as string, conversationId as string),
    enabled: isMessagingConfigured && !!token && !!conversationId,
  })
}

export function useMessagesQuery(conversationId: string | null) {
  const tokenQuery = useMessagingTokenQuery()
  const token = tokenQuery.data

  return useQuery<ThreadMessage[]>({
    queryKey: messagingQueries.messages(conversationId ?? ''),
    queryFn: () => fetchMessages(token as string, conversationId as string),
    enabled: isMessagingConfigured && !!token && !!conversationId,
  })
}

/**
 * jiffy-messaging only knows participants by user id. Names come from the
 * sharing graph, which is exactly the set of people a user is allowed to
 * message, so both directions of it are folded into one lookup.
 */
export function useMessagingDirectory(): Map<string, MessagingPerson> {
  const mySharesQuery = useMySharesQuery()
  const sharedWithMeQuery = useSharedWithMeQuery()

  const myShares = mySharesQuery.data
  const sharedWithMe = sharedWithMeQuery.data

  return useMemo(() => {
    const directory = new Map<string, MessagingPerson>()

    const add = (person: MessagingPerson | undefined) => {
      if (!person?.id) return
      const existing = directory.get(person.id)
      directory.set(person.id, {
        id: person.id,
        name: person.name || existing?.name,
        email: person.email || existing?.email,
        avatar: person.avatar || existing?.avatar,
      })
    }

    ;(Array.isArray(myShares) ? (myShares as DataShare[]) : []).forEach((share) => add(share.sharedWith))
    ;(Array.isArray(sharedWithMe) ? (sharedWithMe as SharedWithMeUser[]) : []).forEach((share) => add(share.owner))

    return directory
  }, [myShares, sharedWithMe])
}

/** People the user shares with, deduplicated, for the "new conversation" list. */
export function useMessageablePeople(): MessagingPerson[] {
  const directory = useMessagingDirectory()
  return useMemo(
    () =>
      Array.from(directory.values()).sort((a, b) => (a.name || a.email || '').localeCompare(b.name || b.email || '')),
    [directory],
  )
}

/** The conversation the user already has with a given counterpart, if any. */
export function findConversationWith(
  conversations: Conversation[] | undefined,
  counterpartId: string,
  currentUserId: string | undefined,
): Conversation | undefined {
  return conversations?.find((conversation) => {
    const ids = conversation.participants?.map((participant) => participant.userId) ?? []
    return ids.includes(counterpartId) && (!currentUserId || ids.includes(currentUserId))
  })
}
