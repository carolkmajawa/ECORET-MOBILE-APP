import * as SQLite from 'expo-sqlite'
import 'react-native-get-random-values'
import { v4 as uuidv4 } from 'uuid'

/**
 * Every action the chairman takes while offline (approve a loan,
 * record a repayment, mark attendance, pay a case penalty) gets
 * written here first, then flushed to apps/sync's SyncView.POST
 * when connectivity returns.
 *
 * Each action carries a client-generated `idempotency_key` (a UUID
 * created the moment the action happens, not when it's sent) so that
 * if a flush is retried after a partial failure, your backend can
 * recognize "I've already applied this one" instead of double-
 * approving a loan or double-recording a payment. Your current
 * apps/sync/views.py process_*_sync handlers don't check for this key
 * yet -- that's backend work still needed before this is safe to rely
 * on for money-moving actions, not just a frontend concern.
 */

export type QueuedActionType =
  | 'attendance'
  | 'attendance_case'
  | 'loan_approve'
  | 'loan_decline'
  | 'loan_repayment'
  | 'saving'

export interface QueuedAction {
  id: string
  type: QueuedActionType
  payload: Record<string, unknown>
  createdAt: string
  synced: boolean
  error?: string
}

let db: SQLite.SQLiteDatabase | null = null

async function getDb() {
  if (!db) {
    db = await SQLite.openDatabaseAsync('ecoret_offline.db')
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS queued_actions (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        payload TEXT NOT NULL,
        created_at TEXT NOT NULL,
        synced INTEGER NOT NULL DEFAULT 0,
        error TEXT
      );
    `)
  }
  return db
}

export async function enqueueAction(type: QueuedActionType, payload: Record<string, unknown>) {
  const database = await getDb()
  const action: QueuedAction = {
    id: uuidv4(),
    type,
    payload: { ...payload, idempotency_key: uuidv4() },
    createdAt: new Date().toISOString(),
    synced: false,
  }
  await database.runAsync(
    'INSERT INTO queued_actions (id, type, payload, created_at, synced) VALUES (?, ?, ?, ?, 0)',
    [action.id, action.type, JSON.stringify(action.payload), action.createdAt]
  )
  return action
}

export async function getPendingActions(): Promise<QueuedAction[]> {
  const database = await getDb()
  const rows = await database.getAllAsync<{
    id: string
    type: QueuedActionType
    payload: string
    created_at: string
    synced: number
    error: string | null
  }>('SELECT * FROM queued_actions WHERE synced = 0 ORDER BY created_at ASC')

  return rows.map((row) => ({
    id: row.id,
    type: row.type,
    payload: JSON.parse(row.payload),
    createdAt: row.created_at,
    synced: false,
    error: row.error ?? undefined,
  }))
}

export async function markSynced(id: string) {
  const database = await getDb()
  await database.runAsync('UPDATE queued_actions SET synced = 1 WHERE id = ?', [id])
}

export async function markFailed(id: string, error: string) {
  const database = await getDb()
  await database.runAsync('UPDATE queued_actions SET error = ? WHERE id = ?', [error, id])
}
