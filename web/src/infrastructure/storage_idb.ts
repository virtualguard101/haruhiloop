// IndexedDB 持久化层，等价 src/haruhiloop_cli/storage.py 的接口形状。
// store `runs`：keyPath = run_id，value = GameState.snapshot() JSON
// store `history`：keyPath = [run_id, step_number]，value = StepRecord JSON
// store `meta`：单 record，记录 schema_version

import {
  CURRENT_SCHEMA_VERSION,
  GameState,
  StepRecord,
  fromSnapshot,
  isFinished,
  snapshot,
} from "../domain/models";

const DB_NAME = "haruhiloop";
const DB_VERSION = 1;
const STORE_RUNS = "runs";
const STORE_HISTORY = "history";
const STORE_META = "meta";

export interface SaveSlotSummary {
  run_id: string;
  modified_at: Date;
  day: number;
  loop_count: number;
  is_finished: boolean;
  ending_title: string | null;
}

interface RunsRecord {
  run_id: string;
  modified_at: number;
  state: Record<string, unknown>;
}

interface HistoryRecord {
  run_id: string;
  step_number: number;
  record: Record<string, unknown>;
}

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  if (typeof indexedDB === "undefined") {
    return Promise.reject(new Error("浏览器不支持 IndexedDB"));
  }
  dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_RUNS)) {
        db.createObjectStore(STORE_RUNS, { keyPath: "run_id" });
      }
      if (!db.objectStoreNames.contains(STORE_HISTORY)) {
        db.createObjectStore(STORE_HISTORY, { keyPath: ["run_id", "step_number"] });
      }
      if (!db.objectStoreNames.contains(STORE_META)) {
        db.createObjectStore(STORE_META, { keyPath: "key" });
      }
    };
    req.onsuccess = async () => {
      const db = req.result;
      try {
        await new Promise<void>((res, rej) => {
          const tx = db.transaction(STORE_META, "readwrite");
          tx.objectStore(STORE_META).put({ key: "schema_version", value: CURRENT_SCHEMA_VERSION });
          tx.oncomplete = () => res();
          tx.onerror = () => rej(tx.error);
        });
      } catch {
        // ignore
      }
      resolve(db);
    };
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

export async function saveState(state: GameState): Promise<void> {
  const db = await openDb();
  const payload: RunsRecord = {
    run_id: state.run_id,
    modified_at: Date.now(),
    state: snapshot(state),
  };
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_RUNS, "readwrite");
    tx.objectStore(STORE_RUNS).put(payload);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function loadState(runId: string): Promise<GameState> {
  const db = await openDb();
  const record = await new Promise<RunsRecord | undefined>((resolve, reject) => {
    const tx = db.transaction(STORE_RUNS, "readonly");
    const req = tx.objectStore(STORE_RUNS).get(runId);
    req.onsuccess = () => resolve(req.result as RunsRecord | undefined);
    req.onerror = () => reject(req.error);
  });
  if (!record) {
    throw new Error(`未找到运行记录：${runId}`);
  }
  return fromSnapshot(record.state);
}

export async function appendHistory(runId: string, record: StepRecord): Promise<void> {
  const db = await openDb();
  const payload: HistoryRecord = {
    run_id: runId,
    step_number: record.step_number,
    record: { ...record, events: [...record.events] } as Record<string, unknown>,
  };
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_HISTORY, "readwrite");
    tx.objectStore(STORE_HISTORY).put(payload);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function loadHistory(runId: string): Promise<StepRecord[]> {
  const db = await openDb();
  const records = await new Promise<HistoryRecord[]>((resolve, reject) => {
    const tx = db.transaction(STORE_HISTORY, "readonly");
    const store = tx.objectStore(STORE_HISTORY);
    const range = IDBKeyRange.bound([runId, -Infinity], [runId, Infinity]);
    const req = store.getAll(range);
    req.onsuccess = () => resolve((req.result as HistoryRecord[]) ?? []);
    req.onerror = () => reject(req.error);
  });
  return records
    .sort((a, b) => a.step_number - b.step_number)
    .map((r) => r.record as unknown as StepRecord);
}

export async function listSaveSlots(): Promise<SaveSlotSummary[]> {
  const db = await openDb();
  const records = await new Promise<RunsRecord[]>((resolve, reject) => {
    const tx = db.transaction(STORE_RUNS, "readonly");
    const req = tx.objectStore(STORE_RUNS).getAll();
    req.onsuccess = () => resolve((req.result as RunsRecord[]) ?? []);
    req.onerror = () => reject(req.error);
  });
  const slots: SaveSlotSummary[] = [];
  for (const rec of records) {
    try {
      const state = fromSnapshot(rec.state);
      slots.push({
        run_id: state.run_id,
        modified_at: new Date(rec.modified_at),
        day: state.day,
        loop_count: state.loop_count,
        is_finished: isFinished(state),
        ending_title: state.ending_title,
      });
    } catch {
      // 跳过损坏存档
    }
  }
  slots.sort((a, b) => b.modified_at.getTime() - a.modified_at.getTime());
  return slots;
}

export async function deleteRun(runId: string): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORE_RUNS, STORE_HISTORY], "readwrite");
    tx.objectStore(STORE_RUNS).delete(runId);
    const histStore = tx.objectStore(STORE_HISTORY);
    const range = IDBKeyRange.bound([runId, -Infinity], [runId, Infinity]);
    const req = histStore.openCursor(range);
    req.onsuccess = () => {
      const cursor = req.result;
      if (cursor) {
        cursor.delete();
        cursor.continue();
      }
    };
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function exportAll(): Promise<string> {
  const db = await openDb();
  const [runs, hist] = await Promise.all([
    new Promise<RunsRecord[]>((resolve, reject) => {
      const tx = db.transaction(STORE_RUNS, "readonly");
      const req = tx.objectStore(STORE_RUNS).getAll();
      req.onsuccess = () => resolve((req.result as RunsRecord[]) ?? []);
      req.onerror = () => reject(req.error);
    }),
    new Promise<HistoryRecord[]>((resolve, reject) => {
      const tx = db.transaction(STORE_HISTORY, "readonly");
      const req = tx.objectStore(STORE_HISTORY).getAll();
      req.onsuccess = () => resolve((req.result as HistoryRecord[]) ?? []);
      req.onerror = () => reject(req.error);
    }),
  ]);
  return JSON.stringify({ schema_version: CURRENT_SCHEMA_VERSION, runs, history: hist }, null, 2);
}
