import type { ChatThread } from '#shared/schemas/chat'
import { createRecordId } from '#shared/utils/ids'
import type { StateDb } from './client'

const toThread = (row: Record<string, unknown>): ChatThread => ({
  id: String(row.id),
  title: String(row.title),
  createdAt: String(row.created_at),
  updatedAt: String(row.updated_at),
})

export async function createThread(db: StateDb, title: string, now: Date): Promise<ChatThread> {
  const at = now.toISOString()
  const result = await db.$client.execute({ sql: 'INSERT INTO chat_threads (id, title, created_at, updated_at) VALUES (?, ?, ?, ?) RETURNING *', args: [createRecordId('thr'), title, at, at] })
  return toThread(result.rows[0] as Record<string, unknown>)
}

export async function listThreads(db: StateDb): Promise<ChatThread[]> {
  const result = await db.$client.execute('SELECT * FROM chat_threads ORDER BY updated_at DESC')
  return result.rows.map(row => toThread(row as Record<string, unknown>))
}

export async function getThread(db: StateDb, id: string): Promise<ChatThread | null> {
  const result = await db.$client.execute({ sql: 'SELECT * FROM chat_threads WHERE id = ?', args: [id] })
  return result.rows[0] ? toThread(result.rows[0] as Record<string, unknown>) : null
}

export async function deleteThread(db: StateDb, id: string): Promise<boolean> {
  const result = await db.$client.execute({ sql: 'DELETE FROM chat_threads WHERE id = ?', args: [id] })
  return result.rowsAffected > 0
}

/** Messages of a thread (stored as AI SDK UI messages), oldest first. */
export async function threadMessages(db: StateDb, id: string): Promise<unknown[]> {
  const result = await db.$client.execute({ sql: 'SELECT message FROM chat_messages WHERE thread_id = ? ORDER BY seq', args: [id] })
  return result.rows.map(row => JSON.parse(String(row.message)))
}

/** Replaces a thread's messages (the chat sends the full list) and bumps its title/updated time. */
export async function saveThreadMessages(db: StateDb, id: string, messages: { id: string, role: string }[], update: { title?: string, now: Date }): Promise<void> {
  await db.$client.batch([
    { sql: 'DELETE FROM chat_messages WHERE thread_id = ?', args: [id] },
    ...messages.map((message, seq) => ({ sql: 'INSERT INTO chat_messages (thread_id, seq, id, role, message) VALUES (?, ?, ?, ?, ?)', args: [id, seq, message.id, message.role, JSON.stringify(message)] })),
    update.title
      ? { sql: 'UPDATE chat_threads SET title = ?, updated_at = ? WHERE id = ?', args: [update.title, update.now.toISOString(), id] }
      : { sql: 'UPDATE chat_threads SET updated_at = ? WHERE id = ?', args: [update.now.toISOString(), id] },
  ], 'write')
}
