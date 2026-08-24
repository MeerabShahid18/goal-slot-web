import { api } from '@/lib/api'
import { registerOperation } from '@/lib/offline/registry'

import { scheduleQueries } from './queries'

const config = (idempotencyKey: string) => ({ headers: { 'Idempotency-Key': idempotencyKey } })

// Creating a block across multiple selected days (schedule-block-modal.tsx)
// used to send one request per day via Promise.all. That has two separate
// failure modes, both fixed by routing the whole group through the atomic
// POST /schedule/batch endpoint (goal-slot-api's ScheduleService.createBatch)
// as ONE request instead:
//
//   1. No atomicity: Promise.all fails fast on the first rejected day, but
//      the other requests were already in flight and completed
//      independently — there was no transaction spanning the group. A
//      genuine conflict on one day 400'd, the user saw ONE error and
//      assumed nothing happened, while up to N-1 blocks were silently
//      created. The batch endpoint checks every day for a conflict BEFORE
//      inserting any of them, inside one transaction, so a conflict rolls
//      back the whole group.
//   2. Idempotency: the whole batch only ever got ONE idempotency key from
//      useOfflineMutation (minted once per mutate() call), so N requests
//      sharing one key raced the server's IdempotencyInterceptor. A single
//      request naturally has a single key, closing that too.
//
// Single-day creates (array of length 1) also go through this same
// operation/endpoint rather than branching client-side — one code path,
// and the batch endpoint's all-or-nothing semantics degrade correctly to
// "the one day" when there's only one.
registerOperation<Record<string, unknown>[], unknown>('schedule.createMany', {
  execute: (payloads, key) =>
    api.post('/schedule/batch', { blocks: payloads }, config(key)).then((r) => r.data),
  invalidateKeys: [scheduleQueries.weeklyKey()],
})

registerOperation<{ id: string; data: Record<string, unknown> }, unknown>('schedule.update', {
  execute: (payload, key) => api.put(`/schedule/${payload.id}`, payload.data, config(key)).then((r) => r.data),
  invalidateKeys: [scheduleQueries.weeklyKey()],
})

registerOperation<{ id: string }, unknown>('schedule.delete', {
  execute: (payload, key) => api.delete(`/schedule/${payload.id}`, config(key)).then((r) => r.data),
  invalidateKeys: [scheduleQueries.weeklyKey()],
})
