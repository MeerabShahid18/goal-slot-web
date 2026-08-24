import { Suspense } from 'react'

import { MessagingPage } from '@/features/messaging'

import { Loading } from '@/components/ui/loading'
import { PageHeader } from '@/components/ui/page-header'
import { PageShell } from '@/components/ui/page-shell'

// MessagingPage reads ?c=<conversationId> through useSearchParams, which under
// Next 16 has to sit inside a Suspense boundary or the production prerender
// fails on this route.
export default function Page() {
  return (
    <Suspense
      fallback={
        <PageShell>
          <PageHeader eyebrow="Collaboration" title="Messages" description="Talk to the people you share with" />
          <div className="flex h-64 items-center justify-center rounded-xl border border-zinc-200 bg-white shadow-sm">
            <Loading />
          </div>
        </PageShell>
      }
    >
      <MessagingPage />
    </Suspense>
  )
}
