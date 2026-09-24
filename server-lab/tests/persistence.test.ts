import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createLab, createOS, type LabState } from '../src/core';

const database = vi.hoisted(() => ({ get: vi.fn(), put: vi.fn() }));
vi.mock('dexie', () => ({
  default: class Dexie {
    snapshots = database;
    version() { return { stores() {} }; }
  },
}));

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
const snapshot = (lab: LabState, savedAt: number) => ({ id: 'active', lab, savedAt });
function labNamed(name: string): LabState {
  const lab = createLab();
  lab.devices['server-1'].name = name;
  lab.devices['server-1'].os.computerName = name;
  return lab;
}

let data: Map<string, string>;
let storage: { getItem: ReturnType<typeof vi.fn>; setItem: ReturnType<typeof vi.fn> };
let page: EventTarget;
let documentMock: EventTarget & { visibilityState: string };

beforeEach(() => {
  vi.resetModules();
  vi.useFakeTimers();
  vi.setSystemTime(1000);
  data = new Map();
  storage = { getItem: vi.fn((key: string) => data.get(key) ?? null), setItem: vi.fn((key: string, value: string) => { data.set(key, value); }) };
  page = new EventTarget();
  documentMock = Object.assign(new EventTarget(), { visibilityState: 'visible' });
  vi.stubGlobal('localStorage', storage);
  vi.stubGlobal('window', page);
  vi.stubGlobal('document', documentMock);
  database.get.mockReset().mockResolvedValue(undefined);
  database.put.mockReset().mockResolvedValue('active');
});
afterEach(() => { vi.clearAllTimers(); vi.useRealTimers(); vi.unstubAllGlobals(); });

describe('local persistence', () => {
  it('batches serialization and IndexedDB writes for many OS updates', async () => {
    const { hydrateLab, useLab } = await import('../src/store');
    await hydrateLab();
    await vi.advanceTimersByTimeAsync(350);
    storage.setItem.mockClear(); database.put.mockClear();
    for (let i = 0; i < 50; i++) useLab.getState().dispatch({ type: 'MOVE_DEVICE', id: 'server-1', x: i, y: 42 });
    expect(storage.setItem).not.toHaveBeenCalled();
    expect(database.put).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(350);
    expect(storage.setItem).toHaveBeenCalledTimes(1);
    expect(database.put).toHaveBeenCalledTimes(1);
    expect(JSON.parse(data.get('serverlab-v2')!).lab.devices['server-1'].x).toBe(49);
    expect(useLab.getState().saveStatus).toBe('Saved locally');
  });

  it('writes the newest snapshot synchronously on pagehide during a debounce', async () => {
    const { hydrateLab, useLab } = await import('../src/store');
    await hydrateLab();
    useLab.getState().dispatch({ type: 'RENAME', id: 'server-1', name: 'NEW-SERVER' });
    expect(storage.setItem).not.toHaveBeenCalled();
    page.dispatchEvent(new Event('pagehide'));
    expect(JSON.parse(data.get('serverlab-v2')!).lab.devices['server-1'].name).toBe('NEW-SERVER');
    await vi.advanceTimersByTimeAsync(350);
    expect(database.put).toHaveBeenCalledTimes(1);
  });

  it('flushes when the page becomes hidden, and recovers that newer save over older IndexedDB', async () => {
    const older = snapshot(labNamed('OLD-SERVER'), 900);
    database.get.mockResolvedValue(older);
    const first = await import('../src/store');
    await first.hydrateLab();
    first.useLab.getState().dispatch({ type: 'RENAME', id: 'server-1', name: 'NEW-SERVER' });
    documentMock.visibilityState = 'hidden';
    documentMock.dispatchEvent(new Event('visibilitychange'));
    expect(JSON.parse(data.get('serverlab-v2')!).lab.devices['server-1'].name).toBe('NEW-SERVER');
    vi.resetModules();
    const reloaded = await import('../src/store');
    await reloaded.hydrateLab();
    expect(reloaded.useLab.getState().lab.devices['server-1'].name).toBe('NEW-SERVER');
  });

  it('does not save the blank starter lab when closing before hydration completes', async () => {
    const pending = deferred<unknown>(); database.get.mockReturnValue(pending.promise);
    data.set('serverlab-v2', JSON.stringify(snapshot(labNamed('SAVED-SERVER'), 900)));
    const { hydrateLab } = await import('../src/store');
    const loading = hydrateLab();
    page.dispatchEvent(new Event('pagehide'));
    expect(storage.setItem).not.toHaveBeenCalled();
    pending.resolve(undefined); await loading;
  });

  it('ignores stale failures and coalesces queued writes without replacing a newer backup', async () => {
    const pending = deferred<unknown>();
    database.put.mockReturnValueOnce(pending.promise).mockResolvedValue('active');
    const { hydrateLab, useLab } = await import('../src/store');
    await hydrateLab(); await vi.advanceTimersByTimeAsync(350);
    useLab.getState().dispatch({ type: 'RENAME', id: 'server-1', name: 'SECOND' });
    await vi.advanceTimersByTimeAsync(350);
    useLab.getState().dispatch({ type: 'RENAME', id: 'server-1', name: 'LATEST' });
    await vi.advanceTimersByTimeAsync(350);
    const backupBefore = data.get('serverlab-v2');
    pending.reject(new Error('Old write failed'));
    await vi.advanceTimersByTimeAsync(0);
    expect(data.get('serverlab-v2')).toBe(backupBefore);
    expect(database.put).toHaveBeenCalledTimes(2);
    expect(database.put.mock.calls[1][0].lab.devices['server-1'].name).toBe('LATEST');
    expect(useLab.getState().saveStatus).toBe('Saved locally');
  });

  it('does not let an old successful write mark a newer pending state as saved', async () => {
    const pending = deferred<unknown>(); database.put.mockReturnValueOnce(pending.promise);
    const { hydrateLab, useLab } = await import('../src/store');
    await hydrateLab(); await vi.advanceTimersByTimeAsync(350);
    useLab.getState().dispatch({ type: 'RENAME', id: 'server-1', name: 'LATEST' });
    pending.resolve('active'); await vi.advanceTimersByTimeAsync(0);
    expect(useLab.getState().saveStatus).toBe('Saving…');
    await vi.advanceTimersByTimeAsync(350);
    expect(useLab.getState().saveStatus).toBe('Saved locally');
  });

  it('keeps changes made during a slow hydration read and uses increasing save timestamps', async () => {
    const pending = deferred<unknown>(); database.get.mockReturnValue(pending.promise);
    const { hydrateLab, useLab } = await import('../src/store');
    const loading = hydrateLab();
    useLab.getState().dispatch({ type: 'RENAME', id: 'server-1', name: 'USER-CHANGE' });
    pending.resolve(snapshot(labNamed('OLDER'), 9000)); await loading;
    expect(useLab.getState().lab.devices['server-1'].name).toBe('USER-CHANGE');
    expect(useLab.getState().ready).toBe(true);
    page.dispatchEvent(new Event('pagehide'));
    const firstTime = JSON.parse(data.get('serverlab-v2')!).savedAt;
    expect(firstTime).toBeGreaterThan(9000);
    vi.setSystemTime(100);
    useLab.getState().dispatch({ type: 'RENAME', id: 'server-1', name: 'SECOND-CHANGE' });
    page.dispatchEvent(new Event('pagehide'));
    expect(JSON.parse(data.get('serverlab-v2')!).savedAt).toBeGreaterThan(firstTime);
  });

  it('uses the valid older save when the newest backup has an invalid schema', async () => {
    database.get.mockResolvedValue(snapshot(labNamed('VALID-SERVER'), 900));
    data.set('serverlab-v2', JSON.stringify({ lab: { schemaVersion: 3 }, savedAt: 999999 }));
    const { hydrateLab, useLab } = await import('../src/store');
    await hydrateLab();
    expect(useLab.getState().lab.devices['server-1'].name).toBe('VALID-SERVER');
  });

  it('migrates the legacy save even when the v2 backup is malformed JSON', async () => {
    data.set('serverlab-v2', '{invalid json');
    data.set('serverlab-save', JSON.stringify({ ...createOS('LEGACY-SERVER'), installed: true, adminSet: true }));
    const original = data.get('serverlab-save');
    const { hydrateLab, useLab } = await import('../src/store');
    await hydrateLab();
    expect(useLab.getState().lab.devices['server-1'].name).toBe('LEGACY-SERVER');
    expect(useLab.getState().lab.devices['server-1'].os.installed).toBe(true);
    expect(data.get('serverlab-save')).toBe(original);
  });

  it('reports total save failure but retains a working fallback if either storage succeeds', async () => {
    database.put.mockRejectedValue(new Error('IndexedDB unavailable'));
    const { hydrateLab, useLab } = await import('../src/store');
    await hydrateLab(); await vi.advanceTimersByTimeAsync(350);
    expect(useLab.getState().saveStatus).toBe('Saved locally');
    storage.setItem.mockImplementation(() => { throw new Error('Quota exceeded'); });
    useLab.getState().dispatch({ type: 'RENAME', id: 'server-1', name: 'UNSAVED' });
    await vi.advanceTimersByTimeAsync(350);
    expect(useLab.getState().saveStatus).toBe('Save unavailable · export your lab');
    expect(useLab.getState().lab.devices['server-1'].name).toBe('UNSAVED');
    database.put.mockResolvedValue('active');
    useLab.getState().dispatch({ type: 'RENAME', id: 'server-1', name: 'IDB-ONLY' });
    await vi.advanceTimersByTimeAsync(350);
    expect(useLab.getState().saveStatus).toBe('Saved locally');
  });
});
