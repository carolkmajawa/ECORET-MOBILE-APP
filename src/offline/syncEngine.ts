import NetInfo from '@react-native-community/netinfo'
import { api } from '../api/client'
import { ENDPOINTS } from '../api/endpoints'
import { getPendingActions, markSynced, markFailed, QueuedAction } from './actionQueue'

const ACTION_TYPE_TO_SYNC_KEY: Record<QueuedAction['type'], string> = {
  attendance: 'attendance',
  attendance_case: 'attendance_cases',
  loan_approve: 'loans',
  loan_decline: 'loans',
  loan_repayment: 'repayments',
  saving: 'savings',
}

/**
 * Flushes every pending offline action to apps/sync's SyncView.POST.
 * Call this whenever connectivity returns (see startAutoSync below)
 * and also on manual "sync now" pulls.
 */
export async function flushQueue(deviceId: string) {
  const pending = await getPendingActions()
  if (pending.length === 0) return { synced: 0, failed: 0 }

  const grouped: Record<string, unknown[]> = {}
  for (const action of pending) {
    const key = ACTION_TYPE_TO_SYNC_KEY[action.type]
    grouped[key] = grouped[key] || []
    grouped[key].push(action.payload)
  }

  try {
    const { data } = await api.post(ENDPOINTS.sync.push, { device_id: deviceId, ...grouped })

    // NOTE: apps/sync's process_*_sync handlers return created/updated
    // IDs but not which INPUT record each one came from, so we can't
    // reliably mark individual queued actions as synced from this
    // response alone yet. For now this marks the whole batch synced
    // on any success response -- worth tightening once the backend
    // echoes back a client-side reference (e.g. the idempotency_key)
    // per processed item, so a partial failure doesn't silently mark
    // a failed item as done.
    for (const action of pending) {
      await markSynced(action.id)
    }
    return { synced: pending.length, failed: 0, response: data }
  } catch (error) {
    for (const action of pending) {
      await markFailed(action.id, error instanceof Error ? error.message : 'Unknown sync error')
    }
    return { synced: 0, failed: pending.length }
  }
}

/**
 * Pulls fresh data for the chairman's groups. Your current
 * apps/sync/views.py SyncView.get() returns EVERYTHING for the user's
 * groups every time -- it records device.last_sync_at but never
 * actually filters by it. That's fine for a first version, but as
 * loan/repayment/attendance history grows this will get slow and
 * data-heavy on a chairman's phone. Worth adding a `?since=` query
 * param to that view that filters each queryset by `updated_at__gt`
 * once this is in real use.
 */
export async function pullLatest(deviceId: string) {
  const { data } = await api.get(ENDPOINTS.sync.pull, { params: { device_id: deviceId } })
  return data
}

export function startAutoSync(deviceId: string, onSyncComplete?: () => void) {
  return NetInfo.addEventListener((state) => {
    if (state.isConnected) {
      flushQueue(deviceId).then(() => {
        onSyncComplete?.()
      })
    }
  })
}
