// src/services/connectionMonitor.ts
// Offline Queue Manager - queues requests when offline and retries when back online

const DB_NAME = 'connection-monitor-db';
const STORE_NAME = 'queued-requests';
const DB_VERSION = 1;

export interface QueuedRequest {
  id: string;
  url: string;
  method: string;
  data?: unknown;
  headers?: Record<string, string>;
  timestamp: number;
  retryCount: number;
  maxRetries: number;
}

type ConnectionChangeCallback = (isOnline: boolean) => void;

// Module state
let db: IDBDatabase | null = null;
let connectionChangeCallbacks: ConnectionChangeCallback[] = [];
let isInitialized = false;

// ============================================================
// IndexedDB helpers
// ============================================================

const openDatabase = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const database = (event.target as IDBOpenDBRequest).result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };

    request.onsuccess = (event) => {
      resolve((event.target as IDBOpenDBRequest).result);
    };

    request.onerror = (event) => {
      reject((event.target as IDBOpenDBRequest).error);
    };
  });
};

const getDb = async (): Promise<IDBDatabase | null> => {
  if (!db) {
    try {
      db = await openDatabase();
    } catch (error) {
      console.warn('⚠️ IndexedDB not available:', error);
      return null;
    }
  }
  return db;
};

// ============================================================
// Queue operations
// ============================================================

/**
 * Add a request to the offline queue (persisted in IndexedDB)
 */
export const queueRequest = async (
  url: string,
  method: string,
  data?: unknown,
  headers?: Record<string, string>,
  maxRetries = 3
): Promise<void> => {
  const database = await getDb();
  if (!database) return;

  const request: QueuedRequest = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    url,
    method: method.toUpperCase(),
    data,
    headers,
    timestamp: Date.now(),
    retryCount: 0,
    maxRetries,
  };

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const req = store.add(request);

    req.onsuccess = () => {
      console.log(`📦 Request queued: ${method.toUpperCase()} ${url}`);
      notifyUser('info', `Żądanie zostało kolejkowane: ${method.toUpperCase()} ${url}`);
      resolve();
    };
    req.onerror = () => reject(req.error);
  });
};

/**
 * Remove a request from the queue
 */
export const removeFromQueue = async (id: string): Promise<void> => {
  const database = await getDb();
  if (!database) return;

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const req = store.delete(id);

    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
};

/**
 * Load all queued requests from IndexedDB
 */
export const loadQueuedRequests = async (): Promise<QueuedRequest[]> => {
  const database = await getDb();
  if (!database) return [];

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const req = store.getAll();

    req.onsuccess = () => resolve(req.result as QueuedRequest[]);
    req.onerror = () => reject(req.error);
  });
};

/**
 * Retry all queued requests (called when connection is restored)
 */
export const retryQueuedRequests = async (): Promise<void> => {
  const queued = await loadQueuedRequests();
  if (queued.length === 0) return;

  console.log(`🔄 Retrying ${queued.length} queued request(s)...`);
  notifyUser('info', `Ponawiam ${queued.length} kolejkowanych żądań...`);

  for (const request of queued) {
    try {
      // Read CSRF token from the double-submit cookie (non-httpOnly)
      const csrfMatch = document.cookie.match(/csrf-token=([^;]+)/);
      const csrfToken = csrfMatch ? csrfMatch[1] : null;

      const response = await fetch(request.url, {
        method: request.method.toUpperCase(),
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {}),
          ...(request.headers || {}),
        },
        body: request.data ? JSON.stringify(request.data) : undefined,
      });

      if (response.ok) {
        await removeFromQueue(request.id);
        console.log(`✅ Queued request succeeded: ${request.method.toUpperCase()} ${request.url}`);
      } else if (request.retryCount >= request.maxRetries) {
        await removeFromQueue(request.id);
        console.warn(`❌ Max retries exceeded for queued request: ${request.url}`);
        notifyUser('error', `Nie udało się ponowić żądania: ${request.method.toUpperCase()} ${request.url}`);
      } else {
        // Update retry count in db
        await updateRetryCount(request.id, request.retryCount + 1);
      }
    } catch (error) {
      console.warn(`⚠️ Retry failed for queued request: ${request.url}`, error);
      if (request.retryCount >= request.maxRetries) {
        await removeFromQueue(request.id);
        notifyUser('error', `Nie udało się ponowić żądania: ${request.method.toUpperCase()} ${request.url}`);
      } else {
        await updateRetryCount(request.id, request.retryCount + 1);
      }
    }
  }

  const remaining = await loadQueuedRequests();
  if (remaining.length === 0) {
    notifyUser('success', '✅ Wszystkie kolejkowane żądania zostały wysłane pomyślnie.');
  }
};

/**
 * Update retry count for a queued request
 */
const updateRetryCount = async (id: string, retryCount: number): Promise<void> => {
  const database = await getDb();
  if (!database) return;

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const getReq = store.get(id);

    getReq.onsuccess = () => {
      const record = getReq.result as QueuedRequest | undefined;
      if (record) {
        record.retryCount = retryCount;
        const putReq = store.put(record);
        putReq.onsuccess = () => resolve();
        putReq.onerror = () => reject(putReq.error);
      } else {
        resolve();
      }
    };
    getReq.onerror = () => reject(getReq.error);
  });
};

// ============================================================
// Connection state
// ============================================================

/**
 * Check if the connection is currently online
 */
export const isConnectionOnline = (): boolean => navigator.onLine;

/**
 * Subscribe to connection state changes
 * @returns unsubscribe function
 */
export const onConnectionChange = (callback: ConnectionChangeCallback): (() => void) => {
  connectionChangeCallbacks.push(callback);
  return () => {
    connectionChangeCallbacks = connectionChangeCallbacks.filter(cb => cb !== callback);
  };
};

// ============================================================
// Notifications
// ============================================================

const notifyUser = (type: 'success' | 'error' | 'info', message: string) => {
  window.dispatchEvent(
    new CustomEvent('connectionMonitorNotification', {
      detail: { type, message },
    })
  );
};

// ============================================================
// Event handlers
// ============================================================

const handleOnline = () => {
  console.log('🌐 Connection restored - retrying queued requests...');
  notifyUser('success', '🌐 Połączenie przywrócone. Ponawiam kolejkowane żądania...');
  connectionChangeCallbacks.forEach(cb => cb(true));
  retryQueuedRequests();
};

const handleOffline = () => {
  console.warn('📵 Connection lost - requests will be queued');
  notifyUser('error', '📵 Brak połączenia. Żądania będą kolejkowane automatycznie.');
  connectionChangeCallbacks.forEach(cb => cb(false));
};

// ============================================================
// Initialization
// ============================================================

/**
 * Initialize the connection monitor
 * Should be called once at application startup
 */
export const initConnectionMonitor = (): void => {
  if (isInitialized) return;
  isInitialized = true;

  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);

  // Pre-open database to avoid cold-start latency
  getDb().catch(() => {
    console.warn('⚠️ Could not initialize offline queue database');
  });

  console.log('📡 Connection monitor initialized');
};
