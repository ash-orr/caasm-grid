import { useEffect, useMemo, useRef, useState } from 'react';
import { FILTER_SCHEMA, type FilterEntity } from '../../filters/schema';
import styles from './AssetsTable.module.css';

const GROUP_ORDER = ['Default filters', 'General', 'Network (NAC)', 'Risk (NAC)', 'On this device (NAC)'] as const;

type ManageFiltersDialogProps = {
  open: boolean;
  entity: FilterEntity;
  visibleIds: string[];
  allIds: string[];
  triggerRef?: React.RefObject<HTMLButtonElement | null>;
  onApply: (nextIds: string[]) => void;
  onOpenChange: (open: boolean) => void;
};

export function ManageFiltersDialog({
  open,
  entity,
  visibleIds,
  allIds,
  triggerRef,
  onApply,
  onOpenChange,
}: ManageFiltersDialogProps) {
  const searchRef = useRef<HTMLInputElement | null>(null);
  const [draft, setDraft] = useState<string[]>(visibleIds);
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (!open) return;
    const frame = requestAnimationFrame(() => {
      searchRef.current?.focus();
    });

    return () => cancelAnimationFrame(frame);
  }, [open]);

  useEffect(() => {
    if (open) return;
    triggerRef?.current?.focus();
  }, [open, triggerRef]);

  const groupedItems = useMemo(() => {
    const definitions = FILTER_SCHEMA.filter((item) => item.entities.includes(entity) && allIds.includes(item.id));
    const haystack = query.trim().toLowerCase();

    const map = new Map<string, typeof definitions>();

    for (const group of GROUP_ORDER) {
      const items = definitions.filter((item) => {
        if (group === 'Default filters') {
          return item.placement === 'default';
        }
        return item.group === group;
      });

      if (haystack) {
        const filtered = items.filter((item) => item.label.toLowerCase().includes(haystack));
        if (filtered.length > 0) map.set(group, filtered);
      } else if (items.length > 0) {
        map.set(group, items);
      }
    }

    return Array.from(map.entries()).map(([group, items]) => ({ group, items }));
  }, [allIds, entity, query]);

  if (!open) return null;

  const shownCount = draft.length;

  return (
    <div
      className={styles.popoverAnchor}
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onOpenChange(false);
        }
      }}
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          onOpenChange(false);
        }
      }}
      role="presentation"
    >
      <div
        aria-label="Manage filters dialog"
        className={styles.popup}
        role="dialog"
        style={{
          position: 'fixed',
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%)',
          width: 'min(460px, calc(100vw - 24px))',
          maxHeight: '70vh',
        }}
      >
        <h2 className={styles.popupTitle}>Manage filters ({shownCount} shown)</h2>
        <p className={styles.dialogNote}>Choose which filters appear in the panel. Unchecking a filter clears its selection.</p>
        <input
          aria-label="Search filters"
          className={styles.popupSearch}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Escape') {
              event.stopPropagation();
              onOpenChange(false);
            }
          }}
          placeholder="Search filters"
          ref={searchRef}
          value={query}
        />

        <div className={styles.popupGrid} style={{ gridTemplateColumns: '1fr', maxHeight: '42vh' }}>
          {groupedItems.length === 0 ? (
            <p className={styles.muted}>No filters match.</p>
          ) : (
            groupedItems.map(({ group, items }) => (
              <div key={group}>
                <div className={styles.menuGroup}>{group}</div>
                {items.map((item) => {
                  const checked = draft.includes(item.id);
                  return (
                    <label className={styles.optionRow} key={item.id}>
                      <input
                        checked={checked}
                        onChange={() => {
                          setDraft((prev) =>
                            prev.includes(item.id)
                              ? prev.filter((id) => id !== item.id)
                              : [...prev, item.id]
                          );
                        }}
                        type="checkbox"
                      />
                      {item.label}
                    </label>
                  );
                })}
              </div>
            ))
          )}
        </div>

        <div className={styles.popupActions}>
          <button className={styles.btn} onClick={() => onOpenChange(false)} type="button">Cancel</button>
          <button
            className={styles.btn}
            onClick={() => {
              onApply(draft);
              onOpenChange(false);
            }}
            type="button"
          >
            Apply
          </button>
        </div>
      </div>
    </div>
  );
}
