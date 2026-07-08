import type {
  RoundtableSessionSnapshot,
  SessionListItem,
} from '../types'

const databaseName = 'multi-agent-roundtable'
const databaseVersion = 1
const storeName = 'sessions'
const fallbackStorageKey = 'multi-agent-roundtable.sessions.v1'
export const maxStoredSessions = 50

export async function listSessions(): Promise<SessionListItem[]> {
  const snapshots = await readAllSnapshots()
  return snapshots.map(toListItem).sort(sortByUpdatedAtDesc)
}

export async function getSession(id: string): Promise<RoundtableSessionSnapshot | null> {
  if (canUseIndexedDb()) {
    try {
      return await getIndexedDbSession(id)
    } catch {
      return getFallbackSessions().find((session) => session.session.id === id) ?? null
    }
  }

  return getFallbackSessions().find((session) => session.session.id === id) ?? null
}

export async function saveSession(snapshot: RoundtableSessionSnapshot): Promise<void> {
  const normalizedSnapshot = normalizeSnapshot(snapshot)

  if (canUseIndexedDb()) {
    try {
      await saveIndexedDbSession(normalizedSnapshot)
      await pruneIndexedDbSessions()
      return
    } catch {
      saveFallbackSession(normalizedSnapshot)
      return
    }
  }

  saveFallbackSession(normalizedSnapshot)
}

export async function deleteSession(id: string): Promise<void> {
  if (canUseIndexedDb()) {
    try {
      await deleteIndexedDbSession(id)
      return
    } catch {
      deleteFallbackSession(id)
      return
    }
  }

  deleteFallbackSession(id)
}

async function readAllSnapshots() {
  if (canUseIndexedDb()) {
    try {
      return await getAllIndexedDbSessions()
    } catch {
      return getFallbackSessions()
    }
  }

  return getFallbackSessions()
}

function canUseIndexedDb() {
  return typeof globalThis.indexedDB !== 'undefined'
}

function openSessionDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = globalThis.indexedDB.open(databaseName, databaseVersion)

    request.onupgradeneeded = () => {
      const database = request.result
      if (!database.objectStoreNames.contains(storeName)) {
        database.createObjectStore(storeName, { keyPath: 'session.id' })
      }
    }

    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result)
  })
}

async function withStore<T>(
  mode: IDBTransactionMode,
  callback: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const database = await openSessionDatabase()

  try {
    const transaction = database.transaction(storeName, mode)
    const request = callback(transaction.objectStore(storeName))
    return await requestToPromise(request)
  } finally {
    database.close()
  }
}

function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result)
  })
}

async function getAllIndexedDbSessions() {
  return withStore('readonly', (store) => store.getAll()) as Promise<RoundtableSessionSnapshot[]>
}

async function getIndexedDbSession(id: string) {
  const session = await withStore('readonly', (store) => store.get(id))
  return (session as RoundtableSessionSnapshot | undefined) ?? null
}

async function saveIndexedDbSession(snapshot: RoundtableSessionSnapshot) {
  await withStore('readwrite', (store) => store.put(snapshot))
}

async function deleteIndexedDbSession(id: string) {
  await withStore('readwrite', (store) => store.delete(id))
}

async function pruneIndexedDbSessions() {
  const sessions = await getAllIndexedDbSessions()
  const expiredSessions = sessions.sort(sortSnapshotsByUpdatedAtDesc).slice(maxStoredSessions)

  await Promise.all(expiredSessions.map((snapshot) => deleteIndexedDbSession(snapshot.session.id)))
}

function getFallbackSessions(): RoundtableSessionSnapshot[] {
  if (typeof globalThis.localStorage === 'undefined') return []

  try {
    const rawValue = globalThis.localStorage.getItem(fallbackStorageKey)
    const parsed = rawValue ? JSON.parse(rawValue) : []
    return Array.isArray(parsed) ? parsed.filter(isSessionSnapshot) : []
  } catch {
    return []
  }
}

function saveFallbackSession(snapshot: RoundtableSessionSnapshot) {
  if (typeof globalThis.localStorage === 'undefined') return

  const sessions = getFallbackSessions()
  const nextSessions = [
    snapshot,
    ...sessions.filter((session) => session.session.id !== snapshot.session.id),
  ]
    .sort(sortSnapshotsByUpdatedAtDesc)
    .slice(0, maxStoredSessions)

  globalThis.localStorage.setItem(fallbackStorageKey, JSON.stringify(nextSessions))
}

function deleteFallbackSession(id: string) {
  if (typeof globalThis.localStorage === 'undefined') return

  const nextSessions = getFallbackSessions().filter((session) => session.session.id !== id)
  globalThis.localStorage.setItem(fallbackStorageKey, JSON.stringify(nextSessions))
}

function normalizeSnapshot(snapshot: RoundtableSessionSnapshot): RoundtableSessionSnapshot {
  return {
    ...snapshot,
    session: {
      ...snapshot.session,
      title: snapshot.session.title.trim() || 'Untitled roundtable',
    },
  }
}

function toListItem(snapshot: RoundtableSessionSnapshot): SessionListItem {
  return {
    ...snapshot.session,
    topicSpace: snapshot.config.topicSpace,
    providerMode: snapshot.config.providerMode,
    messageCount: snapshot.messages.length,
    summaryPreview: snapshot.summary.content.replace(/\s+/g, ' ').trim().slice(0, 120),
  }
}

function sortByUpdatedAtDesc(left: SessionListItem, right: SessionListItem) {
  return right.updatedAt.localeCompare(left.updatedAt)
}

function sortSnapshotsByUpdatedAtDesc(
  left: RoundtableSessionSnapshot,
  right: RoundtableSessionSnapshot,
) {
  return right.session.updatedAt.localeCompare(left.session.updatedAt)
}

function isSessionSnapshot(value: unknown): value is RoundtableSessionSnapshot {
  if (!value || typeof value !== 'object') return false
  const maybeSnapshot = value as Partial<RoundtableSessionSnapshot>
  return Boolean(
    maybeSnapshot.session?.id &&
      maybeSnapshot.config &&
      Array.isArray(maybeSnapshot.agents) &&
      Array.isArray(maybeSnapshot.messages) &&
      maybeSnapshot.summary &&
      maybeSnapshot.costSummary,
  )
}
