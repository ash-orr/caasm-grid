export type SavedViewEntity = 'devices' | 'accounts';

export type SavedViewBase = 'default' | 'caasm';

export interface SavedViewSort {
  columnId: string;
  direction: 'asc' | 'desc';
}

export interface SavedViewColumns {
  hidden: string[];
  order: string[];
}

export interface SavedViewSnapshot {
  filters: unknown;
  addedSections: string[];
  hiddenSections: string[];
  columns: SavedViewColumns;
  sort: SavedViewSort;
}

export interface SavedView extends SavedViewSnapshot {
  id: string;
  name: string;
  entity: SavedViewEntity;
  baseView: SavedViewBase;
}

export interface SavedViewStore {
  list(entity: SavedViewEntity): SavedView[];
  create(input: Omit<SavedView, 'id'>): SavedView;
  update(id: string, input: Omit<SavedView, 'id'>): SavedView | null;
  delete(id: string): SavedView | null;
}

interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

class InMemoryStorage implements StorageLike {
  private data = new Map<string, string>();

  getItem(key: string): string | null {
    return this.data.has(key) ? this.data.get(key) ?? null : null;
  }

  setItem(key: string, value: string): void {
    this.data.set(key, value);
  }
}

type PersistedSavedViews = Record<SavedViewEntity, SavedView[]>;

const SAVED_VIEWS_KEY = 'caasm.saved-views.v1';

function createEmptyPersisted(): PersistedSavedViews {
  return {
    devices: [],
    accounts: [],
  };
}

function cloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function stableNormalize(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => stableNormalize(item));
  }

  if (value && typeof value === 'object') {
    const input = value as Record<string, unknown>;
    const normalized: Record<string, unknown> = {};
    Object.keys(input)
      .sort((a, b) => a.localeCompare(b))
      .forEach((key) => {
        normalized[key] = stableNormalize(input[key]);
      });
    return normalized;
  }

  return value;
}

export function stableStringify(value: unknown): string {
  return JSON.stringify(stableNormalize(value));
}

export function isSavedViewUnchanged(savedView: SavedView, current: SavedViewSnapshot): boolean {
  const left: SavedViewSnapshot = {
    filters: savedView.filters,
    addedSections: savedView.addedSections,
    hiddenSections: savedView.hiddenSections ?? [],
    columns: savedView.columns,
    sort: savedView.sort,
  };

  const right: SavedViewSnapshot = {
    filters: current.filters,
    addedSections: current.addedSections,
    hiddenSections: current.hiddenSections ?? [],
    columns: current.columns,
    sort: current.sort,
  };

  return stableStringify(left) === stableStringify(right);

  return stableStringify(left) === stableStringify(current);
}

export class LocalStorageSavedViewStore implements SavedViewStore {
  private storage: StorageLike;

  constructor(storage?: StorageLike) {
    if (storage) {
      this.storage = storage;
      return;
    }

    const globalStorage = (globalThis as { localStorage?: StorageLike }).localStorage;
    this.storage = globalStorage ?? new InMemoryStorage();
  }

  list(entity: SavedViewEntity): SavedView[] {
    return this.read()[entity];
  }

  create(input: Omit<SavedView, 'id'>): SavedView {
    const persisted = this.read();

    const created: SavedView = {
      ...cloneJson(input),
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    };

    persisted[input.entity] = [...persisted[input.entity], created];
    this.write(persisted);

    return created;
  }

  update(id: string, input: Omit<SavedView, 'id'>): SavedView | null {
    const persisted = this.read();
    const list = persisted[input.entity];
    const index = list.findIndex((savedView) => savedView.id === id);

    if (index < 0) return null;

    const updated: SavedView = {
      ...cloneJson(input),
      id,
    };

    persisted[input.entity] = [
      ...list.slice(0, index),
      updated,
      ...list.slice(index + 1),
    ];

    this.write(persisted);

    return updated;
  }

  delete(id: string): SavedView | null {
    const persisted = this.read();

    const entity = (['devices', 'accounts'] as SavedViewEntity[]).find((candidate) =>
      persisted[candidate].some((savedView) => savedView.id === id)
    );

    if (!entity) return null;

    const list = persisted[entity];
    const index = list.findIndex((savedView) => savedView.id === id);

    if (index < 0) return null;

    const deleted = list[index];

    persisted[entity] = [
      ...list.slice(0, index),
      ...list.slice(index + 1),
    ];

    this.write(persisted);

    return deleted;
  }

  private read(): PersistedSavedViews {
    const raw = this.storage.getItem(SAVED_VIEWS_KEY);

    if (!raw) {
      return createEmptyPersisted();
    }

    try {
      const parsed = JSON.parse(raw) as PersistedSavedViews;

      return {
        devices: Array.isArray(parsed.devices) ? parsed.devices : [],
        accounts: Array.isArray(parsed.accounts) ? parsed.accounts : [],
      };
    } catch {
      return createEmptyPersisted();
    }
  }

  private write(value: PersistedSavedViews): void {
    // Temporary client-side substitute; backend implementation will be org-wide.
    this.storage.setItem(SAVED_VIEWS_KEY, JSON.stringify(value));
  }
}

export function upsertSavedViewByName(
  store: SavedViewStore,
  input: Omit<SavedView, 'id'>
): SavedView {
  const existing = store
    .list(input.entity)
    .find((savedView) => savedView.name.toLowerCase() === input.name.toLowerCase());

  if (!existing) {
    return store.create(input);
  }

  const updated = store.update(existing.id, input);
  if (!updated) {
    throw new Error('Failed to update existing saved view');
  }

  return updated;
}
