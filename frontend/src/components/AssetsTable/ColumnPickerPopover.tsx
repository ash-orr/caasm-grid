import { useEffect, useMemo, type CSSProperties } from 'react';
import styles from './AssetsTable.module.css';

export interface ColumnPickerItem {
  id: string;
  label: string;
  fixed?: boolean;
}

interface Props {
  anchorEl: HTMLElement | null;
  columns: ColumnPickerItem[];
  order: string[];
  hidden: string[];
  onToggle: (columnId: string, visible: boolean) => void;
  onMove: (columnId: string, direction: -1 | 1) => void;
  onReset: () => void;
  onClose: () => void;
}

export function ColumnPickerPopover({
  anchorEl,
  columns,
  order,
  hidden,
  onToggle,
  onMove,
  onReset,
  onClose,
}: Props) {
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose();
      }
    }

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  const orderedColumns = useMemo(() => {
    const byId = new Map(columns.map((column) => [column.id, column]));
    const inOrder = order.map((id) => byId.get(id)).filter((item): item is ColumnPickerItem => Boolean(item));
    const rest = columns.filter((column) => !order.includes(column.id));
    return [...inOrder, ...rest];
  }, [columns, order]);

  if (!anchorEl) return null;

  const rect = anchorEl.getBoundingClientRect();
  const style: CSSProperties = {
    position: 'fixed',
    top: rect.bottom + 6,
    left: Math.max(8, rect.right - 320),
    zIndex: 50,
  };

  return (
    <div
      className={styles.overlayLite}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
      role="presentation"
    >
      <div className={styles.columnPicker} style={style}>
        <div className={styles.columnPickerHeader}>
          <strong>Columns</strong>
          <button className={styles.linkBtn} onClick={onReset} type="button">Reset to default</button>
        </div>

        <div className={styles.columnList}>
          {orderedColumns.map((column, index) => {
            const isVisible = !hidden.includes(column.id);
            const isFixed = Boolean(column.fixed);

            return (
              <div className={`${styles.columnRow} ${isFixed ? styles.columnRowFixed : ''}`} key={column.id}>
                <label className={styles.optionRow}>
                  <input
                    checked={isVisible}
                    disabled={isFixed}
                    onChange={(event) => onToggle(column.id, event.target.checked)}
                    type="checkbox"
                  />
                  {column.label}
                </label>
                <div className={styles.columnMoveGroup}>
                  <button
                    className={styles.iconBtn}
                    disabled={isFixed || index <= 0}
                    onClick={() => onMove(column.id, -1)}
                    type="button"
                  >
                    ↑
                  </button>
                  <button
                    className={styles.iconBtn}
                    disabled={isFixed || index >= orderedColumns.length - 1}
                    onClick={() => onMove(column.id, 1)}
                    type="button"
                  >
                    ↓
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
