/// <reference types="@serwist/next/typings" />
import { defaultCache } from '@serwist/next/worker'
import type { PrecacheEntry, RouteMatchCallbackOptions, SerwistGlobalConfig } from 'serwist'
import { NetworkOnly, Serwist } from 'serwist'

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined
  }
}

declare const self: WorkerGlobalScope & SerwistGlobalConfig

// Never cache API/analytics: React Query owns app data, the SW only the shell.
const networkOnly = {
  matcher: ({ url, sameOrigin }: RouteMatchCallbackOptions) =>
    sameOrigin && (url.pathname.startsWith('/api') || url.pathname.startsWith('/ingest')),
  handler: new NetworkOnly(),
}

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [networkOnly, ...defaultCache],
})

serwist.addEventListeners()

// The `declare const self` above narrows self's type to just what Serwist's
// setup needs (WorkerGlobalScope & SerwistGlobalConfig), which drops the
// push/notification/clients APIs that only exist on the real service worker
// global. Cast locally rather than widening that shared declaration.
const sw = self as unknown as ServiceWorkerGlobalScope

// Mentee engagement reminders (stale-report nudges, assigned instructions)
// arrive here when the tab is closed. The API sends a JSON payload shaped
// like { title, body, data } — data.url carries where a click should land.
sw.addEventListener('push', (event: PushEvent) => {
  if (!event.data) return

  let payload: { title?: string; body?: string; data?: Record<string, unknown> } = {}
  try {
    payload = event.data.json()
  } catch {
    // Non-JSON payload — nothing useful to show, drop it.
    return
  }

  const title = payload.title ?? 'GoalSlot'
  event.waitUntil(
    sw.registration.showNotification(title, {
      body: payload.body,
      data: payload.data,
      icon: '/icons/goalslot-logo-boxed.svg',
      badge: '/icons/goalslot-logo-64.svg',
    }),
  )
})

// Every NotificationType the API dispatches through ReminderDispatchService
// sends its routing payload as `data` shaped like the mobile app's deep-link
// data (see goalslot-mobile's deep-links.ts) — a `type` discriminant plus
// whatever id that type needs. No dispatch path sets a literal `data.url`
// today, so resolving straight from `data.url` (as this used to) silently
// fell through to '/dashboard' for every notification, message clicks
// included. Mirror the mobile resolver's known shapes here; unrecognized or
// future types fall back to '/dashboard', which is also the right landing
// spot for INSTRUCTION_ASSIGNED today since assigned instructions render
// directly on the dashboard rather than a dedicated per-instruction route.
function resolveTargetUrl(data: Record<string, unknown> | undefined): string {
  if (!data) return '/dashboard'
  if (typeof data.url === 'string' && data.url) return data.url

  switch (data.type) {
    case 'conversation':
      return typeof data.conversationId === 'string' ? `/dashboard/messages?c=${data.conversationId}` : '/dashboard/messages'
    case 'schedule':
      // SHARED_REPORT_UNVIEWED's payload — sharedAccessId isn't
      // deep-linkable on this page yet, but the sharing tab is still a
      // much better landing spot than the generic dashboard fallback.
      return '/dashboard/sharing'
    default:
      return '/dashboard'
  }
}

// Same focus-or-open-a-client approach as the local timer reminders in
// useTimerNotifications (window.focus() on an existing tab), extended to
// also navigate to the URL the payload pointed at when one is present.
sw.addEventListener('notificationclick', (event: NotificationEvent) => {
  event.notification.close()

  const targetUrl = resolveTargetUrl(event.notification.data as Record<string, unknown> | undefined)

  event.waitUntil(
    (async () => {
      const allClients = await sw.clients.matchAll({ type: 'window', includeUncontrolled: true })
      const existingClient = allClients.find((client) => client.url.includes(sw.location.origin))

      if (existingClient) {
        await existingClient.focus()
        if ('navigate' in existingClient) {
          await (existingClient as WindowClient).navigate(targetUrl)
        }
        return
      }

      await sw.clients.openWindow(targetUrl)
    })(),
  )
})
