import { messagingQueries } from '@/features/messaging/utils/queries'
import { Conversation, Message, ThreadMessage } from '@/features/messaging/utils/types'
import type { QueryClient } from '@tanstack/react-query'

/**
 * Reconciling a delivered message into the cache, shared by the WebSocket
 * (someone else's message, or our own echoed back from another tab) and by
 * the send mutation (our own, replacing its optimistic row).
 *
 * Deliberately never seeds a thread the user has not opened: writing a
 * single-message array into an empty cache would make the thread render as if
 * that were the whole history.
 */
export function upsertMessageInCache(queryClient: QueryClient, message: Message): void {
  queryClient.setQueryData<ThreadMessage[]>(messagingQueries.messages(message.conversationId), (existing) => {
    if (!existing) return existing
    if (existing.some((candidate) => candidate.id === message.id)) return existing

    // Our own send may already be on screen as an optimistic row; swap it in
    // place so the bubble does not jump or duplicate.
    const optimisticIndex = existing.findIndex(
      (candidate) => candidate.pending && candidate.senderId === message.senderId && candidate.body === message.body,
    )

    if (optimisticIndex >= 0) {
      const next = [...existing]
      next[optimisticIndex] = message
      return next
    }

    return [...existing, message]
  })
}

/**
 * Swaps our optimistic row for the row the server acknowledged. The socket can
 * echo our own message back before or after the POST resolves, so all three
 * orderings have to land on exactly one copy of the message.
 */
export function replaceOptimisticMessage(queryClient: QueryClient, optimisticId: string, message: Message): void {
  queryClient.setQueryData<ThreadMessage[]>(messagingQueries.messages(message.conversationId), (existing) => {
    if (!existing) return existing

    const alreadyDelivered = existing.some((candidate) => candidate.id === message.id)
    const optimisticIndex = existing.findIndex((candidate) => candidate.id === optimisticId)

    // The socket got here first and already consumed the optimistic row, or
    // left it behind as a twin; either way the real message is on screen.
    if (alreadyDelivered) {
      return optimisticIndex === -1 ? existing : existing.filter((candidate) => candidate.id !== optimisticId)
    }

    // Nothing to replace (the thread reloaded mid-flight): append instead of
    // dropping the message the user just sent.
    if (optimisticIndex === -1) return [...existing, message]

    const next = [...existing]
    next[optimisticIndex] = message
    return next
  })
}

export function removeMessageFromCache(queryClient: QueryClient, conversationId: string, messageId: string): void {
  queryClient.setQueryData<ThreadMessage[]>(messagingQueries.messages(conversationId), (existing) =>
    existing ? existing.filter((candidate) => candidate.id !== messageId) : existing,
  )
}

/**
 * Moves a conversation to the top of the list with a fresh preview. When the
 * conversation is not in the cached list at all (a first message from someone
 * new), falls back to a refetch so the list can pick it up.
 */
export function applyMessageToConversationList(queryClient: QueryClient, message: Message): void {
  let matched = false

  queryClient.setQueryData<Conversation[]>(messagingQueries.conversations(), (existing) => {
    if (!existing) return existing

    const index = existing.findIndex((conversation) => conversation.id === message.conversationId)
    if (index === -1) return existing

    matched = true
    const next = [...existing]
    next[index] = {
      ...next[index],
      lastMessage: message,
      lastMessageAt: message.createdAt,
      updatedAt: message.createdAt,
    }
    return next
  })

  if (!matched) {
    void queryClient.invalidateQueries({ queryKey: messagingQueries.conversations() })
  }
}

/** Optimistically advances the current user's read marker. */
export function markConversationReadInCache(
  queryClient: QueryClient,
  conversationId: string,
  userId: string,
  readAt: string,
): void {
  const advance = (conversation: Conversation): Conversation => {
    if (!conversation.participants) return conversation
    return {
      ...conversation,
      participants: conversation.participants.map((participant) =>
        participant.userId === userId ? { ...participant, lastReadAt: readAt } : participant,
      ),
    }
  }

  queryClient.setQueryData<Conversation>(messagingQueries.conversation(conversationId), (existing) =>
    existing ? advance(existing) : existing,
  )

  queryClient.setQueryData<Conversation[]>(messagingQueries.conversations(), (existing) =>
    existing
      ? existing.map((conversation) => (conversation.id === conversationId ? advance(conversation) : conversation))
      : existing,
  )
}

/**
 * After a dropped socket reconnects we may have missed messages, so the lists
 * and any loaded thread are refetched. The token query is left alone: it is
 * still valid and refetching it would churn the socket.
 */
export function resyncMessagingCaches(queryClient: QueryClient): void {
  void queryClient.invalidateQueries({ queryKey: messagingQueries.conversations() })
  void queryClient.invalidateQueries({ queryKey: messagingQueries.conversationRoot() })
  void queryClient.invalidateQueries({ queryKey: messagingQueries.messagesRoot() })
}
