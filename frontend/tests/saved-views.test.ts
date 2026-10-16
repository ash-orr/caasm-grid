import { describe, expect, it } from 'vitest';
import {
  LocalStorageSavedViewStore,
  isSavedViewUnchanged,
  upsertSavedViewByName,
  type SavedViewSnapshot,
} from '../src/views/savedViews.js';

class MemoryStorage {
  private data = new Map<string, string>();

  getItem(key: string): string | null {
    return this.data.has(key) ? this.data.get(key) ?? null : null;
  }

  setItem(key: string, value: string): void {
    this.data.set(key, value);
  }
}

function makeSnapshot(overrides?: Partial<SavedViewSnapshot>): SavedViewSnapshot {
  return {
    filters: {
      status: ['Blocked'],
      sourceCoverage: [{ source: 'CrowdStrike', status: 'Present' }],
    },
    addedSections: ['authRepo', 'nasSite'],
    columns: {
      hidden: ['nasIp'],
      order: ['name', 'status', 'nasIp'],
    },
    sort: {
      columnId: 'status',
      direction: 'asc',
    },
    ...overrides,
  };
}

describe('saved view unchanged detection', () => {
  it('treats same value with different key order as unchanged', () => {
    const storage = new MemoryStorage();
    const store = new LocalStorageSavedViewStore(storage);

    const saved = store.create({
      name: 'Ops view',
      entity: 'devices',
      baseView: 'default',
      ...makeSnapshot(),
    });

    const current = makeSnapshot({
      filters: {
        sourceCoverage: [{ status: 'Present', source: 'CrowdStrike' }],
        status: ['Blocked'],
      },
    });

    expect(isSavedViewUnchanged(saved, current)).toBe(true);
  });

  it('returns to unchanged after undoing a change', () => {
    const storage = new MemoryStorage();
    const store = new LocalStorageSavedViewStore(storage);

    const saved = store.create({
      name: 'Undo view',
      entity: 'devices',
      baseView: 'caasm',
      ...makeSnapshot(),
    });

    const changed = makeSnapshot({
      filters: {
        status: ['Blocked', 'No issues'],
        sourceCoverage: [{ source: 'CrowdStrike', status: 'Present' }],
      },
    });

    expect(isSavedViewUnchanged(saved, changed)).toBe(false);
    expect(isSavedViewUnchanged(saved, makeSnapshot())).toBe(true);
  });
});

describe('saved view store operations', () => {
  it('creates a new saved view and lists by entity', () => {
    const storage = new MemoryStorage();
    const store = new LocalStorageSavedViewStore(storage);

    const created = store.create({
      name: 'Team view',
      entity: 'accounts',
      baseView: 'default',
      ...makeSnapshot(),
    });

    expect(created.id).toBeTruthy();
    expect(store.list('accounts')).toHaveLength(1);
    expect(store.list('devices')).toHaveLength(0);
  });

  it('upserts by name (same name updates)', () => {
    const storage = new MemoryStorage();
    const store = new LocalStorageSavedViewStore(storage);

    const first = upsertSavedViewByName(store, {
      name: 'Shared view',
      entity: 'devices',
      baseView: 'default',
      ...makeSnapshot(),
    });

    const second = upsertSavedViewByName(store, {
      name: 'Shared view',
      entity: 'devices',
      baseView: 'default',
      ...makeSnapshot({
        columns: {
          hidden: ['nasIp', 'agentpVersion'],
          order: ['name', 'agentpVersion', 'status', 'nasIp'],
        },
      }),
    });

    expect(first.id).toBe(second.id);
    expect(store.list('devices')).toHaveLength(1);
    expect(store.list('devices')[0].columns.hidden).toEqual(['nasIp', 'agentpVersion']);
  });

  it('updates active saved view and then removes it, returning base view for reset', () => {
    const storage = new MemoryStorage();
    const store = new LocalStorageSavedViewStore(storage);

    const created = store.create({
      name: 'CAASM custom',
      entity: 'devices',
      baseView: 'caasm',
      ...makeSnapshot(),
    });

    const updated = store.update(created.id, {
      name: 'CAASM custom',
      entity: 'devices',
      baseView: 'caasm',
      ...makeSnapshot({ addedSections: ['authRepo'] }),
    });

    expect(updated?.addedSections).toEqual(['authRepo']);

    const removed = store.delete(created.id);

    expect(removed?.baseView).toBe('caasm');
    expect(store.list('devices')).toHaveLength(0);
  });
});
