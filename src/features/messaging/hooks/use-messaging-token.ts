'use client'

import { useEffect, useRef } from 'react'

import { isMessagingAuthError } from '@/features/messaging/utils/client'
import { isMessagingConfigured } from '@/features/messaging/utils/config'
import { fetchMessagingToken, messagingQueries } from '@/features/messaging/utils/queries'
import { useQuery, useQueryClient } from '@tanstack/react-query'

import { useAuthStore } from '@/lib/store'

// Refresh a little before the token actually expires so an in-flight request
// never races the clock, and never sit on a token for more than a few minutes
// when it carries no `exp` at all.
const EXPIRY_SAFETY_MARGIN_MS = 30_000
const MIN_REFRESH_MS = 15_000
const FALLBACK_REFRESH_MS = 4 * 60 * 1000

const decodeJwtExpiry = (token: string): number | null => {
  if (typeof window === 'undefined') return null

  const payload = token.split('.')[1]
  if (!payload) return null

  try {
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/')
    const parsed = JSON.parse(window.atob(normalized)) as { exp?: unknown }
    return typeof parsed.exp === 'number' ? parsed.exp * 1000 : null
  } catch {
    return null
  }
}

const refreshDelayFor = (token: string | undefined): number => {
  if (!token) return FALLBACK_REFRESH_MS
  const expiresAt = decodeJwtExpiry(token)
  if (!expiresAt) return FALLBACK_REFRESH_MS
  return Math.max(MIN_REFRESH_MS, expiresAt - Date.now() - EXPIRY_SAFETY_MARGIN_MS)
}

/**
 * The short-lived JWT for jiffy-messaging, minted by the GoalSlot API against
 * the user's normal session. Everything else in the feature waits on this.
 */
export function useMessagingTokenQuery() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)

  return useQuery({
    queryKey: messagingQueries.token(),
    queryFn: fetchMessagingToken,
    enabled: isMessagingConfigured && isAuthenticated,
    // Keep it out of the persisted cache lifetime: a stale JWT is useless.
    gcTime: FALLBACK_REFRESH_MS,
    staleTime: FALLBACK_REFRESH_MS,
    refetchInterval: (query) => refreshDelayFor(query.state.data),
    refetchIntervalInBackground: false,
    retry: 1,
  })
}

/**
 * Recovers from a token that expired mid-session: when a messaging call comes
 * back 401, the token query is invalidated once per token so the next render
 * retries with a fresh one instead of looping on a dead credential.
 */
export function useMessagingTokenRecovery(token: string | undefined, errors: unknown[]): void {
  const queryClient = useQueryClient()
  const recoveredForTokenRef = useRef<string | null>(null)

  const sawAuthError = errors.some(isMessagingAuthError)

  useEffect(() => {
    if (!sawAuthError || !token) return
    if (recoveredForTokenRef.current === token) return

    recoveredForTokenRef.current = token
    void queryClient.invalidateQueries({ queryKey: messagingQueries.token() })
  }, [queryClient, sawAuthError, token])
}
