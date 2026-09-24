import { create } from 'zustand';
import Dexie, { type Table } from 'dexie';
import { createLab, reduceLab, restoreLab, type LabCommand, type LabState } from './core';

type Snapshot = { id: string; lab: LabState; savedAt: number };
const db = new Dexie('serverlab-v2') as Dexie & { snapshots: Table<Snapshot> };
db.version(1).stores({ snapshots: 'id' });
let timer: ReturnType<typeof setTimeout> | undefined;
let latest: Snapshot | undefined;
let queued: Snapshot | undefined;
let writing = false;
let backupTime = -1;
let clock = 0;
let mutations = 0;
interface Store {
  lab: LabState; ready: boolean; saveStatus: string;
  dispatch: (command: LabCommand) => void;
  replace: (lab: LabState) => void;
}

function backup(snapshot: Snapshot): boolean {
  // A delayed IndexedDB failure must never replace a newer synchronous backup.
  if (snapshot !== latest) return false;
  if (backupTime === snapshot.savedAt) return true;
  try {
    localStorage.setItem('serverlab-v2', JSON.stringify(snapshot));
    backupTime = snapshot.savedAt;
    return true;
  } catch { return false; }
}

async function drainWrites() {
  writing = true;
  try {
    while (queued) {
      const snapshot = queued;
      queued = undefined;
      try {
        await db.snapshots.put(snapshot);
        if (snapshot === latest) useLab.setState({ saveStatus: 'Saved locally' });
      } catch {
        if (snapshot === latest) useLab.setState({ saveStatus: backup(snapshot) ? 'Saved locally' : 'Save unavailable · export your lab' });
      }
    }
  } finally { writing = false; }
}

function flushPending() {
  clearTimeout(timer);
  timer = undefined;
  // Before hydration, closing the page must not save the blank initial lab over an existing save.
  if (!latest) return;
  backup(latest);
  queued = latest;
  if (!writing) void drainWrites();
}

const persist = (lab: LabState) => {
  clock = Math.max(Date.now(), clock + 1);
  latest = { id: 'active', lab, savedAt: clock };
  clearTimeout(timer);
  useLab.setState({ saveStatus: 'Saving…' });
  // Dragging and OS messages update memory cheaply; serialization happens once per batch.
  timer = setTimeout(flushPending, 350);
};
export const useLab = create<Store>((set, get) => ({
  lab: createLab(), ready: false, saveStatus: 'Loading lab…',
  dispatch: command => { const lab = reduceLab(get().lab, command); mutations++; set({ lab }); persist(lab); },
  replace: lab => { mutations++; set({ lab }); persist(lab); },
}));

const object = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === 'object' && !Array.isArray(value);
function candidate(value: unknown): Snapshot | undefined {
  if (!object(value)) return;
  const lab = object(value.lab) ? value.lab : value;
  if (lab.schemaVersion !== 2 || !object(lab.devices) || !object(lab.links)) return;
  const savedAt = typeof value.savedAt === 'number' && Number.isFinite(value.savedAt) && value.savedAt >= 0 ? value.savedAt : 0;
  return { id: 'active', lab: lab as unknown as LabState, savedAt };
}

function readLocal(key: string): unknown {
  try { return JSON.parse(localStorage.getItem(key) || 'null'); }
  catch { return undefined; }
}

let hydration: Promise<void> | undefined;
export function hydrateLab() {
  return hydration ??= (async () => {
    const beganAtMutation = mutations;
    let stored: Snapshot | undefined;
    try { stored = candidate(await db.snapshots.get('active')); }
    catch { /* Local backup supports unavailable IndexedDB, including private browsing. */ }
    const local = candidate(readLocal('serverlab-v2'));
    const selected = local && (!stored || local.savedAt >= stored.savedAt) ? local : stored;
    clock = Math.max(clock, stored?.savedAt || 0, local?.savedAt || 0);
    // Interactions or imports made during a slow read take precedence over loaded data.
    if (mutations !== beganAtMutation) {
      useLab.setState({ ready: true });
      // Rebase against the loaded clock too: it may be ahead after a system clock change.
      persist(useLab.getState().lab);
      return;
    }
    const lab = restoreLab(selected?.lab, readLocal('serverlab-save'));
    useLab.setState({ lab, ready: true, saveStatus: 'Saved locally' });
    persist(lab);
  })();
}

// These handlers serialize the newest snapshot synchronously, including during a pending debounce.
if (typeof window !== 'undefined') window.addEventListener('pagehide', flushPending);
if (typeof document !== 'undefined') document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') flushPending();
});
